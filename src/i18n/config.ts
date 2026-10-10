/**
 * 語系設定。中文是預設語系（網址不加前綴），英文在 /en/ 底下。
 * 文章只有中文，所以英文版只有標題畫面、關於我、作品集、直播 & 影片、聯絡五頁。
 */

export const LANGS = ['zh-TW', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'zh-TW';

/** <html lang> 的值 */
export const HTML_LANG: Record<Lang, string> = { 'zh-TW': 'zh-Hant-TW', en: 'en' };
/** 日期格式用的 locale */
export const DATE_LOCALE: Record<Lang, string> = { 'zh-TW': 'zh-TW', en: 'en-US' };
/** 日期一律用台灣時間顯示，不受建置主機時區影響（GitHub Actions 是 UTC） */
export const TIME_ZONE = 'Asia/Taipei';
export const OG_LOCALE: Record<Lang, string> = { 'zh-TW': 'zh_TW', en: 'en_US' };

/** 兩種語言都有的頁面（不含語系前綴） */
export const BILINGUAL_PATHS: readonly string[] = ['/', '/about/', '/portfolio/', '/media/', '/contact/', '/treasure/'];

const EN_PREFIX = '/en';

export function langFromPath(pathname: string): Lang {
	return pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`) ? 'en' : 'zh-TW';
}

/** 去掉語系前綴：/en/about/ → /about/ */
export function stripLang(pathname: string): string {
	if (langFromPath(pathname) !== 'en') return pathname;
	const rest = pathname.slice(EN_PREFIX.length);
	return rest.startsWith('/') ? rest : `/${rest}`;
}

/** 加上語系前綴：('/about/', 'en') → /en/about/ */
export function localizePath(path: string, lang: Lang): string {
	const base = stripLang(path);
	return lang === 'en' ? `${EN_PREFIX}${base}` : base;
}

/** 切換語言時要去的網址：對方語言沒有這頁就回標題畫面。 */
export function switchLangPath(pathname: string, to: Lang): string {
	const base = stripLang(pathname.endsWith('/') ? pathname : `${pathname}/`);
	return localizePath(BILINGUAL_PATHS.includes(base) ? base : '/', to);
}

/** 給 [...lang] 動態路由的 getStaticPaths：中文是根目錄（lang 為 undefined），英文是 /en/。 */
export function langStaticPaths(): { params: { lang: string | undefined } }[] {
	return LANGS.map((lang) => ({ params: { lang: lang === DEFAULT_LANG ? undefined : 'en' } }));
}

/** 瀏覽器端：從 <html lang> 判斷目前語系 */
export function langFromDocument(): Lang {
	return document.documentElement.lang.startsWith('en') ? 'en' : 'zh-TW';
}
