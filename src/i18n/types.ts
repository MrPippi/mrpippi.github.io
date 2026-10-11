/** 每個語系的翻譯檔都要符合這個形狀；新增字串時兩個檔案都要補上。 */
import type { GiveItem, TpPage } from '../lib/commands';
import type { Weather } from '../lib/weather';

export type SkillKey = 'plugins' | 'web' | 'deploy' | 'ai';
export type AdvancementId =
	| 'welcome'
	| 'explorer'
	| 'dj'
	| 'night-owl'
	| 'social'
	| 'enchanter'
	| 'reader'
	| 'lost'
	| 'commander'
	| 'sweet-dreams'
	| 'rainy-day'
	| 'hoarder'
	| 'librarian'
	| 'max-level'
	| 'archaeologist'
	| 'bilingual'
	| 'structure'
	| 'you-died'
	| 'splash'
	| 'insomnia'
	| 'diamonds'
	| 'soliloquy'
	| 'respawn'
	| 'disc-collector'
	| 'creeper'
	| 'treasure-map';

export interface Dictionary {
	readonly site: { readonly title: string; readonly description: string; readonly titleSuffix: string };
	readonly profile: { readonly name: string; readonly tagline: string; readonly location: string };
	readonly splashes: readonly string[];
	readonly menu: {
		readonly label: string;
		readonly about: { readonly title: string; readonly sub: string };
		readonly portfolio: { readonly title: string; readonly sub: string };
		readonly media: { readonly title: string; readonly sub: string };
		readonly blog: { readonly title: string; readonly sub: string; readonly wip: string };
		readonly contact: { readonly title: string; readonly sub: string };
		readonly unofficial: string;
	};
	readonly back: { readonly title: string; readonly blog: string };
	readonly about: {
		readonly heading: string;
		readonly description: string;
		readonly profileLabel: string;
		readonly avatarAlt: string;
		readonly nameLabel: string;
		readonly idLabel: string;
		readonly locationLabel: string;
		readonly bioLabel: string;
		readonly paragraphs: readonly string[];
		readonly stats: string;
		readonly skills: Readonly<Record<SkillKey, string>>;
	};
	readonly portfolio: {
		readonly heading: string;
		readonly description: string;
		readonly lead: string;
		/** 星數的無障礙說明（畫面上是下界之星圖示 + 數字） */
		readonly stars: (n: number) => string;
		readonly updated: string;
		readonly github: string;
		readonly website: string;
		readonly more: string;
	};
	readonly media: {
		readonly heading: string;
		readonly description: string;
		readonly channelsLabel: string;
		readonly youtubeNote: string;
		readonly twitchNote: string;
		readonly latest: string;
		readonly empty: string;
		readonly goToYoutube: string;
	};
	readonly contact: {
		readonly heading: string;
		readonly description: string;
		readonly lead: string;
		/** 按鈕的 Tooltip 說明：外部連結會開新分頁、Discord 會複製名稱 */
		readonly openTip: string;
		readonly copyTip: string;
		readonly hintBefore: string;
		readonly hintLink: string;
		readonly hintAfter: string;
		readonly copied: string;
		readonly copiedBody: (username: string) => string;
		readonly copyFailed: string;
		readonly copyFailedBody: (username: string) => string;
	};
	readonly blog: {
		readonly heading: string;
		readonly description: string;
		readonly empty: string;
		readonly tagsLabel: string;
		readonly updated: string;
		readonly minutes: (n: number) => string;
		readonly draft: string;
		readonly tagTitle: (tag: string) => string;
		readonly tagDescription: (tag: string) => string;
		readonly toc: string;
		readonly older: string;
		readonly newer: string;
		readonly copy: string;
		readonly copied: string;
		readonly anchor: (heading: string) => string;
		readonly progress: string;
		readonly searchLabel: string;
		readonly searchPlaceholder: string;
		readonly searchEmpty: string;
		readonly searchUnavailable: string;
		readonly searchCount: (n: number) => string;
	};
	readonly enchant: { readonly hint: string; readonly tooltip: string };
	readonly comments: { readonly heading: string; readonly hint: string };
	readonly notFound: {
		readonly title: string;
		readonly heading: string;
		/** 分數前面的文字（含冒號） */
		readonly score: string;
		/** 死亡訊息，{name} 會換成名字 */
		readonly deaths: readonly string[];
		readonly respawn: string;
		readonly titleScreen: string;
	};
	readonly loading: string;
	readonly tooltip: { readonly unlocked: string; readonly locked: string };
	/** 物品欄：格子的名稱，以及使用物品時印在聊天列的訊息 */
	readonly inventory: {
		readonly label: string;
		readonly slot: (item: string, count: number) => string;
		readonly empty: string;
		/** 物品提示框的說明：每種物品的用途 */
		readonly lore: Readonly<Record<GiveItem, string>>;
		readonly durability: (left: number, max: number) => string;
		readonly enchantedLore: string;
		readonly cooldown: string;
		readonly cake: (player: string) => string;
		readonly pickaxe: (player: string) => string;
		readonly pickaxeHint: string;
		readonly enchantments: readonly string[];
		readonly enchantPrompt: string;
		readonly enchanted: (item: string, enchantment: string) => string;
		readonly compass: string;
		readonly redstoneOn: string;
		readonly redstoneOff: string;
		readonly mapTitle: string;
		readonly mapExplored: (explored: number, total: number) => string;
		readonly mapHere: string;
		readonly mapVisited: string;
		readonly mapUnvisited: string;
		readonly mapClose: string;
		readonly beacon: string;
		readonly renamePrompt: string;
		readonly renamed: (name: string) => string;
		readonly horn: (player: string) => string;
		readonly bundle: string;
		readonly xp: (points: number) => string;
		readonly heart: string;
		readonly totemHint: string;
		readonly mapTreasure: string;
		readonly treasureFound: string;
		readonly starterKit: string;
		readonly starterKitHint: string;
		readonly starterKitOpened: string;
	};
	/** 附魔地圖上 X 標記的隱藏頁面：寶箱 */
	readonly treasure: {
		readonly heading: string;
		readonly description: string;
		readonly lead: string;
		readonly chest: string;
		readonly take: (item: string, count: number) => string;
		readonly empty: string;
	};
	readonly advancements: {
		readonly heading: string;
		readonly toast: string;
		/** 隱藏進度達成前顯示的標題與說明 */
		readonly hidden: { readonly title: string; readonly description: string };
		readonly items: Readonly<Record<AdvancementId, { readonly title: string; readonly description: string }>>;
	};
	readonly controls: {
		readonly themeToDark: string;
		readonly themeToLight: string;
		readonly soundOn: string;
		readonly soundOff: string;
		readonly music: string;
		readonly language: string;
		readonly chat: string;
	};
	readonly music: {
		readonly nowPlaying: string;
		readonly stopped: string;
		readonly musicVolume: (percent: number) => string;
		readonly soundVolume: (percent: number) => string;
		/** 開關按鈕顯示目前狀態（同遊戲選項畫面） */
		readonly stateOn: string;
		readonly stateOff: string;
		readonly next: string;
		/** 單曲循環按鈕（顯示目前狀態） */
		readonly loopOn: string;
		readonly loopOff: string;
		readonly unsupportedTitle: string;
		readonly unsupportedBody: string;
	};
	/** Twitch 開台通知 */
	readonly live: { readonly toastTitle: string; readonly toastBody: string; readonly badge: string; readonly splash: string };
	/** 聊天列指令（彩蛋，按 T 或 / 開啟） */
	readonly commands: {
		readonly inputLabel: string;
		/** 訪客在聊天裡的名字 */
		readonly player: string;
		readonly helpTitle: string;
		readonly unknown: (name: string) => string;
		readonly usage: (usage: string) => string;
		readonly helpHint: string;
		readonly failed: string;
		readonly time: Readonly<Record<'day' | 'night', string>>;
		readonly weatherSet: (name: string) => string;
		readonly weatherNow: (name: string) => string;
		readonly weatherNames: Readonly<Record<Weather, string>>;
		readonly gave: (item: string, count: number, player: string) => string;
		readonly giveList: string;
		readonly totemSaved: (player: string) => string;
		readonly items: Readonly<Record<GiveItem, string>>;
		readonly tp: (page: string) => string;
		readonly pages: Readonly<Record<TpPage, string>>;
		readonly music: Readonly<Record<'on' | 'off' | 'next', string>>;
		readonly search: (query: string) => string;
		readonly seed: (seed: number) => string;
		readonly kill: (player: string) => string;
		readonly blownUp: (player: string) => string;
	};
}
