import * as fs from 'fs';
import * as path from 'path';

export function parseOutputArgs({
	args = process.argv.slice(2),
	usage,
	examples,
	supportMeta = false
} = {}) {
	const opts = {
		output: null,
		single: false,
		aliasesOutput: null,
		metaOutput: null,
		meta: false
	};

	for (let i = 0; i < args.length; i++) {
		if ((args[i] === '-o' || args[i] === '--output') && args[i + 1]) {
			opts.output = args[++i];
		} else if (args[i] === '--single') {
			opts.single = true;
		} else if (args[i] === '--aliases-output' && args[i + 1]) {
			opts.aliasesOutput = args[++i];
		} else if (args[i] === '--meta-output' && args[i + 1]) {
			opts.metaOutput = args[++i];
		} else if (supportMeta && args[i] === '--meta') {
			opts.meta = true;
		} else if (args[i] === '-h' || args[i] === '--help') {
			const lines = [
				`Usage: ${usage}`,
				'',
				'Options:',
				'  -o, --output <dir>         Save one JSON file per category to this folder',
				'      --single               Save one all-kaomoji.json file to --output',
				'      --aliases-output <f>   Save alias -> category JSON to this file',
				'      --meta-output <f>      Save scrape metadata JSON to this file'
			];

			if (supportMeta) {
				lines.push('      --meta                 Include aliases + metadata in stdout/single output');
			}

			lines.push('  -h, --help                 Show this help', '', 'Examples:');

			for (const example of examples) {
				lines.push(`  ${example}`);
			}

			console.log(`\n${lines.join('\n')}\n`);
			process.exit(0);
		}
	}

	return opts;
}

function ensureParentDir(filePath) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function writeScrapeOutput({
	opts,
	categories,
	aliases = {},
	meta = {}
}) {
	const singlePayload =
		opts.meta || opts.metaOutput
			? {
					categories,
					aliases,
					meta
				}
			: categories;

	if (!opts.output && !opts.aliasesOutput && !opts.metaOutput) {
		console.log(JSON.stringify(opts.single || opts.meta ? singlePayload : categories, null, 2));
		return;
	}

	if (opts.output) {
		fs.mkdirSync(opts.output, { recursive: true });

		if (opts.single) {
			const dest = path.join(opts.output, 'all-kaomoji.json');
			fs.writeFileSync(dest, JSON.stringify(singlePayload, null, 2));
			console.error(`Saved -> ${dest}`);
		} else {
			for (const [category, list] of Object.entries(categories)) {
				const dest = path.join(opts.output, `${category}.json`);
				fs.writeFileSync(dest, JSON.stringify(list, null, 2));
				console.error(`Saved -> ${dest}`);
			}
		}
	}

	if (opts.aliasesOutput) {
		ensureParentDir(opts.aliasesOutput);
		fs.writeFileSync(opts.aliasesOutput, JSON.stringify(aliases, null, 2));
		console.error(`Saved -> ${opts.aliasesOutput}`);
	}

	if (opts.metaOutput) {
		ensureParentDir(opts.metaOutput);
		fs.writeFileSync(opts.metaOutput, JSON.stringify(meta, null, 2));
		console.error(`Saved -> ${opts.metaOutput}`);
	}
}
