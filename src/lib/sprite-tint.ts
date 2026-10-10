/**
 * 把灰階的原版粒子圖染色（例如煙火火花）：和遊戲一樣用顏色相乘，透明的地方保持透明。
 * 結果是 data: 網址，同樣的圖與顏色只算一次。
 */

const images = new Map<string, Promise<HTMLImageElement>>();
const tinted = new Map<string, Promise<string | undefined>>();

function loadImage(src: string): Promise<HTMLImageElement> {
	const cached = images.get(src);
	if (cached) return cached;
	const loading = new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`無法載入 ${src}`));
		img.src = src;
	});
	images.set(src, loading);
	return loading;
}

function tint(img: HTMLImageElement, color: string): string | undefined {
	const canvas = document.createElement('canvas');
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	const ctx = canvas.getContext('2d');
	if (!ctx) return undefined;
	ctx.drawImage(img, 0, 0);
	// 亮度 × 顏色，再用原圖的透明度裁掉多出來的部分
	ctx.globalCompositeOperation = 'multiply';
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.globalCompositeOperation = 'destination-in';
	ctx.drawImage(img, 0, 0);
	return canvas.toDataURL();
}

/** 染成 color 的圖片網址；載入或繪製失敗時是 undefined（呼叫端改用純色） */
export function tintedSprite(src: string, color: string): Promise<string | undefined> {
	const key = `${src}|${color}`;
	const cached = tinted.get(key);
	if (cached) return cached;
	const result = loadImage(src)
		.then((img) => tint(img, color))
		.catch((error: unknown) => {
			console.warn('[sprite-tint] 染色失敗：', error);
			return undefined;
		});
	tinted.set(key, result);
	return result;
}
