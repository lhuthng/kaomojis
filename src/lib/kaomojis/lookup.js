import { kaomojis } from './index.js';

const aliasToMood = {
	angry: 'anger',
	annoyed: 'dissatisfaction',
	aro: 'love',
	astonished: 'surprise',
	awkward: 'embarrassment',
	bashful: 'embarrassment',
	bear: 'bear',
	bewildered: 'confusion',
	bored: 'indifference',
	bunny: 'rabbit',
	cat: 'cat',
	cheerful: 'joy',
	comforting: 'sympathy',
	confused: 'confusion',
	crush: 'love',
	cry: 'sadness',
	crying: 'sadness',
	cuddle: 'hugging',
	depressed: 'sadness',
	disappointed: 'dissatisfaction',
	displeased: 'dissatisfaction',
	doggo: 'dog',
	enemy: 'enemies',
	excited: 'surprise',
	face: 'faces',
	fearful: 'fear',
	foe: 'enemies',
	friend: 'friends',
	frustrated: 'dissatisfaction',
	furious: 'anger',
	glad: 'joy',
	grim: 'dissatisfaction',
	grumpy: 'dissatisfaction',
	happy: 'joy',
	hare: 'rabbit',
	hello: 'greeting',
	hi: 'greeting',
	hiding: 'hiding',
	hug: 'hugging',
	hugged: 'hugging',
	hungry: 'food',
	ill: 'pain',
	indifferent: 'indifference',
	kitten: 'cat',
	kitty: 'cat',
	love: 'love',
	loving: 'love',
	mad: 'anger',
	meh: 'indifference',
	nap: 'sleeping',
	nervous: 'fear',
	nope: 'doubt',
	painful: 'pain',
	puzzled: 'confusion',
	puppy: 'dog',
	rage: 'anger',
	sad: 'sadness',
	rub: 'hugging',
	scared: 'fear',
	shocked: 'surprise',
	shy: 'embarrassment',
	sleep: 'sleeping',
	sleepy: 'sleeping',
	sorry: 'apologizing',
	sprinted: 'running',
	surprised: 'surprise',
	tired: 'sleeping',
	unique: 'special',
	unkind: 'enemies',
	wave: 'greeting',
	weary: 'sleeping',
	wink: 'winking',
	wizard: 'magic',
	woah: 'surprise',
	wow: 'surprise',
	write: 'writing'
};

const normalize = (value) =>
	String(value ?? '')
		.toLowerCase()
		.replace(/[\s_-]+/g, '');

const canonicalMoods = Object.keys(kaomojis);
const moodTerms = new Map();
const searchableTerms = [];

for (const mood of canonicalMoods) {
	moodTerms.set(normalize(mood), mood);
	searchableTerms.push({ mood, label: mood });
}

for (const [alias, mood] of Object.entries(aliasToMood)) {
	if (kaomojis[mood]) {
		moodTerms.set(normalize(alias), mood);
		searchableTerms.push({ mood, label: alias });
	}
}

export const maxMoodLength = Math.max(
	...searchableTerms.map((term) => normalize(term.label).length),
	0
);

export function normalizeMood(value) {
	return normalize(value);
}

export function resolveMood(mood) {
	return moodTerms.get(normalize(mood)) ?? null;
}

function levenshtein(a, b) {
	const dp = Array.from({ length: a.length + 1 }, (_, i) =>
		Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
	);

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}

	return dp[a.length][b.length];
}

export function getSuggestions(mood, allMoods, limit = 5) {
	const input = normalize(mood);
	const allowedMoods = new Set(allMoods);

	const moodCandidates = new Map();
	const minScore = input.length <= 3 ? 0.55 : 0.4;

	for (const term of searchableTerms) {
		if (!allowedMoods.has(term.mood)) continue;

		const candidate = normalize(term.label);
		const distance = levenshtein(input, candidate);
		const similarity = 1 - distance / Math.max(input.length, candidate.length, 1);
		const prefixMatch = candidate.startsWith(input);
		const reversePrefixMatch = input.startsWith(candidate);
		const exactMatch = candidate === input;

		let score = similarity;
		if (prefixMatch) score += 0.35;
		if (reversePrefixMatch) score += 0.1;
		if (exactMatch) score += 0.5;

		const existing = moodCandidates.get(term.mood);
		const next = {
			mood: term.mood,
			label: term.label,
			score,
			prefixMatch,
			length: candidate.length
		};

		if (
			!existing ||
			next.score > existing.score ||
			(next.score === existing.score && next.prefixMatch && !existing.prefixMatch) ||
			(next.score === existing.score &&
				next.prefixMatch === existing.prefixMatch &&
				next.length < existing.length)
		) {
			moodCandidates.set(term.mood, next);
		}
	}

	return [...moodCandidates.values()]
		.filter((suggestion) => suggestion.prefixMatch || suggestion.score >= minScore)
		.sort((a, b) => {
			if (a.prefixMatch !== b.prefixMatch) return a.prefixMatch ? -1 : 1;
			if (b.score !== a.score) return b.score - a.score;
			return a.length - b.length;
		})
		.slice(0, limit)
		.map((suggestion) => suggestion.label);
}
