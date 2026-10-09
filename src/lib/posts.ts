import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** 中文約每分鐘 400 字、英文約每分鐘 200 字 */
const CJK_PER_MINUTE = 400;
const WORDS_PER_MINUTE = 200;
const HAN = /\p{Script=Han}/gu;

/** 已發布的文章，新到舊排序。開發模式下也顯示草稿。 */
export async function getPublishedPosts(): Promise<readonly Post[]> {
	const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
	return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** 估計閱讀時間（分鐘，至少 1）。不計程式碼區塊。 */
export function readingMinutes(post: Post): number {
	const text = (post.body ?? '').replace(/```[\s\S]*?```/g, '');
	const han = text.match(HAN)?.length ?? 0;
	const words = text
		.replace(HAN, ' ')
		.split(/\s+/)
		.filter((w) => /[a-z0-9]/i.test(w)).length;
	return Math.max(1, Math.round(han / CJK_PER_MINUTE + words / WORDS_PER_MINUTE));
}

/** 所有標籤與各自的文章數，依文章數多到少排序。 */
export function collectTags(posts: readonly Post[]): readonly { tag: string; count: number }[] {
	const counts = posts
		.flatMap((p) => p.data.tags)
		.reduce<Map<string, number>>((map, tag) => new Map(map).set(tag, (map.get(tag) ?? 0) + 1), new Map());
	return [...counts]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function tagHref(tag: string): string {
	return `/blog/tags/${encodeURIComponent(tag)}/`;
}
