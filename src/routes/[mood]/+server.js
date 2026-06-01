import { json } from '@sveltejs/kit';
import { kaomojis } from '$lib/kaomojis';

// Calculate the maximum length of a valid mood key dynamically.
// E.g., 'dissatisfaction' is 15. 15 * 1.5 = 22.5, rounding up to 23.
const longestKeyLength = Math.max(...Object.keys(kaomojis).map((k) => k.length), 0);
const maxAllowedLength = Math.ceil(longestKeyLength * 1.5);

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

function levenshtein(a, b) {
	const dp = Array.from({ length: a.length + 1 }, (_, i) =>
		Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
	);

	for (let i = 1; i <= a.length; i++)
		for (let j = 1; j <= b.length; j++)
			dp[i][j] =
				a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);

	return dp[a.length][b.length];
}

function getSuggestions(mood, allMoods, limit = 5) {
	const input = mood.toLowerCase();

	return allMoods
		.map((m) => {
			const candidate = m.toLowerCase();
			const distance = levenshtein(input, candidate);
			const score = 1 - distance / Math.max(input.length, candidate.length);
			const prefixMatch = candidate.startsWith(input);

			return { mood: m, score, prefixMatch };
		})
		.filter((s) => s.prefixMatch || s.score >= 0.4)
		.sort((a, b) => {
			// Prefix matches always rank first
			if (a.prefixMatch !== b.prefixMatch) return a.prefixMatch ? -1 : 1;
			return b.score - a.score;
		})
		.slice(0, limit)
		.map((s) => s.mood);
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
	const { mood } = params;
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
	if (mood && mood.length > maxAllowedLength) {
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
	const cacheKey = `${mood}:${page}:${limit}`;
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

	const all = kaomojis[mood];

	if (!all) {
		const suggestions = getSuggestions(mood, Object.keys(kaomojis));

		const errorData = {
			message: `Unknown mood: ${mood}`,
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
	const responseData = { mood, results, total: all.length, page, limit };

	cache.set(cacheKey, {
		data: responseData,
		status: 200,
		expiresAt: Date.now() + CACHE_TTL
	});

	return json(responseData, {
		headers: { 'Access-Control-Allow-Origin': '*' }
	});
}
