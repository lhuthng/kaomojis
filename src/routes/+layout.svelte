<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head
	><link rel="icon" href={favicon} /><link
		href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Epilogue:wght@400;500&family=Space+Mono&display=swap"
		rel="stylesheet"
	/></svelte:head
>

<div class="bg-accent-green-light-2/50">
	{@render children()}
</div>
