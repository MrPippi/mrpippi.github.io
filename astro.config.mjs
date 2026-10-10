// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://mrpippi.github.io',
	integrations: [sitemap()],
	// CSS 都很小，直接寫進 HTML，省掉會擋住畫面繪製的額外請求
	build: { inlineStylesheets: 'always' },
});
