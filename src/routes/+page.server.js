import aliasesData from '$lib/kaomojis/aliases.json';
import { kaomojis } from '$lib/kaomojis';

function sortStrings(values) {
	return [...values].sort((a, b) => a.localeCompare(b));
}

export function load() {
	const categories = sortStrings(Object.keys(kaomojis));
	const aliases = sortStrings(
		Object.entries(aliasesData)
			.filter(([, canonical]) => Boolean(kaomojis[canonical]))
			.map(([alias]) => alias)
	);
	const moods = sortStrings(new Set([...categories, ...aliases]));
	const total = categories.reduce((sum, category) => sum + kaomojis[category].length, 0);

	return {
		categories,
		aliases,
		moods,
		total
	};
}
