import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadVideos, saveVideos } from '../../src/lib/youtube-cache';
import type { Video } from '../../src/lib/youtube';

const dir = mkdtempSync(join(tmpdir(), 'yt-cache-'));
const file = join(dir, 'videos.json');
const CHANNEL = 'UCdcUpJOFIJWQxrKKCONv4wg';
const video: Video = {
	id: '_KhP3Sl5Ed0',
	title: '甜甜圈｜歌唱大師',
	published: new Date('2026-03-24T16:00:00Z'),
	url: 'https://www.youtube.com/watch?v=_KhP3Sl5Ed0',
	thumbnail: 'https://i.ytimg.com/vi/_KhP3Sl5Ed0/mqdefault.jpg',
};

afterEach(() => rmSync(file, { force: true }));

describe('影片備份', () => {
	it('存起來再讀回來，日期還原成 Date', () => {
		saveVideos(CHANNEL, [video], file);
		expect(loadVideos(CHANNEL, file)).toEqual([video]);
	});

	it('不同頻道的備份不使用', () => {
		saveVideos(CHANNEL, [video], file);
		expect(loadVideos('UCzzzzzzzzzzzzzzzzzzzzzz', file)).toBeUndefined();
	});

	it('沒有備份或檔案損壞時回傳 undefined', () => {
		expect(loadVideos(CHANNEL, file)).toBeUndefined();
		writeFileSync(file, '{not json');
		expect(loadVideos(CHANNEL, file)).toBeUndefined();
	});
});
