import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { t } from '../i18n';
import { getPublishedPosts } from '../lib/posts';

export async function GET(context: APIContext) {
	if (!context.site) {
		throw new Error('RSS 需要在 astro.config.mjs 設定 `site`');
	}

	const posts = await getPublishedPosts();
	// 文章只有中文
	const site = t('zh-TW').site;
	return rss({
		title: site.title,
		description: site.description,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/blog/${post.id}/`,
		})),
		customData: '<language>zh-TW</language>',
	});
}
