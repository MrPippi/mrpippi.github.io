import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import type { Dictionary } from '../../src/i18n/types';
import { zhTW } from '../../src/i18n/zh-TW';
import { ADVANCEMENTS } from '../../src/lib/advancements';

/** 列出物件所有葉節點的路徑與型別，用來比對兩個翻譯檔形狀一致 */
function shape(value: unknown, path = ''): string[] {
	if (Array.isArray(value)) return [`${path}:array`];
	if (typeof value === 'object' && value !== null) {
		return Object.entries(value).flatMap(([key, child]) => shape(child, path ? `${path}.${key}` : key));
	}
	return [`${path}:${typeof value}`];
}

const DICTS: Record<string, Dictionary> = { 'zh-TW': zhTW, en };

describe('翻譯檔', () => {
	it('中英文欄位完全一致', () => {
		expect(shape(en).sort()).toEqual(shape(zhTW).sort());
	});

	it.each(Object.entries(DICTS))('%s：沒有空字串', (_, dict) => {
		const empty = (value: unknown, path: string): string[] => {
			if (typeof value === 'string') return value.trim() === '' ? [path] : [];
			if (typeof value !== 'object' || value === null) return [];
			return Object.entries(value).flatMap(([k, v]) => empty(v, `${path}.${k}`));
		};
		expect(empty(dict, '')).toEqual([]);
	});

	it.each(Object.entries(DICTS))('%s：標語至少一句、文字函式回傳字串', (_, dict) => {
		expect(dict.splashes.length).toBeGreaterThan(0);
		expect(dict.blog.minutes(3)).toContain('3');
		expect(dict.music.musicVolume(42)).toContain('42');
		expect(dict.contact.copiedBody('someone')).toContain('someone');
	});

	it.each(Object.entries(DICTS))('%s：每個進度都有標題與說明', (_, dict) => {
		for (const { id } of ADVANCEMENTS) {
			expect(dict.advancements.items[id].title).not.toBe('');
			expect(dict.advancements.items[id].description).not.toBe('');
		}
	});
});
