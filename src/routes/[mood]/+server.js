import { json } from '@sveltejs/kit';
import { kaomojis } from '$lib/kaomojis';
import { getSuggestions, maxMoodLength, normalizeMood, resolveMood } from '$lib/kaomojis/lookup';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const maxAllowedLength = Math.ceil(maxMoodLength * 1.5);

// Sliding window rate limiter state.
const ipRequests = new Map(); // ip -> Array of timestamps (ms)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX = 60; // 60 requests per minute

// Cache state.
const cache = new Map(); // cacheKey -> { data, status, expiresAt }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function baseHeaders(extra = {}, { cacheControl = 'public, max-age=300, s-maxage=300, stale-while-revalidate=60' } = {}) {
	return {
		'Access-Control-Allow-Origin': '*',
		'Cache-Control': cacheControl,
		...extra
	};
}

function parsePositiveInteger(value, fallback, { min = 1, max = Number.POSITIVE_INFINITY } = {}) {
	if (value === undefined || value === null || value === '') {
		return { value: fallback };
	}

	if (!/^\d+$/.test(value)) {
		return { error: 'must be a whole number' };
	}

	const parsed = Number(value);

	if (!Number.isSafeInteger(parsed)) {
		return { error: 'is too large' };
	}

	if (parsed < min) {
		return { error: `must be at least ${min}` };
	}

	if (parsed > max) {
		return { error: `must be at most ${max}` };
	}

	return { value: parsed };
}

function getPaginationMetadata(page, limit, total) {
	const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

	return {
		page,
		limit,
		total,
		totalPages,
		count: Math.min(limit, Math.max(total - (page - 1) * limit, 0)),
		hasNextPage: page < totalPages,
		hasPreviousPage: page > 1,
		nextPage: page < totalPages ? page + 1 : null,
		previousPage: page > 1 ? page - 1 : null
	};
}

function cleanCache() {
	const now = Date.now();
	for (const [key, val] of cache.entries()) {
		if (val.expiresAt < now) {
			cache.delete(key);
		}
	}
}

function isRateLimited(ip) {
	const now = Date.now();
	let timestamps = ipRequests.get(ip) || [];

	// Filter out timestamps outside the window
	timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

	if (timestamps.length >= RATE_LIMIT_MAX) {
		ipRequests.set(ip, timestamps);
		return true;
	}

	timestamps.push(now);
	ipRequests.set(ip, timestamps);
	return false;
}

export function OPTIONS() {
	return new Response(null, {
		headers: baseHeaders({
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		})
	});
}

export function GET({ params, url, getClientAddress }) {
	const { mood: requestedMood } = params;
	const pageInput = url.searchParams.get('page');
	const limitInput = url.searchParams.get('limit');

	const pageResult = parsePositiveInteger(pageInput, 1);
	if (pageResult.error) {
		return json(
			{ message: `Invalid page parameter: ${pageResult.error}.` },
			{
				status: 400,
				headers: baseHeaders({}, { cacheControl: 'no-store' })
			}
		);
	}

	const limitResult = parsePositiveInteger(limitInput, DEFAULT_LIMIT, { max: MAX_LIMIT });
	if (limitResult.error) {
		return json(
			{ message: `Invalid limit parameter: ${limitResult.error}.` },
			{
				status: 400,
				headers: baseHeaders({}, { cacheControl: 'no-store' })
			}
		);
	}

	const page = pageResult.value;
	const limit = limitResult.value;
	const normalizedRequestedMood = normalizeMood(requestedMood);

	// 1. Input length check.
	if (requestedMood && requestedMood.length > maxAllowedLength) {
		return json(
			{
				message: `Request parameter 'mood' too long. Maximum allowed length is ${maxAllowedLength} characters.`
			},
			{
				status: 400,
				headers: baseHeaders({}, { cacheControl: 'no-store' })
			}
		);
	}

	// 2. Cache lookup. Cached responses should be served before rate limiting.
	const resolvedMood = resolveMood(requestedMood);
	const cacheMoodKey = resolvedMood ?? normalizedRequestedMood;
	const cacheKey = `${cacheMoodKey}:${page}:${limit}`;

	if (Math.random() < 0.1) {
		cleanCache();
	}

	const cached = cache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return json(cached.data, {
			status: cached.status,
			headers: baseHeaders()
		});
	}

	// 3. Rate limiting only applies to cache misses.
	let ip;
	try {
		ip = getClientAddress();
	} catch {
		ip = 'unknown';
	}

	if (isRateLimited(ip)) {
		return json(
			{ message: 'Too many requests. Please try again later.' },
			{
				status: 429,
				headers: baseHeaders(
					{
						'Retry-After': '60'
					},
					{ cacheControl: 'no-store' }
				)
			}
		);
	}

	const all = resolvedMood ? kaomojis[resolvedMood] : undefined;

	if (!all) {
		const suggestions = getSuggestions(requestedMood, Object.keys(kaomojis));

		const errorData = {
			message: `Unknown mood: ${requestedMood}`,
			...(suggestions.length > 0 && { suggestions })
		};

		cache.set(cacheKey, {
			data: errorData,
			status: 404,
			expiresAt: Date.now() + CACHE_TTL
		});

		return json(errorData, {
			status: 404,
			headers: baseHeaders()
		});
	}

	const start = (page - 1) * limit;
	const results = all.slice(start, start + limit);
	const pagination = getPaginationMetadata(page, limit, all.length);
	const responseData = {
		mood: resolvedMood,
		results,
		total: all.length,
		page,
		limit,
		pagination
	};

	cache.set(cacheKey, {
		data: responseData,
		status: 200,
		expiresAt: Date.now() + CACHE_TTL
	});

	return json(responseData, {
		headers: baseHeaders()
	});
}
