import { json, error } from '@sveltejs/kit';
import { kaomojis } from '$lib/kaomojis';

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
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export function GET({ params, url }) {
  const { mood } = params;
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Number(url.searchParams.get('limit') ?? 20);

  const all = kaomojis[mood];

  if (!all) {
    const suggestions = getSuggestions(mood, Object.keys(kaomojis));

		console.log(suggestions);
    return json(
			{
				message: `Unknown mood: ${mood}`,
				...(suggestions.length > 0 && { suggestions }),
			},
			{ 
				status: 404,
				headers: { 'Access-Control-Allow-Origin': '*' }
			}
		);
  }

  const start = (page - 1) * limit;
  const results = all.slice(start, start + limit);

  return json(
		{ mood, results, total: all.length, page, limit }, 
		{ 
			headers: { 'Access-Control-Allow-Origin': '*' }
		});
}