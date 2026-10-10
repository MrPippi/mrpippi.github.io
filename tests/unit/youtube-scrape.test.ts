import { describe, expect, it } from 'vitest';
import { decodeEntities, extractVideoIds, parseWatchPage } from '../../src/lib/youtube-scrape';

describe('extractVideoIds', () => {
	it('依出現順序取出不重複的影片 ID', () => {
		const html = '{"videoId":"_KhP3Sl5Ed0"}...{"videoId":"abcdefghijk"}...{"videoId":"_KhP3Sl5Ed0"}';
		expect(extractVideoIds(html)).toEqual(['_KhP3Sl5Ed0', 'abcdefghijk']);
	});

	it('沒有影片時回傳空陣列', () => {
		expect(extractVideoIds('<html></html>')).toEqual([]);
	});
});

describe('parseWatchPage', () => {
	const page = (extra = '') =>
		`<meta name="title" content="甜甜圈｜歌唱大師 &amp; 朋友"><meta itemprop="datePublished" content="2026-03-24T12:43:45-07:00">${extra}`;

	it('讀出標題（還原 HTML 實體）、發布日期與是否為直播', () => {
		expect(parseWatchPage(page('"isLiveContent":false'))).toEqual({
			title: '甜甜圈｜歌唱大師 & 朋友',
			published: new Date('2026-03-24T19:43:45Z'),
			live: false,
		});
		expect(parseWatchPage(page('"isLiveContent":true'))?.live).toBe(true);
	});

	it('沒有 datePublished 時改用 publishDate', () => {
		const html = '<meta name="title" content="x">"publishDate":"2026-01-02T00:00:00Z"';
		expect(parseWatchPage(html)?.published.toISOString()).toBe('2026-01-02T00:00:00.000Z');
	});

	it('缺少標題或日期時回傳 undefined', () => {
		expect(parseWatchPage('<html>consent</html>')).toBeUndefined();
		expect(parseWatchPage('<meta name="title" content="x">')).toBeUndefined();
	});
});

describe('decodeEntities', () => {
	it('還原常見與數字實體', () => {
		expect(decodeEntities('A &amp; B &lt;3 &#39;hi&#39; &#20013;')).toBe("A & B <3 'hi' 中");
	});
});
