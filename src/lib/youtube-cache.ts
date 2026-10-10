/**
 * 最新影片的備份：每次成功抓到就存起來，YouTube 擋掉建置主機（常回 404）時改用上次的結果。
 * 存在 node_modules/.astro/ 底下：withastro/action 會在每次部署之間保留這個資料夾，本機也不會進 git。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Video } from './youtube';

export const DEFAULT_CACHE_FILE = join(process.cwd(), 'node_modules', '.astro', 'youtube-videos.json');

interface CacheFile {
	readonly channelId: string;
	readonly savedAt: string;
	readonly videos: readonly (Omit<Video, 'published'> & { readonly published: string })[];
}

export function saveVideos(channelId: string, videos: readonly Video[], file = DEFAULT_CACHE_FILE): void {
	const data: CacheFile = {
		channelId,
		savedAt: new Date().toISOString(),
		videos: videos.map((v) => ({ ...v, published: v.published.toISOString() })),
	};
	try {
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify(data, null, 2));
	} catch (error) {
		console.warn(`[youtube] 無法寫入影片備份：${String(error)}`);
	}
}

/** 讀取同一個頻道上次成功的結果；沒有備份、頻道不同或檔案損壞時回傳 undefined */
export function loadVideos(channelId: string, file = DEFAULT_CACHE_FILE): readonly Video[] | undefined {
	try {
		const data = JSON.parse(readFileSync(file, 'utf8')) as Partial<CacheFile>;
		if (data.channelId !== channelId || !Array.isArray(data.videos)) return undefined;
		const videos = data.videos.map((v) => ({ ...v, published: new Date(v.published) }));
		if (videos.some((v) => typeof v.id !== 'string' || Number.isNaN(v.published.valueOf()))) return undefined;
		console.info(`[youtube] 改用 ${data.savedAt ?? '先前'} 的影片備份（${videos.length} 支）`);
		return videos;
	} catch {
		return undefined;
	}
}
