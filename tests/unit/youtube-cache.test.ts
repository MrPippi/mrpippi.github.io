import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Video } from '../../src/lib/youtube';
import { loadVideos, saveVideos } from '../../src/lib/youtube-cache';

const dir = mkdtempSync(join(tmpdir(), 'yt-cache-'));
const file = join(dir, 'videos.json');
const CHANNEL = 'UCdcUpJOFIJWQxrKKCONv4wg';
const video: Video = {
	id: '_KhP3Sl5Ed0',
	title: '甜甜圈｜歌唱大師',
	published: new Date('2026-03-24T19:43:45Z'),
	url: 'https://www.youtube.com/watch?v=_KhP3Sl5Ed0',
	thumbnail: 'https://i.ytimg.com/vi/_KhP3Sl5Ed0/mqdefault.jpg',
};

afterEach(() => rmSync(file, { force: true }));

describe('影片備份', () => {
	it('存起來再讀回來，日期還原成 Date', () => {
		saveVideos(CHANNEL, [video], file);
		expect(loadVideos(CHANNEL, file)).toEqual([video]);
	});

	it('空結果不寫入、不蓋掉既有備份', () => {
		saveVideos(CHANNEL, [], file);
		expect(existsSync(file)).toBe(false);
		saveVideos(CHANNEL, [video], file);
		saveVideos(CHANNEL, [], file);
		expect(loadVideos(CHANNEL, file)).toEqual([video]);
	});

	it('內容相同時不重寫檔案（快照不會每次建置都變動）', () => {
		saveVideos(CHANNEL, [video], file);
		const before = statSync(file).mtimeMs;
		const content = readFileSync(file, 'utf8');
		saveVideos(CHANNEL, [video], file);
		expect(statSync(file).mtimeMs).toBe(before);
		expect(readFileSync(file, 'utf8')).toBe(content);
	});

	it('不同頻道、沒有備份或檔案損壞時回傳 undefined', () => {
		expect(loadVideos(CHANNEL, file)).toBeUndefined();
		saveVideos(CHANNEL, [video], file);
		expect(loadVideos('UCzzzzzzzzzzzzzzzzzzzzzz', file)).toBeUndefined();
		writeFileSync(file, '{not json');
		expect(loadVideos(CHANNEL, file)).toBeUndefined();
	});
});
