// 和語言無關的網站資料（網址、帳號、圖示）。
// 顯示在畫面上的文字都在 src/i18n/zh-TW.ts（中文）與 src/i18n/en.ts（英文）。
import type { Lang } from './i18n/config';
import type { SkillKey } from './i18n/types';

export const PROFILE = {
	handle: 'MrPippi',
	avatar: 'https://github.com/MrPippi.png',
} as const;

export interface SkillRow {
	/** 對應翻譯檔 about.skills 的標籤 */
	readonly key: SkillKey;
	readonly value: string;
	/** public/mc/item/ 下的物品圖 */
	readonly icon: string;
}

export const SKILLS: readonly SkillRow[] = [
	{ key: 'plugins', value: 'Java · Paper API · Gradle', icon: '/mc/item/diamond_pickaxe.png' },
	{ key: 'web', value: 'TypeScript · React · Vite · Astro', icon: '/mc/item/map.png' },
	{ key: 'deploy', value: 'Cloudflare Pages / D1 · GitHub Pages', icon: '/mc/item/ender_pearl.png' },
	{ key: 'ai', value: 'Python · Claude API · Claude Code · GitHub Actions', icon: '/mc/item/redstone.png' },
];

/** 關於我頁面的附魔書：以附魔台文字顯示，點一下才看得懂（只能用英文字母） */
export const ENCHANTED_MESSAGE = 'thanks for stopping by now go touch some grass';

export const YOUTUBE = {
	url: 'https://www.youtube.com/@Mr_Pippi',
	/**
	 * 頻道 ID（UC 開頭），用來在建置時抓最新影片 RSS。
	 * 留空時會在建置時從上面的 url 自動查出來（建置紀錄會印出查到的 ID，可以貼回這裡省掉查詢）。
	 * 自己查：YouTube → 設定 → 進階設定，或 https://www.youtube.com/account_advanced
	 */
	channelId: 'UCdcUpJOFIJWQxrKKCONv4wg',
	latestCount: 6,
} as const;

export const TWITCH = {
	url: 'https://www.twitch.tv/mr_pippi',
	handle: 'mr_pippi',
} as const;

export interface PortfolioItem {
	/** GitHub repo 名稱（只放公開 repo，私人 repo 訪客點進去會是 404） */
	readonly repo: string;
	/** public/mc/item/ 下的物品圖 */
	readonly icon: string;
	/** 網站上顯示的介紹；GitHub 上的描述太短或只有英文時用這個 */
	readonly description: Readonly<Record<Lang, string>>;
}

/**
 * 作品集：依這個順序顯示。語言、星數、更新時間在建置時從 GitHub API 抓。
 * 新增專案時加一筆即可（記得執行 npm run mc-assets 確認圖示存在）。
 */
export const PORTFOLIO = {
	owner: 'MrPippi',
	items: [
		{
			repo: 'MJP-Paper-Skills',
			icon: '/mc/item/knowledge_book.png',
			description: {
				'zh-TW': '給 Claude 用的 Minecraft Paper 插件開發技能集，附線上文件網站。',
				en: 'Claude skills for building Minecraft Paper plugins, with a documentation site.',
			},
		},
	] satisfies readonly PortfolioItem[],
} as const;

/**
 * Cloudflare Web Analytics（免費、不用 cookie）。
 * 到 Cloudflare 後台 → Analytics & Logs → Web Analytics → Add a site，輸入網址後複製 token 貼在這裡。
 * token 本來就會出現在公開網頁上，不是機密。留空表示不載入分析。
 */
export const ANALYTICS = {
	cloudflareToken: '',
} as const;

/**
 * 文章留言（giscus）：留言存在這個 repo 的 GitHub Discussions，訪客用 GitHub 帳號登入留言。
 * 需要先安裝 giscus App：https://github.com/apps/giscus （選擇只給這個 repo）。
 * ID 由 GitHub API 查得；category 用 Announcements：只有站長與 giscus 能開新討論串。
 */
export const GISCUS = {
	repo: 'MrPippi/mrpippi.github.io',
	repoId: 'R_kgDOSQwe9w',
	category: 'Announcements',
	categoryId: 'DIC_kwDOSQwe984DHd7E',
} as const;

export const DISCORD = {
	username: 'mr__pippi',
	profileUrl: 'https://discord.com/users/608176040279539712',
} as const;

export type BrandIcon = 'github' | 'youtube' | 'twitch' | 'discord' | 'mail';

export interface ContactLink {
	readonly label: string;
	readonly href: string;
	readonly icon: BrandIcon;
	/** 橫幅按鈕顏色 */
	readonly tone: 'green' | 'teal' | 'yellow' | 'purple' | 'red' | 'blurple' | 'gray';
	/** 橫幅副標：統一只放帳號名稱（@handle），其他說明放 Tooltip */
	readonly sub: string;
}

// 想公開 Email 的話再加：{ label: 'Email', href: 'mailto:<you>@example.com', icon: 'mail', tone: 'teal', sub: '<you>@example.com' },
export const CONTACTS: readonly ContactLink[] = [
	{ label: 'GitHub', href: 'https://github.com/MrPippi', icon: 'github', tone: 'gray', sub: '@MrPippi' },
	{ label: 'YouTube', href: YOUTUBE.url, icon: 'youtube', tone: 'red', sub: '@Mr_Pippi' },
	{ label: 'Twitch', href: TWITCH.url, icon: 'twitch', tone: 'purple', sub: `@${TWITCH.handle}` },
];
