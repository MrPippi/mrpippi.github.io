/**
 * 把 precipitation.ts 的雨雪畫到 <canvas>：
 * - 背景 canvas（天空裡）：雨絲、雪花。
 * - 鏡頭 canvas（蓋在內容上，不擋滑鼠）：打在畫面上的水滴，以及按鈕上的雨珠與滴水（drips-canvas.ts）。
 * 一律對齊像素格、不做平滑，看起來跟遊戲一樣是方塊像素。
 * 「減少動態效果」時不畫（CSS 也會把 canvas 藏起來）；天氣放晴時停止動畫迴圈。
 */
import { createDripLayer } from './drips-canvas';
import {
	type LensDrop,
	type PrecipKind,
	type Size,
	type World,
	createWorld,
	lensOpacity,
	stepWorld,
} from './precipitation';

/** 原版雨的顏色（rain.png） */
const RAIN_RGB = '110 145 235';
const SNOW_RGB = '255 255 255';
/** 太久沒畫（切到別的分頁）回來時，不要一次跳太遠 */
const MAX_DT = 0.05;

export interface PrecipitationController {
	setKind(kind: PrecipKind | undefined): void;
}

const snap = (value: number, px: number): number => Math.round(value / px) * px;

/** canvas 跟著視窗大小，用裝置像素比畫才清楚 */
function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Size {
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	const dpr = window.devicePixelRatio || 1;
	const pixelWidth = Math.round(width * dpr);
	const pixelHeight = Math.round(height * dpr);
	if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
	}
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.imageSmoothingEnabled = false;
	return { width, height };
}

/** 雨絲：一格格方塊像素往下疊，上淡下濃的那種最上面幾乎透明；整條亮的每隔幾格稍微暗一點，像原版材質 */
function drawRain(ctx: CanvasRenderingContext2D, world: World): void {
	for (const drop of world.drops) {
		const { pixel } = drop;
		const texels = Math.max(1, Math.round(drop.length / pixel));
		const alpha = 0.35 + drop.depth * 0.5;
		const x = snap(drop.x, pixel);
		const top = snap(drop.y, pixel);
		for (let i = 0; i < texels; i += 1) {
			const strength = drop.fade ? 0.12 + (0.88 * (i + 1)) / texels : i % 3 === 1 ? 0.75 : 1;
			ctx.fillStyle = `rgb(${RAIN_RGB} / ${alpha * strength})`;
			ctx.fillRect(x, top + i * pixel, pixel, pixel);
		}
	}
}

function drawSnow(ctx: CanvasRenderingContext2D, world: World): void {
	for (const flake of world.drops) {
		const size = Math.max(2, Math.round(flake.length));
		const sway = Math.sin(world.time * 1.2 + flake.phase) * (8 + flake.depth * 24);
		ctx.fillStyle = `rgb(${SNOW_RGB} / ${0.55 + flake.depth * 0.45})`;
		ctx.fillRect(snap(flake.x + sway, 2), snap(flake.y, 2), size, size);
	}
}

/** 鏡頭水滴：一格方塊像素；往下滑的在上面留一道同樣寬、比較淡的水痕 */
function drawLensDrop(ctx: CanvasRenderingContext2D, drop: LensDrop): void {
	const side = drop.size;
	const opacity = lensOpacity(drop);
	const x = snap(drop.x, side);
	const y = snap(drop.y, side);
	const trail = snap(Math.min(drop.travelled, 200), side);
	if (trail > 0) {
		ctx.fillStyle = `rgb(200 220 255 / ${0.2 * opacity})`;
		ctx.fillRect(x, y - trail, side, trail);
	}
	ctx.fillStyle = `rgb(200 220 255 / ${0.6 * opacity})`;
	ctx.fillRect(x, y, side, side);
}

export function mountPrecipitation(sky: HTMLCanvasElement, lens: HTMLCanvasElement): PrecipitationController {
	const skyCtx = sky.getContext('2d');
	const lensCtx = lens.getContext('2d');
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const drips = createDripLayer();
	let world: World | undefined;
	let wanted: PrecipKind | undefined;
	let frame = 0;
	let last = 0;

	const clear = (): void => {
		skyCtx?.clearRect(0, 0, sky.width, sky.height);
		lensCtx?.clearRect(0, 0, lens.width, lens.height);
	};

	const tick = (now: number): void => {
		if (!skyCtx || !lensCtx || !world) return;
		const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
		last = now;
		const size = fitCanvas(sky, skyCtx);
		fitCanvas(lens, lensCtx);
		world = stepWorld(world, dt, size, Math.random);
		if (world.kind === 'rain') drips.step(dt, Math.random);

		skyCtx.clearRect(0, 0, size.width, size.height);
		lensCtx.clearRect(0, 0, size.width, size.height);
		if (world.kind === 'rain') drawRain(skyCtx, world);
		else drawSnow(skyCtx, world);
		world.lens.forEach((drop) => drawLensDrop(lensCtx, drop));
		if (world.kind === 'rain') drips.draw(lensCtx);
		frame = requestAnimationFrame(tick);
	};

	const apply = (): void => {
		cancelAnimationFrame(frame);
		frame = 0;
		const kind = reducedMotion.matches ? undefined : wanted;
		if (!kind || !skyCtx || !lensCtx) {
			world = undefined;
			drips.reset();
			clear();
			return;
		}
		if (world?.kind !== kind) world = createWorld(kind, fitCanvas(sky, skyCtx), Math.random);
		last = performance.now();
		frame = requestAnimationFrame(tick);
	};

	reducedMotion.addEventListener('change', apply);
	return {
		setKind(kind) {
			if (kind === wanted && (frame !== 0 || !kind)) return;
			wanted = kind;
			apply();
		},
	};
}
