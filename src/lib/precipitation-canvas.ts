/**
 * 把 precipitation.ts 的雨雪畫到 <canvas>：
 * - 背景 canvas（天空裡）：雨絲、水花、雪花。
 * - 鏡頭 canvas（蓋在內容上，不擋滑鼠）：打在畫面上的水滴。
 * 一律對齊像素格、不做平滑，看起來跟遊戲一樣是方塊像素。
 * 「減少動態效果」時不畫（CSS 也會把 canvas 藏起來）；天氣放晴時停止動畫迴圈。
 */
import {
	type LensDrop,
	type PrecipKind,
	type Size,
	type World,
	createWorld,
	lensOpacity,
	SPLASH_FRAMES,
	splashFrame,
	stepWorld,
} from './precipitation';

/** 原版雨的顏色（rain.png） */
const RAIN_RGB = '120 150 225';
const SNOW_RGB = '255 255 255';
/** 太久沒畫（切到別的分頁）回來時，不要一次跳太遠 */
const MAX_DT = 0.05;
/** 原版水花材質：8×8，水花在最下面兩列 */
const SPLASH_TEXTURE = 8;
const SPLASH_IMAGES = Array.from({ length: SPLASH_FRAMES }, (_, i) => `/mc/particle/splash_${i}.png`);

export interface PrecipitationController {
	setKind(kind: PrecipKind | undefined): void;
}

const snap = (value: number, px: number): number => Math.round(value / px) * px;

function loadSplashImages(): readonly HTMLImageElement[] {
	return SPLASH_IMAGES.map((src) => {
		const img = new Image();
		img.src = src;
		return img;
	});
}

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

/** 雨絲：上淡下濃的三段，寬 2~3 px */
function drawRain(ctx: CanvasRenderingContext2D, world: World): void {
	for (const drop of world.drops) {
		const px = drop.depth > 0.55 ? 3 : 2;
		const alpha = 0.3 + drop.depth * 0.55;
		const x = snap(drop.x, px);
		const segment = Math.max(px, snap(drop.length / 3, px));
		const top = snap(drop.y, px);
		[0.25, 0.55, 1].forEach((strength, i) => {
			ctx.fillStyle = `rgb(${RAIN_RGB} / ${alpha * strength})`;
			ctx.fillRect(x, top + segment * i, px, segment);
		});
	}
}

function drawSplashes(ctx: CanvasRenderingContext2D, world: World, images: readonly HTMLImageElement[]): void {
	for (const splash of world.splashes) {
		const image = images[splashFrame(splash.age)];
		if (!image?.complete || image.naturalWidth === 0) continue;
		const scale = splash.depth > 0.55 ? 4 : 3;
		const size = SPLASH_TEXTURE * scale;
		ctx.globalAlpha = 0.5 + splash.depth * 0.5;
		ctx.drawImage(image, snap(splash.x - size / 2, scale), snap(splash.y - size, scale), size, size);
	}
	ctx.globalAlpha = 1;
}

function drawSnow(ctx: CanvasRenderingContext2D, world: World): void {
	for (const flake of world.drops) {
		const size = Math.max(2, Math.round(flake.length));
		const sway = Math.sin(world.time * 1.2 + flake.phase) * (8 + flake.depth * 24);
		ctx.fillStyle = `rgb(${SNOW_RGB} / ${0.55 + flake.depth * 0.45})`;
		ctx.fillRect(snap(flake.x + sway, 2), snap(flake.y, 2), size, size);
	}
}

/** 圓形水珠第 row 列的半寬（像素格） */
function halfWidth(size: number, row: number): number {
	const radius = size / 2;
	const offset = row + 0.5 - radius;
	return Math.max(1, Math.round(Math.sqrt(Math.max(0, radius * radius - offset * offset))));
}

/** 鏡頭水滴：半透明的像素圓形水珠，左上亮點、下緣較深；往下滑的留一道淡淡水痕 */
function drawLensDrop(ctx: CanvasRenderingContext2D, drop: LensDrop): void {
	const px = 4;
	const opacity = lensOpacity(drop);
	const center = snap(drop.x, px);
	const top = snap(drop.y, px);
	const trail = Math.min(drop.travelled, 200);
	if (trail > px) {
		const trailWidth = Math.max(1, Math.floor(drop.size / 3)) * px;
		ctx.fillStyle = `rgb(200 220 255 / ${0.18 * opacity})`;
		ctx.fillRect(center - trailWidth / 2, snap(top - trail, px), trailWidth, trail);
	}
	for (let row = 0; row < drop.size; row += 1) {
		const half = halfWidth(drop.size, row) * px;
		const isEdge = row === drop.size - 1;
		ctx.fillStyle = isEdge ? `rgb(40 70 150 / ${0.45 * opacity})` : `rgb(200 220 255 / ${0.38 * opacity})`;
		ctx.fillRect(center - half, top + row * px, half * 2, px);
	}
	ctx.fillStyle = `rgb(255 255 255 / ${0.85 * opacity})`;
	ctx.fillRect(center - halfWidth(drop.size, 1) * px + px, top + px, px, px); // 反光
}

export function mountPrecipitation(sky: HTMLCanvasElement, lens: HTMLCanvasElement): PrecipitationController {
	const skyCtx = sky.getContext('2d');
	const lensCtx = lens.getContext('2d');
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const images = loadSplashImages();
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

		skyCtx.clearRect(0, 0, size.width, size.height);
		lensCtx.clearRect(0, 0, size.width, size.height);
		if (world.kind === 'rain') {
			drawRain(skyCtx, world);
			drawSplashes(skyCtx, world, images);
		} else {
			drawSnow(skyCtx, world);
		}
		world.lens.forEach((drop) => drawLensDrop(lensCtx, drop));
		frame = requestAnimationFrame(tick);
	};

	const apply = (): void => {
		cancelAnimationFrame(frame);
		frame = 0;
		const kind = reducedMotion.matches ? undefined : wanted;
		if (!kind || !skyCtx || !lensCtx) {
			world = undefined;
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
