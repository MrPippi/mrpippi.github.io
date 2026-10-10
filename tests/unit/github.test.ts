import { describe, expect, it } from 'vitest';
import { PORTFOLIO } from '../../src/consts';
import { languageColor, toRepoInfo } from '../../src/lib/github';

describe('toRepoInfo', () => {
	const raw = {
		name: 'AutoPickup',
		html_url: 'https://github.com/MrPippi/AutoPickup',
		language: 'Java',
		stargazers_count: 3,
		pushed_at: '2026-10-09T12:00:00Z',
		homepage: '',
	};

	it('轉換 GitHub API 的 repo 資料', () => {
		expect(toRepoInfo(raw)).toEqual({
			name: 'AutoPickup',
			url: 'https://github.com/MrPippi/AutoPickup',
			language: 'Java',
			stars: 3,
			pushedAt: new Date('2026-10-09T12:00:00Z'),
			homepage: undefined,
		});
	});

	it('缺少必要欄位或格式錯誤時回傳 undefined', () => {
		expect(toRepoInfo(null)).toBeUndefined();
		expect(toRepoInfo({ ...raw, name: undefined })).toBeUndefined();
		expect(toRepoInfo({ ...raw, pushed_at: 'not-a-date' })).toBeUndefined();
	});

	it('沒有語言或星數時給預設值', () => {
		expect(toRepoInfo({ ...raw, language: null, stargazers_count: undefined })).toMatchObject({
			language: undefined,
			stars: 0,
		});
	});
});

describe('languageColor', () => {
	it('常用語言有固定顏色，其他用灰色', () => {
		expect(languageColor('Java')).toBe('#b07219');
		expect(languageColor('Brainfuck')).toBe('#8b8b8b');
		expect(languageColor(undefined)).toBe('#8b8b8b');
	});
});

describe('PORTFOLIO', () => {
	it('每個專案都有中英文介紹與圖示，名稱不重複', () => {
		const names = PORTFOLIO.items.map((i) => i.repo.toLowerCase());
		expect(new Set(names).size).toBe(names.length);
		for (const item of PORTFOLIO.items) {
			expect(item.description['zh-TW']).not.toBe('');
			expect(item.description.en).not.toBe('');
			expect(item.icon).toMatch(/^\/mc\/item\/.+\.png$/);
		}
	});
});
