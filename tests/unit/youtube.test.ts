import { describe, expect, it } from 'vitest';
import { parseFeed } from '../../src/lib/youtube';

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
