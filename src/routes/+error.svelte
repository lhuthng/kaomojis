<script>
	import { onMount } from 'svelte';

	const categories = [
		'joy',
		'happy',
		'sadness',
		'sad',
		'love',
		'cat',
		'surprise',
		'shy',
		'sleeping',
		'sleepy'
	];

	let randomCat = $state(categories[Math.floor(Math.random() * categories.length)]);

	onMount(() => {
		const id = setInterval(() => {
			randomCat = categories[Math.floor(Math.random() * categories.length)];
		}, 4000);
		return () => clearInterval(id);
	});
</script>

<svelte:head>
	<title>not found (´；ω；｀)</title>
</svelte:head>

{#snippet kaomoji(text, className = '')}
	<span class={className}>
		{text}
	</span>
{/snippet}

<div class="mx-auto min-h-screen max-w-3xl bg-black px-6 pb-24 text-cream-2">
	<div class="flex h-full flex-col items-center justify-center pt-32 pb-16">
		<h1 class="mb-2 text-[10rem] tracking-tighter text-cream italic">404</h1>
		<p class="mb-8 text-xl text-gray-400">this path doesn't exist...</p>

		<div class="mx-auto max-w-md text-lg leading-relaxed text-gray-400">
			you're not even in the right dimension<br />
		</div>

		<div class="mt-12 flex justify-center gap-4">
			<a
				href="/"
				class="rounded-sm border border-dark-light-2 px-6 py-3 text-sm transition-colors hover:border-accent-green-light-2 hover:text-accent-green-light-1"
			>
				← back to homepage
			</a>

			{#if randomCat}
				<a
					href="/{randomCat}"
					class="rounded-sm border border-accent-green-light-2/30 px-6 py-3 text-sm transition-colors hover:bg-dark-light-1"
				>
					try /{randomCat}
					{@render kaomoji('(ﾉ´ヮ`)ﾉ')}
				</a>
			{/if}
		</div>
	</div>
</div>
