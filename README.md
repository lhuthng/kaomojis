# Kaomoji API (ﾉ◕ヮ◕)ﾉ\*:･ﾟ✧

Tiny SvelteKit app that serves a searchable kaomoji dataset as JSON.

Live version: https://kaomoji-search.netlify.app/

## What this repo does

- Serves mood-based kaomoji JSON from the route `/:mood`
- Stores the dataset as plain files in `src/lib/kaomojis/data/`
- Loads every JSON file with `import.meta.glob(...)`
- Includes multiple scrapers plus an organizer pipeline for refreshing the dataset from multiple sources

Current dataset size is whatever is currently present in `src/lib/kaomojis/data/`.

## API

Base URL:

```txt
https://kaomoji-search.netlify.app
```

Route:

```txt
GET /:mood
```

Optional query params:

| Param   | Default | Meaning                  |
| ------- | ------- | ------------------------ |
| `page`  | `1`     | Result page to return    |
| `limit` | `20`    | Number of items per page |

Example request:

```sh
curl "https://kaomoji-search.netlify.app/joy?page=1&limit=5"
```

Example response:

```json
{
	"mood": "joy",
	"results": ["(* ^ ω ^)", "(´ ∀ ` *)", "٩(◕‿◕｡)۶", "☆*:.｡.o(≧▽≦)o.｡.:*☆", "(o^▽^o)"],
	"total": 41,
	"page": 1,
	"limit": 5
}
```

If a mood does not exist, the route returns a 404. If the input loosely matches
known moods or supported aliases — by prefix or similarity — the response includes up to 5 suggestions:

```json
{
	"message": "Unknown mood: hap",
	"suggestions": ["happy"]
}
```

Short prefixes work too — `j` returns `["joy"]`.

If there are no close matches, `suggestions` is omitted.

Common aliases like `happy`, `sad`, `sleepy`, `shy`, `angry`, and `cry` resolve to
their canonical mood categories automatically. For example, `GET /happy` returns
the `joy` dataset.

## Available moods

See all 39 mood categories: [`src/lib/kaomojis/data/`](./src/lib/kaomojis/data/)

Each filename (without `.json`) is a valid `:mood` value you can pass to the API.

## Project structure

```txt
src/
	lib/
		kaomojis/
			aliases.json       shared alias -> canonical mood map
			data/              one JSON file per mood
			index.js           eager JSON loader
			lookup.js          alias resolution and suggestion helper
	routes/
		+page.svelte         homepage just for fun
		[mood]/+server.js    JSON endpoint
utils/
	scrape-kaomoji-dot-you.mjs
	scrape-kaomojikuma-dot-com.mjs
	scrape-output.mjs
	organize-kaomojis.mjs
```

## Local development

This project uses Bun. If you prefer npm, replace `bun` with `npm run` in all commands below.

Install and run:

```sh
bun install
bun run dev
```

Build for production:

```sh
bun run build
```

Preview the production build locally:

```sh
bun run preview
```

## Only want the data?

The easiest path is to use the JSON files directly from:

```txt
src/lib/kaomojis/data/
```

Each file contains a plain JSON array of kaomojis for one mood. Example:

```json
["(╥﹏╥)", "(っ˘̩╭╮˘̩)っ", "(ノ_<、)"]
```

If you only need one category, copy the single file you want.

Aliases live separately in:

```txt
src/lib/kaomojis/aliases.json
```

If you want the whole dataset bundled elsewhere, you can also run a scraper and write categories, aliases, and optional metadata to your own paths.

## Scraping

The raw scrapers live here:

```txt
utils/scrape-kaomoji-dot-you.mjs
utils/scrape-kaomojikuma-dot-com.mjs
```

The organizer that merges raw scrape outputs into canonical categories lives here:

```txt
utils/organize-kaomojis.mjs
```

### Quick commands

Scrape `kaomoji.you` to stdout:

```sh
bun run scrape
```

Scrape `kaomoji.you` to one file per raw category:

```sh
bun run scrape -- -o ./tmp/kaomojis
```

Scrape `kaomoji.you` to one combined file:

```sh
bun run scrape -- -o ./tmp/kaomojis --single
```

Scrape `kaomojikuma` positive emotions to one combined raw file with aliases and metadata:

```sh
bun run scrape:kuma -- -o ./tmp/kuma --single --meta
```

Organize one or more raw scrape outputs into canonical category files plus shared aliases:

```sh
bun run organize -- --input ./tmp/kaomojis/all-kaomoji.json
bun run organize -- --input ./tmp/kuma/all-kaomoji.json
bun run organize -- --input ./tmp/kaomojis/all-kaomoji.json --input ./tmp/kuma/all-kaomoji.json
```

Write aliases or metadata to custom files during scraping:

```sh
bun run scrape -- --aliases-output ./tmp/aliases.json
bun run scrape:kuma -- --meta-output ./tmp/kuma-meta.json
```

Show help:

```sh
bun run scrape -- --help
bun run scrape:kuma -- --help
bun run organize -- --help
```

### Recommended workflow

1. Run one or more raw scrapers into `./tmp/...`.
2. Run `bun run organize` with those raw outputs.
3. Review the updated category files in `src/lib/kaomojis/data/` and alias map in `src/lib/kaomojis/aliases.json`.
4. Build or test the app.

## How it works

`src/lib/kaomojis/index.js` imports every JSON file eagerly and builds an object keyed by filename.

`src/routes/[mood]/+server.js` reads `params.mood`, resolves aliases like `happy`
or `sleepy` to their canonical mood using `src/lib/kaomojis/aliases.json`, slices
the array using `page` and `limit`, and returns JSON in this shape:

```json
{
	"mood": "joy",
	"results": [],
	"total": 0,
	"page": 1,
	"limit": 20
}
```

That means the storage model stays simple and deploys cleanly on Netlify.

## Scraper pipeline

Scrapers should stay source-truthful. They should not know your canonical mood map.

- A scraper outputs raw source categories plus any source-level alias groupings it can infer.
- `utils/organize-kaomojis.mjs` reads those raw outputs, checks `src/lib/kaomojis/aliases.json`,
  chooses a canonical category when one of the grouped terms is already mapped, merges kaomojis
  into the right category JSON file, and fills in missing alias mappings for the rest of the group.

Example:

- scraper output: `happy`
- existing alias map: `happy -> joy`
- organizer result: append those kaomojis to `joy.json`

Example:

- scraper output group: `blushing`, `flattered`, `shy`
- existing alias map contains only `shy -> embarrassment`
- organizer result: append the group to `embarrassment.json` and add
  `blushing -> embarrassment` and `flattered -> embarrassment`

## Source and credits

- Data sources:
  - https://kaomoji.you/en/
  - https://kaomojikuma.com/positive-emotions-japanese-emoticons/
- Live site: https://kaomoji-search.netlify.app/
- Built with SvelteKit, Tailwind CSS v4, and the Netlify adapter

If you want to add a new mood manually, drop a new JSON array into `src/lib/kaomojis/data/` and the loader will pick it up automatically ヽ(・∀・)ﾉ
