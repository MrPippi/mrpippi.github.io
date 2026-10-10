/**
 * 聊天列指令（彩蛋）：把輸入的文字解析成要執行的動作，本身不碰畫面，方便測試。
 * 執行與顯示在 <CommandBar />。指令名稱與參數和遊戲一樣用英文。
 */
import { MAX_GIVE_COUNT } from './inventory';
import { WEATHERS, type Weather } from './weather';

/** /give 可以拿的物品：id → public/ 下的圖示（名稱在翻譯檔 commands.items） */
export const GIVE_ITEMS = {
	cake: '/mc/item/cake.png',
	diamond_pickaxe: '/mc/item/diamond_pickaxe.png',
	enchanted_book: '/mc/item/enchanted_book.png',
	ender_pearl: '/mc/item/ender_pearl.png',
	nether_star: '/mc/item/nether_star.png',
	firework_rocket: '/mc/item/firework_rocket.png',
	map: '/mc/item/map.png',
	compass: '/mc/item/compass.png',
	redstone: '/mc/item/redstone.png',
	name_tag: '/mc/item/name_tag.png',
	goat_horn: '/mc/item/goat_horn.png',
	bundle: '/mc/item/bundle.png',
	experience_bottle: '/mc/item/experience_bottle.png',
} as const;
export type GiveItem = keyof typeof GIVE_ITEMS;

/** 每格最多疊幾個（和原版一樣；沒列出的是 64） */
const STACK_SIZES: Partial<Record<GiveItem, number>> = {
	cake: 1,
	diamond_pickaxe: 1,
	enchanted_book: 1,
	ender_pearl: 16,
	goat_horn: 1,
	bundle: 1,
};
const DEFAULT_STACK = 64;

export function stackSize(item: GiveItem): number {
	return STACK_SIZES[item] ?? DEFAULT_STACK;
}

export function isGiveItem(id: string): id is GiveItem {
	return Object.hasOwn(GIVE_ITEMS, id);
}

/** /tp 可以去的頁面：名稱 → 網址（不含語系前綴） */
export const TP_PAGES = {
	home: '/',
	about: '/about/',
	portfolio: '/portfolio/',
	media: '/media/',
	blog: '/blog/',
	contact: '/contact/',
} as const;
export type TpPage = keyof typeof TP_PAGES;

const TIMES = ['day', 'night'] as const;
const MUSIC_ACTIONS = ['on', 'off', 'next'] as const;

/** 指令名稱與用法（/help 與錯誤訊息用） */
export const COMMANDS = {
	help: '/help',
	time: '/time set <day|night>',
	weather: `/weather [${WEATHERS.join('|')}]`,
	give: '/give @s <item> [count]',
	tp: `/tp <${Object.keys(TP_PAGES).join('|')}>`,
	music: `/music <${MUSIC_ACTIONS.join('|')}>`,
	search: '/search <keyword>',
	say: '/say <message>',
	seed: '/seed',
	kill: '/kill',
	clear: '/clear',
} as const;
export type CommandName = keyof typeof COMMANDS;

export type Action =
	| { readonly kind: 'chat'; readonly text: string }
	| { readonly kind: 'help' }
	| { readonly kind: 'time'; readonly value: (typeof TIMES)[number] }
	| { readonly kind: 'weather'; readonly value: Weather | undefined }
	| { readonly kind: 'give'; readonly item: GiveItem; readonly count: number }
	| { readonly kind: 'giveList' }
	| { readonly kind: 'tp'; readonly page: TpPage }
	| { readonly kind: 'music'; readonly value: (typeof MUSIC_ACTIONS)[number] }
	| { readonly kind: 'search'; readonly query: string }
	| { readonly kind: 'say'; readonly text: string }
	| { readonly kind: 'seed' }
	| { readonly kind: 'kill' }
	| { readonly kind: 'clear' }
	| { readonly kind: 'empty' }
	| { readonly kind: 'unknown'; readonly name: string }
	| { readonly kind: 'usage'; readonly command: CommandName };

/** 聊天訊息與指令參數的長度上限（和遊戲一樣 256 字） */
export const MAX_INPUT = 256;

function isOneOf<T extends string>(list: readonly T[], value: string | undefined): value is T {
	return value !== undefined && (list as readonly string[]).includes(value);
}

function isKey<T extends object>(obj: T, key: string | undefined): key is Extract<keyof T, string> {
	return key !== undefined && Object.hasOwn(obj, key);
}

/** /give 的數量：1–64 的整數，其他回傳 undefined */
function giveCount(raw: string): number | undefined {
	if (!/^\d{1,3}$/.test(raw)) return undefined;
	const count = Number(raw);
	return count >= 1 && count <= MAX_GIVE_COUNT ? count : undefined;
}

