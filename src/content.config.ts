import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// 在 src/content/blog/ 放 .md 檔就會成為一篇文章。
	loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		draft: z.boolean().default(false),
		/** 標籤，例如 ['Minecraft', '插件']；會產生 /blog/tags/<標籤>/ 頁面 */
		tags: z.array(z.string().trim().min(1)).default([]),
	}),
});

export const collections = { blog };
