/** 每個語系的翻譯檔都要符合這個形狀；新增字串時兩個檔案都要補上。 */

export type SkillKey = 'plugins' | 'web' | 'deploy' | 'ai';
export type AdvancementId = 'welcome' | 'explorer' | 'dj' | 'night-owl' | 'social' | 'enchanter' | 'reader';

export interface Dictionary {
	readonly site: { readonly title: string; readonly description: string; readonly titleSuffix: string };
	readonly profile: { readonly name: string; readonly tagline: string; readonly location: string };
	readonly splashes: readonly string[];
	readonly menu: {
		readonly label: string;
		readonly about: { readonly title: string; readonly sub: string };
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
		readonly discordSub: (username: string) => string;
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
	};
	readonly enchant: { readonly hint: string };
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
		readonly unsupportedTitle: string;
		readonly unsupportedBody: string;
	};
}
