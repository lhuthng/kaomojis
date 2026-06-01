<script>
	import { kaomojis } from '$lib/kaomojis';
	import { onMount } from 'svelte';

	const categories = Object.keys(kaomojis);
	const total = categories.reduce((sum, cat) => sum + kaomojis[cat].length, 0);

	let randomCat = $state(categories[Math.floor(Math.random() * categories.length)]);

	onMount(() => {
		const id = setInterval(() => {
			randomCat = categories[Math.floor(Math.random() * categories.length)];
		}, 5000);
		return () => clearInterval(id);
	});
</script>

<svelte:head>
	<title>Kaomoji-API — ( ﾟ∀ﾟ)</title>
</svelte:head>

{#snippet kaomoji(text, className)}
	<span class={className} class:whitespace-nowrap={true}>
		{text}
	</span>
{/snippet}

{#snippet codeblock(filename, code)}
	<div class="mb-3 overflow-hidden rounded border border-dark-light-2 bg-dark-light-1">
		<div class="flex items-center gap-1.5 border-b border-dark-light-2 bg-dark px-3 py-2">
			<span class="h-2.5 w-2.5 rounded-full bg-accent-red"></span>
			<span class="h-2.5 w-2.5 rounded-full bg-accent-yellow"></span>
			<span class="h-2.5 w-2.5 rounded-full bg-accent-green"></span>
			<span class="ml-1 text-xs tracking-wider text-gray-600">{filename}</span>
		</div>
		<pre
			class="m-0 overflow-x-auto p-4 font-['Space_Mono'] text-[13px] leading-relaxed text-accent-green-light-3"><code
				>{code}</code
			></pre>
	</div>
{/snippet}

{#snippet stat(num, label)}
	<div class="flex flex-col gap-0.5">
		<span class="font-['Instrument_Serif'] text-3xl leading-none text-cream italic">{num}</span>
		<span class="font-['Space_Mono'] text-xs tracking-widest text-gray-600 uppercase">{label}</span>
	</div>
{/snippet}

<div class="mx-auto min-h-screen max-w-3xl bg-black px-6 pb-24 font-['Epilogue'] text-cream-2">
	<header class="mb-12 border-b border-dashed border-dark-light-3 pt-20 pb-10">
		<div
			class="border-border-accent-green-light-2/20 mb-6 inline-block rounded-sm border px-2.5 py-1 font-['Space_Mono'] text-xs tracking-widest text-accent-green-light-1"
		>
			✦ free & open source
		</div>
		<h1
			class="mb-3 font-['Instrument_Serif'] text-[clamp(3rem,10vw,5.5rem)] leading-none tracking-tight text-cream italic"
		>
			Kaomoji<span class="text-accent-green-light-1">API</span>
		</h1>
		<p class="mb-8 text-sm leading-relaxed text-gray-400">
			a dead-simple api to search japanese emoticons by mood<br />
			because sometimes words just aren't enough {@render kaomoji('(´；ω；｀)', 'text-cream')}
		</p>
		<div class="flex flex-wrap items-center gap-8">
			{@render stat(total > 0 ? total.toLocaleString() : '...', 'kaomoji')}
			<span class="-mt-2 text-2xl text-dark-light-3"
				>{@render kaomoji('ヽ(´▽`)/', 'text-accent-red')}</span
			>
			{@render stat(categories.length > 0 ? categories.length : '...', 'moods')}
			<span class="-mt-2 text-2xl text-dark-light-3"
				>{@render kaomoji('(ﾉ´ヮ`)ﾉ', 'text-accent-red')}</span
			>
			{@render stat(0, 'databases')}
		</div>
	</header>

	<main class="space-y-14">
		<section>
			<h2
				class="mb-3 flex items-baseline gap-3 font-['Instrument_Serif'] text-2xl text-cream italic"
			>
				<span
					class="font-['Space_Mono'] text-xs font-normal tracking-wider text-accent-green-light-1 not-italic"
					>01</span
				> usage
			</h2>
			<p class="mb-4 text-sm leading-relaxed text-gray-400">
				hit the api like this. no auth, no keys, no nonsense. just vibes {@render kaomoji(
					'(・ω・)b',
					'text-accent-green'
				)}
			</p>

			<div class="mb-4 space-y-2">
				{#each ['/:mood', '/:mood?page=1&limit=20'] as ep}
					<div class="flex items-center gap-3">
						<span
							class="rounded-sm border border-accent-green-light-2/20 px-2 py-0.5 text-xs font-bold text-accent-green-light-1"
							>GET</span
						>
						<code class="text-sm text-cream-2">{ep}</code>
					</div>
				{/each}
			</div>

			{@render codeblock(
				'example request',
				`fetch('/happy')
  .then(r => r.json())
  .then(console.log)`
			)}

			{@render codeblock(
				'example response',
				`{
  "mood": "happy",
  "results": ["(◠‿◠)", "٩(◕‿◕)۶", "ヽ(\`▽\`)/"],
  "total": 94,
  "page": 1,
  "limit": 20
}`
			)}
		</section>

		<section>
			<h2
				class="mb-3 flex items-baseline gap-3 font-['Instrument_Serif'] text-2xl text-cream italic"
			>
				<span
					class="font-['Space_Mono'] text-xs font-normal tracking-wider text-accent-green-light-1 not-italic"
					>02</span
				> params
			</h2>
			<p class="mb-4 text-sm leading-relaxed text-gray-400">
				two optional query params, nothing else {@render kaomoji('(￣▽￣)', 'text-accent-green')}
			</p>
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b border-dark-light-2 text-xs tracking-widest text-gray-600 uppercase">
						<th class="pr-8 pb-2 text-left font-normal">param</th>
						<th class="pr-8 pb-2 text-left font-normal">default</th>
						<th class="pb-2 text-left font-normal">description</th>
					</tr>
				</thead>
				<tbody class="text-gray-400">
					{#each [['page', '1', 'which page of results'], ['limit', '20', 'how many per page']] as [p, d, desc]}
						<tr class="border-b border-dashed border-dark">
							<td class="py-2.5 pr-8 text-cream-2"
								><code
									class="rounded-sm border border-dark-light-2 bg-dark px-1.5 py-0.5 text-xs text-accent-green-light-3"
									>{p}</code
								></td
							>
							<td class="py-2.5 pr-8"
								><code class="rounded-sm border border-dark-light-2 bg-dark px-1.5 py-0.5 text-xs"
									>{d}</code
								></td
							>
							<td class="py-2.5">{desc}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section>
			<h2
				class="mb-3 flex items-baseline gap-3 font-['Instrument_Serif'] text-2xl text-cream italic"
			>
				<span
					class="font-['Space_Mono'] text-xs font-normal tracking-wider text-accent-green-light-1 not-italic"
					>03</span
				> moods
			</h2>
			<p class="mb-4 text-sm leading-relaxed text-gray-400">
				all available categories. more via PRs {@render kaomoji('(^ー^)v', 'text-cream')}
			</p>
			<div class="flex flex-wrap gap-2">
				{#each categories.length ? categories : ['happy', 'sad', 'angry', 'love', 'cat', 'cry', 'surprised', 'shy', 'cool', 'sleepy'] as cat}
					<a
						href="/{cat}"
						class="rounded-sm border border-dark-light-2 px-3 py-1.5 text-xs text-gray-400 no-underline transition-colors hover:border-accent-green-light-2/25 hover:text-accent-green-light-1"
						>{cat}</a
					>
				{/each}
			</div>
		</section>

		<section>
			<h2
				class="mb-3 flex items-baseline gap-3 font-['Instrument_Serif'] text-2xl text-cream italic"
			>
				<span
					class="font-['Space_Mono'] text-xs font-normal tracking-wider text-accent-green-light-1 not-italic"
					>04</span
				>
				the data {@render kaomoji('٩(●̮̮̃•̃)۶')}
			</h2>
			<p class="text-sm leading-relaxed text-gray-400">
				scraped from <a
					href="https://kaomoji.you/en/"
					target="_blank"
					class="text-accent-green-light-1">kaomoji.you</a
				>
				— stored as plain
				<code
					class="rounded-sm border border-dark-light-2 bg-dark px-1.5 py-0.5 text-xs text-accent-green-light-3"
					>.json</code
				> files, one per mood. no database. no magic.
			</p>
			<p class="mt-3 text-sm leading-relaxed text-gray-400">
				want to add a mood? open a PR and drop a new <code
					class="rounded-sm border border-dark-light-2 bg-dark px-1.5 py-0.5 text-xs text-accent-green-light-3"
					>{'<moodname>.json'}</code
				>
				in
				<code
					class="rounded-sm border border-dark-light-2 bg-dark px-1.5 py-0.5 text-xs text-accent-green-light-3"
					>src/lib/kaomojis/data/</code
				>. it's just a json array. even your grandma could do it {@render kaomoji(
					'(╯°□°）╯',
					'text-cream'
				)}
			</p>
		</section>

		<section>
			<h2
				class="mb-3 flex items-baseline gap-3 font-['Instrument_Serif'] text-2xl text-cream italic"
			>
				<span
					class="font-['Space_Mono'] text-xs font-normal tracking-wider text-accent-green-light-1 not-italic"
					>05</span
				> self-host
			</h2>
			{@render codeblock(
				'terminal',
				`git clone https://github.com/you/kaomoji-api
cd kaomoji-api
bun install
bun run dev`
			)}
		</section>
	</main>

	<footer class="mt-8 border-t border-dashed border-dark-light-3 pt-8">
		<p class="mb-1 text-xs text-gray-600">
			made with {@render kaomoji('(╯°□°）╯', 'text-cream')} and then later with {@render kaomoji(
				'(ﾉ´ヮ`)ﾉ*: ･ﾟ',
				'text-cream'
			)}
		</p>
		<div class="flex items-center gap-3 text-xs text-gray-600">
			<a
				href="https://github.com/lhuthng/kaomojis"
				target="_blank"
				class="text-accent-green-light-1">github</a
			>
			<span>·</span>
			<a href="https://kaomoji.you/en/" target="_blank" class="text-accent-green-light-1"
				>data source</a
			>
			<span>·</span>
			{#if randomCat}
				<a href="/{randomCat}" target="_blank" class="text-accent-green-light-1">try /{randomCat}</a
				>
			{:else}
				<span class="text-accent-red"
					>try /... wait I don't have any {@render kaomoji('(´；ω；｀)')}</span
				>
			{/if}
		</div>
	</footer>
</div>
