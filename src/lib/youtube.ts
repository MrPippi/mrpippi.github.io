/**
 * 建置時從 YouTube 頻道 RSS 抓最新影片。
 * 任何失敗（沒設定頻道 ID、網路錯誤、格式不符）都回傳空陣列，頁面改顯示「前往頻道」，不讓建置失敗。
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

export async function fetchLatestVideos(channelId: string, limit: number): Promise<readonly Video[]> {
	if (!channelId) return [];
	if (!CHANNEL_ID.test(channelId)) {
		console.warn(`[youtube] 頻道 ID 格式不正確：${channelId}`);
		return [];
	}
	try {
		const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return parseFeed(await res.text()).slice(0, limit);
	} catch (error) {
		console.warn(`[youtube] 抓取影片失敗，改顯示頻道連結：${String(error)}`);
		return [];
	}
}
