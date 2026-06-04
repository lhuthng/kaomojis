import * as cheerio from 'cheerio';
import { parseOutputArgs, writeScrapeOutput } from './scrape-output.mjs';

const PAGE_URL = 'https://kaomojikuma.com/positive-emotions-japanese-emoticons/';
const SKIPPED_SECTION_IDS = new Set(['more-positive-kaomoji', 'visit-our-friends']);

function parseArgs() {
	return parseOutputArgs({
		usage: 'node scrape-kaomojikuma-dot-com.mjs [options]',
		examples: [
			'node scrape-kaomojikuma-dot-com.mjs',
			'node scrape-kaomojikuma-dot-com.mjs -o ../src/lib/kaomojis/data',
			'node scrape-kaomojikuma-dot-com.mjs --aliases-output ../src/lib/kaomojis/aliases.json',
			'node scrape-kaomojikuma-dot-com.mjs --meta-output ../tmp/kaomojikuma-meta.json',
			'node scrape-kaomojikuma-dot-com.mjs -o ../tmp/kuma --single --meta'
		],
		supportMeta: true
	});
}

function normalizeWhitespace(value) {
	return String(value ?? '')
		.replace(/\s+/g, ' ')
		.trim();
}

function slugify(value) {
	return normalizeWhitespace(value)
		.toLowerCase()
		.replace(/[’']/g, '')
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function normalizeSectionId(value) {
	const raw = String(value ?? '').trim();
	if (!raw) return '';

	try {
		return slugify(decodeURIComponent(raw));
	} catch {
		return slugify(raw);
	}
}

function buildAliases(sectionId, label) {
	const aliases = new Set();
	const normalizedId = normalizeSectionId(sectionId);
	const slugLabel = slugify(label);

	if (normalizedId) aliases.add(normalizedId);
	if (slugLabel) aliases.add(slugLabel);

	for (const part of normalizeWhitespace(label).split(/\s*\/\s*/)) {
		const alias = slugify(part);
		if (alias) aliases.add(alias);
	}

	return [...aliases];
}

function getSourceCategory(sectionId, label) {
	const labelParts = normalizeWhitespace(label)
		.split(/\s*\/\s*/)
		.map((part) => slugify(part))
		.filter(Boolean);

	if (labelParts.length > 0) return labelParts[0];
	return normalizeSectionId(sectionId);
}

function isSectionHeading($, element) {
	return $(element).find('.ez-toc-section[id]').length > 0;
}

function extractSectionLabel($, heading) {
	const clone = $(heading).clone();
	clone.find('.ez-toc-section, .ez-toc-section-end').remove();
	return normalizeWhitespace(clone.text());
}

function extractKaomojisFromNode($, node) {
	const kaomojis = [];
	const directListItems = $(node).is('ul.cc, ul.cc.wp-block-list')
		? $(node).children('li').toArray()
		: [];

	$(node)
		.find('span.copy-the-code-default')
		.each((_, block) => {
			const hasTarget = $(block).find('.copy-the-code-target').length > 0;
			const hasButton = $(block).find('.copy-the-code-button').length > 0;
			if (!hasTarget || !hasButton) return;

			const text = normalizeWhitespace($(block).find('.copy-the-code-target').first().text());
			if (text) kaomojis.push(text);
		});

	for (const item of directListItems) {
		const text = normalizeWhitespace($(item).text());
		if (text) kaomojis.push(text);
	}

	return kaomojis;
}

function extractSections($) {
	const headings = $('h1, h2, h3, h4, h5, h6').toArray().filter((node) => isSectionHeading($, node));
	const sections = [];

	for (const heading of headings) {
		const section = $(heading).find('.ez-toc-section[id]').first();
		const sectionId = normalizeSectionId(section.attr('id'));
		if (!sectionId || SKIPPED_SECTION_IDS.has(sectionId)) continue;

		const label = extractSectionLabel($, heading);
		if (!label) continue;

		const kaomojiSet = new Set();
		let next = $(heading).next();

		while (next.length) {
			if (next.is('h1, h2, h3, h4, h5, h6') && isSectionHeading($, next)) break;

			for (const kaomoji of extractKaomojisFromNode($, next)) {
				kaomojiSet.add(kaomoji);
			}

			next = next.next();
		}

		if (kaomojiSet.size === 0) continue;

		sections.push({
			sectionId,
			label,
			kaomojis: [...kaomojiSet]
		});
	}

	return sections;
}

async function scrape() {
	console.error(`Fetching ${PAGE_URL}...`);
	const res = await fetch(PAGE_URL);
	const html = await res.text();
	const $ = cheerio.load(html);

	const categories = {};
	const aliases = {};
	const meta = {};

	for (const { sectionId, label, kaomojis } of extractSections($)) {
		const canonical = getSourceCategory(sectionId, label);
		const sectionAliases = buildAliases(sectionId, label);

		categories[canonical] ??= [];
		meta[canonical] ??= {
			label,
			sourceIds: [],
			sourceLabels: [],
			sourceUrls: [],
			aliases: []
		};

		const merged = new Set(categories[canonical]);
		for (const kaomoji of kaomojis) merged.add(kaomoji);
		categories[canonical] = [...merged];

		meta[canonical].sourceIds = [...new Set([...meta[canonical].sourceIds, sectionId])];
		meta[canonical].sourceLabels = [...new Set([...meta[canonical].sourceLabels, label])];
		meta[canonical].sourceUrls = [...new Set([...meta[canonical].sourceUrls, PAGE_URL])];
		meta[canonical].aliases = [...new Set([...meta[canonical].aliases, ...sectionAliases])];

		for (const alias of sectionAliases) {
			aliases[alias] ??= canonical;
		}

		console.error(`  ${sectionId} -> ${canonical}: ${kaomojis.length} kaomoji`);
	}

	return { categories, aliases, meta };
}

async function main() {
	const opts = parseArgs();
	const { categories, aliases, meta } = await scrape();
	const names = Object.keys(categories);
	console.error(`\nDone! Found ${names.length} categories\n`);
	writeScrapeOutput({ opts, categories, aliases, meta });
}

main().catch((err) => {
	console.error('Error:', err.message);
	process.exit(1);
});
