/**
 * 建置時從 YouTube RSS 抓最新影片。只抓一般影片，不含 Shorts 與直播紀錄
 * （YouTube 每個頻道都有 UULF 開頭的「一般影片」播放清單，UUSH 是 Shorts、UULV 是直播）。
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
		const res = await fetch(channelUrl, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
				'Accept-Language': 'en',
				// 略過歐盟地區的 cookie 同意頁
				Cookie: 'CONSENT=YES+cb; SOCS=CAI',
			},
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const id = extractChannelId(await res.text());
		if (!id) console.warn(`[youtube] 在 ${channelUrl} 找不到頻道 ID`);
		return id;
	} catch (error) {
		console.warn(`[youtube] 查詢頻道 ID 失敗：${String(error)}`);
		return undefined;
	}
}

/**
 * 抓最新影片。channelId 留空時，會先用 channelUrl 自動查出頻道 ID。
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
		const res = await fetch(videosOnlyFeedUrl(id), {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const videos = parseFeed(await res.text()).slice(0, limit);
		console.info(`[youtube] 頻道 ${id}：取得 ${videos.length} 支影片`);
		return videos;
	} catch (error) {
		console.warn(`[youtube] 抓取影片失敗，改顯示頻道連結：${String(error)}`);
		return [];
	}
}
