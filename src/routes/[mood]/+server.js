import { json, error } from '@sveltejs/kit';
import { kaomojis } from '$lib/kaomojis';

export function GET({ params, url }) {
  const { mood } = params;
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Number(url.searchParams.get('limit') ?? 20);

  const all = kaomojis[mood];
  if (!all) error(404, `Unknown mood: ${mood}`);

  const start = (page - 1) * limit;
  const results = all.slice(start, start + limit);

  return json({ mood, results, total: all.length, page, limit });
}