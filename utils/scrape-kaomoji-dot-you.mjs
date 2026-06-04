import * as cheerio from 'cheerio';
import { parseOutputArgs, writeScrapeOutput } from './scrape-output.mjs';

const URL = 'https://kaomoji.you/en/';

function parseArgs() {
	return parseOutputArgs({
		usage: 'node scrape-kaomoji-dot-you.mjs [options]',
		examples: [
			'node scrape-kaomoji-dot-you.mjs',
			'node scrape-kaomoji-dot-you.mjs -o ../src/lib/kaomojis/data',
			'node scrape-kaomoji-dot-you.mjs -o ../tmp/kaomojis --single',
			'node scrape-kaomoji-dot-you.mjs --aliases-output ../src/lib/kaomojis/aliases.json'
		]
	});
}

async function scrape() {
	console.error(`Fetching ${URL}...`);
	const res = await fetch(URL);
	const html = await res.text();
	const $ = cheerio.load(html);

	const categories = {};

	$('h3').each((_, h3) => {
		const category = $(h3).find('a').text().trim().toLowerCase().replace(/\s+/g, '-');
		if (!category) return;

		const kaomojis = [];

		let next = $(h3).next();
		while (next.length && !next.is('h3')) {
			next.find('table.table_kaomoji span').each((_, span) => {
				const text = $(span).text().trim();
				if (text) kaomojis.push(text);
			});
			next = next.next();
		}

		if (kaomojis.length > 0) {
			categories[category] = kaomojis;
			console.error(`  ${category}: ${kaomojis.length} kaomoji`);
		}
	});

	return { categories, aliases: {}, meta: {} };
}

async function main() {
	const opts = parseArgs();
	const { categories, aliases, meta } = await scrape();
	const categoryNames = Object.keys(categories);
	console.error(`\nDone! Found ${categoryNames.length} categories\n`);
	writeScrapeOutput({ opts, categories, aliases, meta });
}

main().catch((err) => {
	console.error('Error:', err.message);
	process.exit(1);
});
