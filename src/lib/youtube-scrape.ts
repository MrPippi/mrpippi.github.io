/**
 * 備援來源：直接讀頻道的「影片」分頁。這個分頁本來就只列一般影片（Shorts、直播各有自己的分頁），
 * 再到每支影片的頁面讀標題與發布日期。YouTube 的 RSS 不穩定時用這個。
 */

const VIDEO_ID_IN_PAGE = /"videoId":"([\w-]{11})"/g;

export interface WatchPageInfo {
	readonly title: string;
	readonly published: Date;
	readonly live: boolean;
}

export function decodeEntities(text: string): string {
	return text
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
		.replace(/&amp;/g, '&');
}

/** 頻道「影片」分頁 HTML 裡的影片 ID，依出現順序、不重複 */
export function extractVideoIds(html: string): readonly string[] {
	return [...new Set([...html.matchAll(VIDEO_ID_IN_PAGE)].map((m) => m[1]))];
}

/** 從影片頁 HTML 讀出標題、發布日期與是否為直播；缺少必要資訊時回傳 undefined */
export function parseWatchPage(html: string): WatchPageInfo | undefined {
	const title = /<meta name="title" content="([^"]*)"/.exec(html)?.[1];
	const date =
		/<meta itemprop="datePublished" content="([^"]+)"/.exec(html)?.[1] ?? /"publishDate":"([^"]+)"/.exec(html)?.[1];
	const published = new Date(date ?? '');
	if (!title || Number.isNaN(published.valueOf())) return undefined;
	return {
		title: decodeEntities(title),
		published,
		live: /"isLiveContent":true/.test(html),
	};
}
