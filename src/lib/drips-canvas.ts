/**
 * 把 drips.ts 的按鈕雨珠、滴水畫到鏡頭 canvas 上。
 * 按鈕清單在換頁（astro:page-load）時重抓，位置每格重新量，捲動時雨珠跟著按鈕走。
 */
import { type DripState, dripOpacity, EMPTY_DRIPS, fadeOut, hangProgress, stepDrips } from './drips';
import type { Random } from './precipitation';

/** 會積雨的按鈕：彩色橫幅與石材按鈕 */
const SURFACE_SELECTOR = '.banner, .mc-btn';
const DRIP_PIXEL = 4;
const WATER_RGB = '215 232 255';

export interface DripLayer {
	step(dt: number, rand: Random): void;
	draw(ctx: CanvasRenderingContext2D): void;
	reset(): void;
}

const snap = (value: number, px: number): number => Math.round(value / px) * px;

function isOnScreen(rect: DOMRect): boolean {
	return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
}

export function createDripLayer(): DripLayer {
	let surfaces: readonly HTMLElement[] = [];
	let rects: readonly DOMRect[] = [];
	let state: DripState = EMPTY_DRIPS;

	const collect = (): void => {
		surfaces = [...document.querySelectorAll<HTMLElement>(SURFACE_SELECTOR)];
		state = EMPTY_DRIPS;
	};
	collect();
	document.addEventListener('astro:page-load', collect);

	return {
		step(dt, rand) {
			rects = surfaces.map((el) => el.getBoundingClientRect());
			state = stepDrips(state, dt, rects.map(isOnScreen), rand);
		},

		draw(ctx) {
			for (const bead of state.beads) {
				const rect = rects[bead.surface];
				if (!rect) continue;
				ctx.fillStyle = `rgb(${WATER_RGB} / ${0.8 * fadeOut(bead.age, bead.life)})`;
				ctx.fillRect(
					snap(rect.left + rect.width * bead.fx, bead.size),
					snap(rect.top + rect.height * bead.fy, bead.size),
					bead.size,
					bead.size,
				);
			}
			for (const drip of state.drips) {
				const rect = rects[drip.surface];
				if (!rect) continue;
				const x = snap(rect.left + rect.width * drip.fx, DRIP_PIXEL);
				const edge = Math.round(rect.bottom);
				// 掛著的時候從一格慢慢拉成兩格長，掉下去後是一格
				const height = drip.fall > 0 ? DRIP_PIXEL : DRIP_PIXEL * (1 + Math.round(hangProgress(drip)));
				ctx.fillStyle = `rgb(${WATER_RGB} / ${0.9 * dripOpacity(drip)})`;
				ctx.fillRect(x, edge + snap(drip.fall, DRIP_PIXEL), DRIP_PIXEL, height);
			}
		},

		reset() {
			state = EMPTY_DRIPS;
		},
	};
}
