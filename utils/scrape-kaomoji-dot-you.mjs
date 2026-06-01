import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const URL = 'https://kaomoji.you/en/';

function parseArgs() {
	const args = process.argv.slice(2);
	const opts = { output: null, single: false };

	for (let i = 0; i < args.length; i++) {
		if ((args[i] === '-o' || args[i] === '--output') && args[i + 1]) {
			opts.output = args[++i];
		} else if (args[i] === '--single') {
			opts.single = true;
		} else if (args[i] === '-h' || args[i] === '--help') {
			console.log(`
				Usage: node scrape-kaomoji.mjs [options]

				Options:
					-o, --output <dir>   Save files to this folder (one JSON per category)
							--single         Save everything to a single all-kaomoji.json in --output
					-h, --help           Show this help

				Examples:
					node scrape-kaomoji-dot-you.mjs																		# print JSON to stdout
					node scrape-kaomoji-dot-you.mjs -o ../src/lib/kaomojis						# save one file per category
					node scrape-kaomoji-dot-you.mjs -o ../src/lib/kaomojis --single		# save one all-kaomoji.json
			`);
			process.exit(0);
		}
	}

	return opts;
}

async function scrape() {
	console.error(`Fetching ${URL}...`);
	const res = await fetch(URL);
	const html = await res.text();
	const $ = cheerio.load(html);

	const results = {};

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
			results[category] = kaomojis;
			console.error(`  ${category}: ${kaomojis.length} kaomoji`);
		}
	});

	return results;
}

async function main() {
	const opts = parseArgs();
	const results = await scrape();
	const categories = Object.keys(results);
	console.error(`\nDone! Found ${categories.length} categories\n`);

	if (!opts.output) {
		// No output dir — print to stdout
		console.log(JSON.stringify(results, null, 2));
		return;
	}

	fs.mkdirSync(opts.output, { recursive: true });

	if (opts.single) {
		const dest = path.join(opts.output, 'all-kaomoji.json');
		fs.writeFileSync(dest, JSON.stringify(results, null, 2));
		console.error(`Saved → ${dest}`);
	} else {
		for (const [category, list] of Object.entries(results)) {
			const dest = path.join(opts.output, `${category}.json`);
			fs.writeFileSync(dest, JSON.stringify(list, null, 2));
			console.error(`Saved → ${dest}`);
		}
	}
}

main().catch((err) => {
	console.error('Error:', err.message);
	process.exit(1);
});
