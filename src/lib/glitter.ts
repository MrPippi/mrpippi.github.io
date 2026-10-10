/**
 * 按鈕上的閃光：每隔一陣子，在畫面內隨機挑一個按鈕、隨機位置冒出一顆原版閃光粒子
 * （glitter_7 → glitter_0，由大變小），播完就消失。粒子在文字後方。
 * 減少動態效果或分頁在背景時不產生。
 */

const BANNERS = '.banner:not(:disabled)';
/** 平均多久冒一顆（實際是這個的 0.5–1.5 倍） */
const INTERVAL_MS = 900;
/** 一顆播多久（8 格，每格約 0.3 秒） */
const LIFE_MS = 2400;
/** 同一個按鈕上最多同時幾顆 */
const MAX_PER_BANNER = 2;

let timer = 0;

function visibleBanners(): readonly HTMLElement[] {
	const height = window.innerHeight;
	return [...document.querySelectorAll<HTMLElement>(BANNERS)].filter((banner) => {
		const rect = banner.getBoundingClientRect();
		const crowded = banner.querySelectorAll('.glitter').length >= MAX_PER_BANNER;
		return !crowded && rect.bottom > 0 && rect.top < height && rect.width > 0;
	});
}

function spawn(): void {
	const banners = visibleBanners();
	const banner = banners[Math.floor(Math.random() * banners.length)];
	if (!banner) return;
	const glitter = document.createElement('span');
	glitter.className = 'glitter';
	glitter.setAttribute('aria-hidden', 'true');
	// 避開左邊的大圖示，其他地方都可以（包含文字後面）
	glitter.style.left = `${20 + Math.random() * 75}%`;
	glitter.style.top = `${10 + Math.random() * 70}%`;
	banner.append(glitter);
	glitter
		.animate([{ backgroundPosition: '0% 0' }, { backgroundPosition: '100% 0' }], {
			duration: LIFE_MS,
			easing: 'steps(8, jump-none)',
		})
		.finished.catch(() => undefined)
		.finally(() => glitter.remove());
}

function schedule(): void {
	window.clearTimeout(timer);
	timer = window.setTimeout(
		() => {
			if (!document.hidden) spawn();
			schedule();
		},
		INTERVAL_MS * (0.5 + Math.random()),
	);
}

export function initGlitter(): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	schedule();
}