/** 去掉 minecraft: 前綴並轉小寫：minecraft:Cake → cake */
function itemId(raw: string | undefined): string | undefined {
	return raw?.toLowerCase().replace(/^minecraft:/, '');
}

function parseArgs(name: CommandName, args: readonly string[], rest: string): Action {
	const usage: Action = { kind: 'usage', command: name };
	switch (name) {
		case 'help':
		case 'seed':
		case 'kill':
		case 'clear':
			return { kind: name };
		case 'time':
			return args[0] === 'set' && isOneOf(TIMES, args[1]) ? { kind: 'time', value: args[1] } : usage;
		case 'weather':
			if (args.length === 0) return { kind: 'weather', value: undefined };
			return isOneOf(WEATHERS, args[0]) ? { kind: 'weather', value: args[0] } : usage;
		case 'give': {
			// /give @s cake 5、/give cake 都接受；數量 1–64，省略是 1
			const [rawId, rawCount, ...extra] = args[0] === '@s' || args[0] === '@p' ? args.slice(1) : args;
			// 沒寫物品：列出所有可以拿的物品
			if (rawId === undefined) return { kind: 'giveList' };
			const id = itemId(rawId);
			const count = rawCount === undefined ? 1 : giveCount(rawCount);
			return isKey(GIVE_ITEMS, id) && count !== undefined && extra.length === 0
				? { kind: 'give', item: id, count }
				: usage;
		}
		case 'tp':
			return isKey(TP_PAGES, args[0]) ? { kind: 'tp', page: args[0] } : usage;
		case 'music':
			return isOneOf(MUSIC_ACTIONS, args[0]) ? { kind: 'music', value: args[0] } : usage;
		case 'search':
			return rest ? { kind: 'search', query: rest } : usage;
		case 'say':
			return rest ? { kind: 'say', text: rest } : usage;
	}
}

/** 解析聊天列輸入。不是 / 開頭的就是一般聊天訊息。 */
export function parseCommand(input: string): Action {
	const text = input.trim().slice(0, MAX_INPUT);
	if (!text || text === '/') return { kind: 'empty' };
	if (!text.startsWith('/')) return { kind: 'chat', text };

	const [rawName = '', ...rawArgs] = text.slice(1).split(/\s+/);
	const name = rawName.toLowerCase();
	if (!isKey(COMMANDS, name)) return { kind: 'unknown', name: rawName };
	// 參數不分大小寫；/say 與 /search 的文字（rest）保留原本的大小寫
	const args = rawArgs.map((arg) => arg.toLowerCase());
	const rest = text.slice(1 + rawName.length).trim();
	return parseArgs(name, args, rest);
}

function argOptions(name: string, argIndex: number, args: readonly string[]): readonly string[] {
	if (name === 'time') return argIndex === 0 ? ['set'] : argIndex === 1 ? TIMES : [];
	if (name === 'weather') return argIndex === 0 ? WEATHERS : [];
	if (name === 'tp') return argIndex === 0 ? Object.keys(TP_PAGES) : [];
	if (name === 'music') return argIndex === 0 ? MUSIC_ACTIONS : [];
	if (name === 'give') {
		if (argIndex === 0) return ['@s'];
		return argIndex === 1 && args[0] === '@s' ? Object.keys(GIVE_ITEMS) : [];
	}
	return [];
}

/**
 * 自動完成：回傳完整的候選輸入（按 Tab 會換成第一個）。
 * 例：'/we' → ['/weather']；'/weather r' → ['/weather rain']
 */
export function suggest(input: string, limit = 20): readonly string[] {
	if (!input.startsWith('/')) return [];
	const parts = input.slice(1).split(' ');
	if (parts.length === 1) {
		const prefix = parts[0].toLowerCase();
		return Object.keys(COMMANDS)
			.filter((c) => c.startsWith(prefix))
			.map((c) => `/${c}`)
			.slice(0, limit);
	}
	const [name, ...args] = parts;
	const current = args.at(-1) ?? '';
	const done = args.slice(0, -1);
	const head = `/${[name, ...done].join(' ')} `;
	return argOptions(name.toLowerCase(), done.length, done)
		.filter((option) => option.startsWith(current.toLowerCase()) && option !== current)
		.map((option) => `${head}${option}`)
		.slice(0, limit);
}

/** 聊天訊息裡呼喚苦力怕（彩蛋）：creeper 或「苦力怕」，不分大小寫 */
export function isCreeperCall(text: string): boolean {
	return /creeper|苦力怕/i.test(text);
}

/** /seed 顯示的種子碼：由名稱算出來，每次都一樣 */
export function seedOf(name: string): number {
	return [...name].reduce((hash, ch) => (Math.imul(hash, 31) + (ch.codePointAt(0) ?? 0)) | 0, 0);
}
