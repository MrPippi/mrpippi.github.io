/// <reference types="vitest/config" />
// 用 Astro 的 Vite 設定跑 Vitest，測試裡才能 import 用到 astro:content 等虛擬模組的程式。
import { getViteConfig } from 'astro/config';

export default getViteConfig({
	test: {
		include: ['tests/unit/**/*.test.ts'],
	},
});
