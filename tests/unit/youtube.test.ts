import { describe, expect, it } from 'vitest';
import { extractChannelId, parseFeed } from '../../src/lib/youtube';

const entry = (id: string, title: string, published: string) => `
	<entry>
		<id>yt:video:${id}</id>
		<yt:videoId>${id}</yt:videoId>
		<title>${title}</title>
		<published>${published}</published>
	</entry>`;

describe('parseFeed', () => {
	it('解析影片並還原 HTML 實體', () => {
		const xml = `<feed>${entry('abcdefghijk', 'Tom &amp; Jerry &lt;3', '2026-10-01T12:00:00+00:00')}</feed>`;
		const [video] = parseFeed(xml);
		expect(video).toMatchObject({
			id: 'abcdefghijk',
			title: 'Tom & Jerry <3',
			url: 'https://www.youtube.com/watch?v=abcdefghijk',
			thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
		});
		expect(video.published.toISOString()).toBe('2026-10-01T12:00:00.000Z');
	});

	it('略過格式不正確的項目', () => {
		const xml = `<feed>
			${entry('bad id!', 'Bad', '2026-10-01T00:00:00Z')}
			${entry('abcdefghijk', 'No date', 'not-a-date')}
			${entry('ABCDEFGHIJK', 'Good', '2026-10-02T00:00:00Z')}
		</feed>`;
		expect(parseFeed(xml).map((v) => v.title)).toEqual(['Good']);
	});

	it('空的或不是 RSS 的內容回傳空陣列', () => {
		expect(parseFeed('')).toEqual([]);
		expect(parseFeed('<html>error</html>')).toEqual([]);
	});
});

describe('extractChannelId', () => {
	const ID = 'UCabcdefghijklmnopqrstuv';

	it('從 canonical 連結取出頻道 ID', () => {
		expect(extractChannelId(`<link rel="canonical" href="https://www.youtube.com/channel/${ID}">`)).toBe(ID);
	});

	it('從頁面資料的 externalId 或 channelId 取出', () => {
		expect(extractChannelId(`{"externalId":"${ID}","title":"x"}`)).toBe(ID);
		expect(extractChannelId(`{"channelId":"${ID}"}`)).toBe(ID);
	});

	it('canonical 優先於頁面裡其他頻道的 channelId', () => {
		const other = 'UCzzzzzzzzzzzzzzzzzzzzzz';
		const html = `{"channelId":"${other}"}<link rel="canonical" href="https://www.youtube.com/channel/${ID}">`;
		expect(extractChannelId(html)).toBe(ID);
	});

	it('找不到或格式不對時回傳 undefined', () => {
		expect(extractChannelId('<html>consent</html>')).toBeUndefined();
		expect(extractChannelId('{"channelId":"UCshort"}')).toBeUndefined();
	});
});
