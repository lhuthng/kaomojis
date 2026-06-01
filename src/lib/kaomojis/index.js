const files = import.meta.glob('./data/*.json', { eager: true });

export const kaomojis = Object.fromEntries(
	Object.entries(files).map(([path, mod]) => [
		path.replace('./data/', '').replace('.json', ''),
		mod.default
	])
);
