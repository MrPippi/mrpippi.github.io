/**
 * 建置時從 YouTube RSS 抓最新影片。只要一般影片，不含 Shorts 與直播紀錄：
 * 1. 先抓「一般影片」播放清單（UULF 開頭；UUSH 是 Shorts、UULV 是直播）。
 * 2. 這個清單在 GitHub Actions 主機上常回 404，失敗時改抓整個頻道的 RSS，
 *    再逐支判斷：/shorts/ID 回 200 的是 Shorts，影片頁標示 isLiveContent 的是直播紀錄。
 * 任何失敗（查不到頻道 ID、網路錯誤、格式不符）都回傳空陣列，頁面改顯示「前往頻道」，不讓建置失敗。
 */

export interface Video {
	readonly id: string;
	readonly title: string;
	readonly published: Date;
	readonly url: string;
	readonly thumbnail: string;
}

const CHANNEL_ID = /^UC[\w-]{22}$/;
const VIDEO_ID = /^[\w-]{11}$/;
const ENTRY = /<entry>([\s\S]*?)<\/entry>/g;
const FETCH_TIMEOUT_MS = 8000;
const BROWSER_HEADERS = {
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
	'Accept-Language': 'en',
	// 略過歐盟地區的 cookie 同意頁
	Cookie: 'CONSENT=YES+cb; SOCS=CAI',
} as const;

function tag(xml: string, name: string): string | undefined {
	return new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml)?.[1]?.trim();
}

function decodeEntities(text: string): string {
	return text
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&');
}

function parseEntry(xml: string): Video | undefined {
	const id = tag(xml, 'yt:videoId');
	const title = tag(xml, 'title');
	const published = new Date(tag(xml, 'published') ?? '');
	if (!id || !VIDEO_ID.test(id) || !title || Number.isNaN(published.valueOf())) return undefined;
	return {
		id,
		title: decodeEntities(title),
		published,
		url: `https://www.youtube.com/watch?v=${id}`,
		thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
	};
}

export function parseFeed(xml: string): readonly Video[] {
	return [...xml.matchAll(ENTRY)].map((m) => parseEntry(m[1])).filter((v): v is Video => v !== undefined);
}

/** 頻道 ID（UC…）→ 只含一般影片的播放清單 RSS 網址 */
export function videosOnlyFeedUrl(channelId: string): string {
	return `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${channelId.slice(2)}`;
}

/** 頻道頁 HTML 裡出現頻道 ID 的幾種位置，依可靠程度排序 */
const CHANNEL_ID_PATTERNS: readonly RegExp[] = [
	/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
	/"externalId":"(UC[\w-]{22})"/,
	/<meta itemprop="(?:channelId|identifier)" content="(UC[\w-]{22})"/,
	/"channelId":"(UC[\w-]{22})"/,
];

/** 從頻道頁 HTML 找出頻道 ID */
export function extractChannelId(html: string): string | undefined {
	for (const pattern of CHANNEL_ID_PATTERNS) {
		const id = pattern.exec(html)?.[1];
		if (id) return id;
	}
	return undefined;
}

/** 由頻道網址（例如 https://www.youtube.com/@Mr_Pippi）查出頻道 ID；查不到回傳 undefined。 */
export async function resolveChannelId(channelUrl: string): Promise<string | undefined> {
	try {
		const res = await fetch(channelUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: BROWSER_HEADERS });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const id = extractChannelId(await res.text());
		if (!id) console.warn(`[youtube] 在 ${channelUrl} 找不到頻道 ID`);
		return id;
	} catch (error) {
		console.warn(`[youtube] 查詢頻道 ID 失敗：${String(error)}`);
		return undefined;
	}
}

export function channelFeedUrl(channelId: string): string {
	return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

async function fetchFeed(url: string): Promise<readonly Video[]> {
	const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return parseFeed(await res.text());
}

export type VideoKind = 'video' | 'short' | 'live' | 'unknown';

/** 影片頁 HTML 是否為直播（含直播紀錄）；找不到標記時回傳 undefined */
export function isLiveFromHtml(html: string): boolean | undefined {
	const match = /"isLiveContent":(true|false)/.exec(html);
	return match ? match[1] === 'true' : undefined;
}

/** 判斷一支影片是一般影片、Shorts 還是直播；網路問題等無法判斷時回傳 unknown */
async function classify(videoId: string): Promise<VideoKind> {
	try {
		// Shorts 網址對 Shorts 直接回 200，一般影片會轉址到 /watch
		const shorts = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
			method: 'HEAD',
			redirect: 'manual',
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: BROWSER_HEADERS,
		});
		if (shorts.status === 200) return 'short';

		const watch = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: BROWSER_HEADERS,
		});
		if (!watch.ok) return 'unknown';
		const live = isLiveFromHtml(await watch.text());
		if (live === undefined) return 'unknown';
		return live ? 'live' : 'video';
	} catch {
		return 'unknown';
	}
}

/** 從整個頻道的影片中挑出一般影片（無法判斷的保留，並印出警告） */
async function keepRegularVideos(videos: readonly Video[], limit: number): Promise<readonly Video[]> {
	const kept: Video[] = [];
	for (const video of videos) {
		if (kept.length >= limit) break;
		const kind = await classify(video.id);
		if (kind === 'unknown') console.warn(`[youtube] 無法判斷影片類型，保留：${video.title}（${video.id}）`);
		if (kind === 'video' || kind === 'unknown') kept.push(video);
	}
	return kept;
}

/**
 * 抓最新的一般影片（不含 Shorts 與直播）。channelId 留空時，會先用 channelUrl 自動查出頻道 ID。
 * 查到的 ID 會印在建置紀錄裡，想省掉這一步可以把它填進 src/consts.ts。
 */
export async function fetchLatestVideos(channelId: string, limit: number, channelUrl?: string): Promise<readonly Video[]> {
	const id = channelId || (channelUrl ? await resolveChannelId(channelUrl) : undefined);
	if (!id) return [];
	if (!CHANNEL_ID.test(id)) {
		console.warn(`[youtube] 頻道 ID 格式不正確：${id}`);
		return [];
	}
	try {
		const videos = (await fetchFeed(videosOnlyFeedUrl(id))).slice(0, limit);
		console.info(`[youtube] 頻道 ${id}：從一般影片清單取得 ${videos.length} 支影片`);
		return videos;
	} catch (error) {
		console.warn(`[youtube] 一般影片清單無法使用（${String(error)}），改用頻道 RSS 並過濾 Shorts 與直播`);
	}
	try {
		const videos = await keepRegularVideos(await fetchFeed(channelFeedUrl(id)), limit);
		console.info(`[youtube] 頻道 ${id}：過濾後取得 ${videos.length} 支影片`);
		return videos;
	} catch (error) {
		console.warn(`[youtube] 抓取影片失敗，改顯示頻道連結：${String(error)}`);
		return [];
	}
}
