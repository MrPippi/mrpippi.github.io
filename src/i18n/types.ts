/** 每個語系的翻譯檔都要符合這個形狀；新增字串時兩個檔案都要補上。 */
import type { GiveItem, TpPage } from '../lib/commands';
import type { Weather } from '../lib/weather';

export type SkillKey = 'plugins' | 'web' | 'deploy' | 'ai';
export type AdvancementId = 'welcome' | 'explorer' | 'dj' | 'night-owl' | 'social' | 'enchanter' | 'reader' | 'lost' | 'commander';

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
	readonly advancements: {
		readonly heading: string;
		readonly toast: string;
		readonly items: Readonly<Record<AdvancementId, { readonly title: string; readonly description: string }>>;
	};
	readonly controls: {
		readonly themeToDark: string;
		readonly themeToLight: string;
		readonly soundOn: string;
		readonly soundOff: string;
		readonly music: string;
		readonly language: string;
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
		readonly gave: (item: string, player: string) => string;
		readonly items: Readonly<Record<GiveItem, string>>;
		readonly tp: (page: string) => string;
		readonly pages: Readonly<Record<TpPage, string>>;
		readonly music: Readonly<Record<'on' | 'off' | 'next', string>>;
		readonly search: (query: string) => string;
		readonly seed: (seed: number) => string;
		readonly kill: (player: string) => string;
	};
}
