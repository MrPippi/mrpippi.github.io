/**
 * 最新影片的備份。YouTube 常擋掉建置主機（RSS 回 404/500、影片頁要求驗證），抓不到時依序改用：
 * 1. 建置快取 node_modules/.astro/youtube-videos.json：上次在這台主機成功的結果
 *    （withastro/action 會在每次部署之間保留這個資料夾）。
 * 2. 快照 src/data/youtube-videos.json：跟著程式一起 commit。本機建置成功時會自動更新，
 *    內容沒變就不改檔案；有變動時記得一起 commit。
 * 只有抓到至少一支影片才存，空結果不會蓋掉備份。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Video } from './youtube';

export const BUILD_CACHE_FILE = join(process.cwd(), 'node_modules', '.astro', 'youtube-videos.json');
export const SNAPSHOT_FILE = join(process.cwd(), 'src', 'data', 'youtube-videos.json');

interface StoredVideos {
	readonly channelId: string;
	readonly videos: readonly (Omit<Video, 'published'> & { readonly published: string })[];
}

function serialize(channelId: string, videos: readonly Video[]): string {
	const data: StoredVideos = {
		channelId,
		videos: videos.map((v) => ({ ...v, published: v.published.toISOString() })),
	};
	return `${JSON.stringify(data, null, 2)}\n`;
}

/** 存到指定檔案；內容相同時不寫（避免快照每次建置都產生 git 變動） */
export function saveVideos(channelId: string, videos: readonly Video[], file: string): void {
	if (videos.length === 0) return;
	const content = serialize(channelId, videos);
	try {
		if (existsSync(file) && readFileSync(file, 'utf8') === content) return;
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, content);
	} catch (error) {
		console.warn(`[youtube] 無法寫入影片備份 ${file}：${String(error)}`);
	}
}

/** 讀取同一個頻道的備份；沒有備份、頻道不同或檔案損壞時回傳 undefined */
export function loadVideos(channelId: string, file: string): readonly Video[] | undefined {
	try {
		const data = JSON.parse(readFileSync(file, 'utf8')) as Partial<StoredVideos>;
		if (data.channelId !== channelId || !Array.isArray(data.videos) || data.videos.length === 0) return undefined;
		const videos = data.videos.map((v) => ({ ...v, published: new Date(v.published) }));
		if (videos.some((v) => typeof v.id !== 'string' || Number.isNaN(v.published.valueOf()))) return undefined;
		return videos;
	} catch {
		return undefined;
	}
}

/** 成功時同時更新建置快取與快照 */
export function rememberVideos(channelId: string, videos: readonly Video[]): void {
	saveVideos(channelId, videos, BUILD_CACHE_FILE);
	saveVideos(channelId, videos, SNAPSHOT_FILE);
}

/** 失敗時依序找建置快取、快照 */
export function recallVideos(channelId: string): readonly Video[] | undefined {
	for (const [label, file] of [
		['建置快取', BUILD_CACHE_FILE],
		['repo 裡的快照', SNAPSHOT_FILE],
	] as const) {
		const videos = loadVideos(channelId, file);
		if (videos) {
			console.info(`[youtube] 改用${label}的影片（${videos.length} 支）`);
			return videos;
		}
	}
	return undefined;
}
