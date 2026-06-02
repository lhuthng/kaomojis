import { json } from '@sveltejs/kit';
import { kaomojis } from '$lib/kaomojis';
import { getSuggestions, maxMoodLength, resolveMood } from '$lib/kaomojis/lookup';

// Calculate the maximum length of any recognized mood name or synonym.
const maxAllowedLength = Math.ceil(maxMoodLength * 1.5);

// Sliding window rate limiter state
const ipRequests = new Map(); // ip -> Array of timestamps (ms)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX = 60; // 60 requests per minute

// Cache state
const cache = new Map(); // cacheKey -> { data, status, expiresAt }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
}

export function GET({ params, url, getClientAddress }) {
	const { mood: requestedMood } = params;
	const page = Number(url.searchParams.get('page') ?? 1);
	const limit = Number(url.searchParams.get('limit') ?? 20);

	// 1. Rate Limiting Check
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
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Retry-After': '60'
				}
			}
		);
	}

	// 2. Input Length Check
	if (requestedMood && requestedMood.length > maxAllowedLength) {
		return json(
			{
				message: `Request parameter 'mood' too long. Maximum allowed length is ${maxAllowedLength} characters.`
			},
			{
				status: 400,
				headers: { 'Access-Control-Allow-Origin': '*' }
			}
		);
	}

	// 3. Cache Lookup
	const resolvedMood = resolveMood(requestedMood);
	const cacheMoodKey = resolvedMood ?? requestedMood;
	const cacheKey = `${cacheMoodKey}:${page}:${limit}`;
	if (Math.random() < 0.1) {
		cleanCache();
	}

	const cached = cache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return json(cached.data, {
			status: cached.status,
			headers: { 'Access-Control-Allow-Origin': '*' }
		});
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
			headers: { 'Access-Control-Allow-Origin': '*' }
		});
	}

	const start = (page - 1) * limit;
	const results = all.slice(start, start + limit);
	const responseData = { mood: resolvedMood, results, total: all.length, page, limit };

	cache.set(cacheKey, {
		data: responseData,
		status: 200,
		expiresAt: Date.now() + CACHE_TTL
	});

	return json(responseData, {
		headers: { 'Access-Control-Allow-Origin': '*' }
	});
}
