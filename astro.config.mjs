// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://mrpippi.github.io',
	// 寶藏頁是彩蛋，不放進 sitemap
	integrations: [sitemap({ filter: (page) => !page.includes('/treasure/') })],
	// CSS 都很小，直接寫進 HTML，省掉會擋住畫面繪製的額外請求
	build: { inlineStylesheets: 'always' },
});
