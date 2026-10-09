import { describe, expect, it } from 'vitest';
import { collectTags, type Post, readingMinutes, tagHref } from '../../src/lib/posts';

/** 測試只需要 body 與 tags，其餘欄位用不到 */
function fakePost(body: string, tags: string[] = []): Post {
	return { id: 'x', body, data: { tags } } as unknown as Post;
}

describe('readingMinutes', () => {
	it('短文至少 1 分鐘', () => {
		expect(readingMinutes(fakePost('嗨'))).toBe(1);
		expect(readingMinutes(fakePost(''))).toBe(1);
	});

	it('中文約每分鐘 400 字', () => {
		expect(readingMinutes(fakePost('字'.repeat(1200)))).toBe(3);
	});

	it('英文約每分鐘 200 字', () => {
		expect(readingMinutes(fakePost(Array.from({ length: 600 }, () => 'word').join(' ')))).toBe(3);
	});

	it('不計算程式碼區塊', () => {
		const code = '```\n' + 'const x = 1;\n'.repeat(2000) + '```';
		expect(readingMinutes(fakePost(`前言${code}`))).toBe(1);
	});
});

describe('collectTags', () => {
	it('依文章數排序，同數量依名稱排序', () => {
		const posts = [fakePost('', ['Astro', 'Minecraft']), fakePost('', ['Minecraft']), fakePost('', ['AI'])];
		expect(collectTags(posts)).toEqual([
			{ tag: 'Minecraft', count: 2 },
			{ tag: 'AI', count: 1 },
			{ tag: 'Astro', count: 1 },
		]);
	});

	it('沒有標籤時回傳空陣列', () => {
		expect(collectTags([fakePost('')])).toEqual([]);
	});
});

describe('tagHref', () => {
	it('中文標籤會編碼', () => {
		expect(tagHref('網站')).toBe('/blog/tags/%E7%B6%B2%E7%AB%99/');
	});
});
