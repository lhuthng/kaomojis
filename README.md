# Kaomoji API (ﾉ◕ヮ◕)ﾉ\*:･ﾟ✧

Tiny SvelteKit app that serves a searchable kaomoji dataset as JSON.

Live version: https://kaomoji-search.netlify.app/

## What this repo does

- Serves mood-based kaomoji JSON from the route `/:mood`
- Stores the dataset as plain files in `src/lib/kaomojis/data/`
- Loads every JSON file with `import.meta.glob(...)`
- Includes a scraper for refreshing the dataset from https://kaomoji.you/en/

Current dataset size:

- 39 mood categories
- 793 kaomojis
- 0 databases

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
			data/              one JSON file per mood
			index.js           eager JSON loader
			lookup.js          alias resolution and suggestion helper
	routes/
		+page.svelte         homepage just for fun
		[mood]/+server.js    JSON endpoint
utils/
	scrape-kaomoji-dot-you.mjs
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

If you want the whole dataset bundled elsewhere, you can also run the scraper and write to your own directory.

## Only want the scraper?

The scraper lives here:

```txt
utils/scrape-kaomoji-dot-you.mjs
```

Run it without writing files to print everything to stdout:

```sh
bun run scrape
```

Write one JSON file per category:

```sh
bun run scrape -- -o ./tmp/kaomojis
```

Write one combined file instead:

```sh
bun run scrape -- -o ./tmp/kaomojis --single
```

Show scraper help:

```sh
bun run scrape -- --help
```

## How it works

`src/lib/kaomojis/index.js` imports every JSON file eagerly and builds an object keyed by filename.

`src/routes/[mood]/+server.js` reads `params.mood`, resolves aliases like `happy`
or `sleepy` to their canonical mood, slices the array using `page` and `limit`,
and returns JSON in this shape:

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

## Source and credits

- Data source: https://kaomoji.you/en/
- Live site: https://kaomoji-search.netlify.app/
- Built with SvelteKit, Tailwind CSS v4, and the Netlify adapter

If you want to add a new mood manually, drop a new JSON array into `src/lib/kaomojis/data/` and the loader will pick it up automatically ヽ(・∀・)ﾉ
