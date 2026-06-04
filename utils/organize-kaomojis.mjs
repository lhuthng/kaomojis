import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_DATA_DIR = path.resolve('src/lib/kaomojis/data');
const DEFAULT_ALIASES_FILE = path.resolve('src/lib/kaomojis/aliases.json');

function parseArgs() {
	const args = process.argv.slice(2);
	const opts = {
		inputs: [],
		dataDir: DEFAULT_DATA_DIR,
		aliasesFile: DEFAULT_ALIASES_FILE,
		metaOutput: null
	};

	for (let i = 0; i < args.length; i++) {
		if ((args[i] === '-i' || args[i] === '--input') && args[i + 1]) {
			opts.inputs.push(path.resolve(args[++i]));
		} else if (args[i] === '--data-dir' && args[i + 1]) {
			opts.dataDir = path.resolve(args[++i]);
		} else if (args[i] === '--aliases-file' && args[i + 1]) {
			opts.aliasesFile = path.resolve(args[++i]);
		} else if (args[i] === '--meta-output' && args[i + 1]) {
			opts.metaOutput = path.resolve(args[++i]);
		} else if (args[i] === '-h' || args[i] === '--help') {
			console.log(`
Usage: node utils/organize-kaomojis.mjs --input <file> [options]

Options:
  -i, --input <file>        Raw scrape JSON to organize. Repeat for multiple sources.
      --data-dir <dir>      Canonical category JSON output directory
      --aliases-file <file> Alias -> canonical category JSON file
      --meta-output <file>  Save an organization report JSON file
  -h, --help                Show this help

Examples:
  node utils/organize-kaomojis.mjs --input ./tmp/kuma/all-kaomoji.json
  node utils/organize-kaomojis.mjs --input ./tmp/kuma.json --input ./tmp/you.json
  node utils/organize-kaomojis.mjs --input ./tmp/kuma.json --meta-output ./tmp/organize-report.json
`);
			process.exit(0);
		}
	}

	if (opts.inputs.length === 0) {
		throw new Error('At least one --input file is required');
	}

	return opts;
}

function normalizePayload(payload) {
	if (payload && typeof payload === 'object' && payload.categories) {
		return {
			categories: payload.categories ?? {},
			aliases: payload.aliases ?? {},
			meta: payload.meta ?? {}
		};
	}

	return {
		categories: payload ?? {},
		aliases: {},
		meta: {}
	};
}

function readJson(filePath, fallback = null) {
	if (!fs.existsSync(filePath)) return fallback;
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readExistingCategories(dataDir) {
	const results = {};
	if (!fs.existsSync(dataDir)) return results;

	for (const entry of fs.readdirSync(dataDir)) {
		if (!entry.endsWith('.json')) continue;
		const category = entry.replace(/\.json$/, '');
		results[category] = readJson(path.join(dataDir, entry), []);
	}

	return results;
}

function collectGroupTerms(sourceCategory, payloadAliases, payloadMeta) {
	const terms = new Set([sourceCategory]);

	for (const [alias, target] of Object.entries(payloadAliases)) {
		if (target === sourceCategory) terms.add(alias);
	}

	for (const alias of payloadMeta?.[sourceCategory]?.aliases ?? []) {
		terms.add(alias);
	}

	return [...terms];
}

function resolveCanonicalCategory(groupTerms, existingAliases) {
	const matches = groupTerms
		.map((term) => ({ term, canonical: existingAliases[term] }))
		.filter((match) => Boolean(match.canonical));

	if (matches.length === 0) {
		return {
			canonical: groupTerms[0],
			matchedBy: null,
			conflicts: []
		};
	}

	const canonical = matches[0].canonical;
	const conflicts = matches
		.filter((match) => match.canonical !== canonical)
		.map((match) => ({ term: match.term, canonical: match.canonical }));
	const matchedBy = matches[0].term;

	return { canonical, matchedBy, conflicts };
}

function sortObject(input) {
	return Object.fromEntries(
		Object.entries(input).sort(([a], [b]) => a.localeCompare(b))
	);
}

function writeCanonicalCategories(dataDir, categories) {
	fs.mkdirSync(dataDir, { recursive: true });

	for (const [category, kaomojis] of Object.entries(sortObject(categories))) {
		const dest = path.join(dataDir, `${category}.json`);
		const uniqueSorted = [...new Set(kaomojis)];
		fs.writeFileSync(dest, JSON.stringify(uniqueSorted, null, 2));
		console.error(`Saved -> ${dest}`);
	}
}

async function main() {
	const opts = parseArgs();
	const canonicalCategories = readExistingCategories(opts.dataDir);
	const canonicalAliases = {
		...(readJson(opts.aliasesFile, {}) ?? {})
	};
	const report = {
		inputs: opts.inputs,
		groups: []
	};

	for (const inputPath of opts.inputs) {
		console.error(`Reading ${inputPath}...`);
		const payload = normalizePayload(readJson(inputPath, {}));

		for (const [sourceCategory, kaomojis] of Object.entries(payload.categories)) {
			const groupTerms = collectGroupTerms(sourceCategory, payload.aliases, payload.meta);
			const { canonical, matchedBy, conflicts } = resolveCanonicalCategory(
				groupTerms,
				canonicalAliases
			);

			canonicalCategories[canonical] ??= [];
			const merged = new Set(canonicalCategories[canonical]);
			for (const kaomoji of kaomojis) merged.add(kaomoji);
			canonicalCategories[canonical] = [...merged];

			const addedAliases = [];
			const preservedAliases = [];
			for (const term of groupTerms) {
				if (term === canonical) continue;

				if (canonicalAliases[term] && canonicalAliases[term] !== canonical) {
					preservedAliases.push({
						term,
						canonical: canonicalAliases[term]
					});
					continue;
				}

				if (canonicalAliases[term] !== canonical) {
					canonicalAliases[term] = canonical;
					addedAliases.push(term);
				}
			}

			report.groups.push({
				input: inputPath,
				sourceCategory,
				groupTerms,
				canonical,
				matchedBy,
				conflicts,
				preservedAliases,
				addedAliases,
				totalKaomojis: kaomojis.length
			});

			console.error(
				`  ${sourceCategory} -> ${canonical}: ${kaomojis.length} kaomoji, ${addedAliases.length} alias updates, ${preservedAliases.length} preserved conflicts`
			);
		}
	}

	writeCanonicalCategories(opts.dataDir, canonicalCategories);
	fs.mkdirSync(path.dirname(opts.aliasesFile), { recursive: true });
	fs.writeFileSync(opts.aliasesFile, JSON.stringify(sortObject(canonicalAliases), null, 2));
	console.error(`Saved -> ${opts.aliasesFile}`);

	if (opts.metaOutput) {
		fs.mkdirSync(path.dirname(opts.metaOutput), { recursive: true });
		fs.writeFileSync(opts.metaOutput, JSON.stringify(report, null, 2));
		console.error(`Saved -> ${opts.metaOutput}`);
	}
}

main().catch((err) => {
	console.error('Error:', err.message);
	process.exit(1);
});
