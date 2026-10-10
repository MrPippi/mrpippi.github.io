/**
 * 進度（成就）系統：達成時右上角跳出「進度達成！」通知，記錄存在 localStorage。
 * 各功能呼叫 unlock(id)；關於我頁面的進度清單監聽 ADVANCEMENT_EVENT 即時更新。
 */
import { type AdvancementId, langFromDocument, stripLang, t } from '../i18n';
import { showToast } from './toast';

/** 標題與說明在翻譯檔的 advancements.items */
export interface Advancement {
	readonly id: AdvancementId;
	readonly icon: string;
	/** 隱藏進度：達成前清單上只顯示「???」 */
	readonly hidden?: boolean;
}

export const ADVANCEMENTS: readonly Advancement[] = [
	{ id: 'welcome', icon: '/favicon.png' },
	{ id: 'explorer', icon: '/mc/item/map.png' },
	{ id: 'dj', icon: '/mc/item/music_disc_cat.png' },
	{ id: 'night-owl', icon: '/mc/sky/moon.png' },
	{ id: 'social', icon: '/mc/item/name_tag.png' },
	{ id: 'enchanter', icon: '/mc/item/enchanted_book.png' },
	{ id: 'reader', icon: '/mc/item/writable_book.png' },
	{ id: 'lost', icon: '/mc/item/compass.png' },
	{ id: 'commander', icon: '/mc/item/command_block_minecart.png' },
	{ id: 'sweet-dreams', icon: '/mc/item/clock_night.png' },
	{ id: 'rainy-day', icon: '/mc/item/water_bucket.png' },
	{ id: 'hoarder', icon: '/mc/item/bundle.png' },
	{ id: 'librarian', icon: '/mc/block/bookshelf.png' },
	{ id: 'max-level', icon: '/mc/item/experience_bottle.png' },
	{ id: 'archaeologist', icon: '/mc/item/brush.png' },
	{ id: 'bilingual', icon: '/mc/item/globe_banner_pattern.png' },
	{ id: 'structure', icon: '/mc/block/structure_block.png' },
	{ id: 'you-died', icon: '/mc/item/skull_banner_pattern.png' },
	{ id: 'splash', icon: '/mc/item/gold_ingot.png' },
	{ id: 'insomnia', icon: '/mc/item/phantom_membrane.png', hidden: true },
	{ id: 'diamonds', icon: '/mc/item/diamond.png', hidden: true },
	{ id: 'soliloquy', icon: '/mc/item/echo_shard.png', hidden: true },
	{ id: 'respawn', icon: '/mc/item/totem_of_undying.png', hidden: true },
	{ id: 'disc-collector', icon: '/mc/block/jukebox_side.png', hidden: true },
	{ id: 'creeper', icon: '/mc/item/gunpowder.png', hidden: true },
];

export const ADVANCEMENT_EVENT = 'advancement-unlocked';
/** 「探險家」需要逛過的頁面（中英文版都算） */
export const EXPLORER_PATHS: readonly string[] = ['/about/', '/media/', '/contact/'];
/** 「圖書館員」要讀幾篇文章 */
export const LIBRARIAN_POSTS = 5;
/** 「滿載而歸」要用 /give 拿到幾種物品 */
export const HOARDER_ITEMS = 3;
/** 「標語收藏家」要點幾次標語 */
export const SPLASH_CLICKS = 10;
/** 「失眠」：在這個時間（訪客當地時間，0 點起算）之前造訪 */
export const INSOMNIA_BEFORE_HOUR = 4;

const STORAGE_KEY = 'advancements';
const VISITED_KEY = 'visited-pages';
const GIVEN_KEY = 'given-items';
const SPLASH_KEY = 'splash-clicks';
const HEARD_KEY = 'heard-tracks';
const POST_PATH = /^\/blog\/(?!tags\/)[^/]+\/$/;

function readList(key: string): readonly string[] {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
	} catch {
		return [];
	}
}

function writeList(key: string, list: readonly string[]): void {
	try {
		localStorage.setItem(key, JSON.stringify(list));
	} catch {
		// 無法儲存時這次仍會顯示通知，只是不會記住
	}
}

export function unlockedIds(): readonly string[] {
	return readList(STORAGE_KEY);
}

/** 達成進度：第一次才顯示通知並廣播事件；已達成或 id 不存在時不做事。 */
export function unlock(id: AdvancementId): void {
	const advancement = ADVANCEMENTS.find((a) => a.id === id);
	const unlocked = unlockedIds();
	if (!advancement || unlocked.includes(id)) return;
	writeList(STORAGE_KEY, [...unlocked, id]);
	const { advancements } = t(langFromDocument());
	showToast(advancements.toast, advancements.items[id].title, advancement.icon);
	document.dispatchEvent(new CustomEvent(ADVANCEMENT_EVENT, { detail: id }));
}

/** 記錄造訪過的頁面，並檢查與造訪相關的進度。 */
export function recordVisit(path: string): void {
	const normalized = stripLang(path.endsWith('/') ? path : `${path}/`);
	const visited = readList(VISITED_KEY);
	const next = visited.includes(normalized) ? visited : [...visited, normalized];
	if (next !== visited) writeList(VISITED_KEY, next);

	unlock('welcome');
	if (EXPLORER_PATHS.every((p) => next.includes(p))) unlock('explorer');
	if (POST_PATH.test(normalized)) unlock('reader');
	if (next.filter((p) => POST_PATH.test(p)).length >= LIBRARIAN_POSTS) unlock('librarian');
	if (new Date().getHours() < INSOMNIA_BEFORE_HOUR) unlock('insomnia');
}

/** 逛過幾個不同的頁面（地圖用） */
export function visitedCount(): number {
	return readList(VISITED_KEY).length;
}

/** 記錄聽過的曲目，全部聽過就達成「唱片收藏家」 */
export function recordTrack(title: string, total: number): void {
	const heard = readList(HEARD_KEY);
	const next = heard.includes(title) ? heard : [...heard, title];
	if (next !== heard) writeList(HEARD_KEY, next);
	if (next.length >= total) unlock('disc-collector');
}

/** 記錄 /give 拿到的物品，拿到夠多種就達成「滿載而歸」 */
export function recordGive(item: string): void {
	const given = readList(GIVEN_KEY);
	const next = given.includes(item) ? given : [...given, item];
	if (next !== given) writeList(GIVEN_KEY, next);
	if (next.length >= HOARDER_ITEMS) unlock('hoarder');
}

/** 點了一次標題畫面的標語，累計夠多次就達成「標語收藏家」 */
export function recordSplashClick(): void {
	let count = 0;
	try {
		count = (Number.parseInt(localStorage.getItem(SPLASH_KEY) ?? '0', 10) || 0) + 1;
		localStorage.setItem(SPLASH_KEY, String(count));
	} catch {
		// 無法儲存時不累計
	}
	if (count >= SPLASH_CLICKS) unlock('splash');
}
