/**
 * 把 minecraft-assets/sounds/ 的原版音檔（Vorbis .ogg）轉成較小的 Opus（WebM），輸出到 public/sounds/。
 *
 *     npm run audio
 *     # 需要 ffmpeg：放在 PATH 上，或用 FFMPEG_PATH 指定執行檔路徑
 *
 * 音樂 40 kbps、音效 64 kbps；Chrome、Edge、Firefox 與 Safari 15+ 都能播放 WebM Opus。
 * 只轉換下方 JOBS 列出的資料夾；原檔不進 git、不公開。
 * 原檔可以用 node scripts/fetch-sounds.mjs 一次從官方資源伺服器下載。
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'minecraft-assets', 'sounds');
const OUTPUT = join(ROOT, 'public', 'sounds');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

/** [子資料夾, 位元率, 只轉換這些檔名（不含副檔名）；省略表示全部] */
const JOBS = [
	['menu', '40k', ['creative1', 'creative2', 'creative3', 'creative4', 'creative5', 'creative6']],
	['ui', '64k', ['click']],
	[
		'random',
		'64k',
		['explode1', 'explode2', 'explode3', 'explode4', 'fuse', 'pop', 'orb', 'levelup', 'eat1', 'eat2', 'eat3', 'break', 'click', 'glass1', 'glass2', 'glass3'],
	],
	['fireworks', '64k', ['launch1', 'blast1', 'twinkle1']],
	['dig', '64k', ['stone1', 'stone2', 'stone3', 'stone4']],
	['step', '64k', ['stone1', 'stone2', 'stone3', 'stone4', 'stone5', 'stone6']],
	['mob/enderman', '64k', ['portal']],
	['block/beacon', '64k', ['activate']],
	['item/goat_horn', '64k', ['call0', 'call1', 'call2', 'call3', 'call4', 'call5', 'call6', 'call7']],
];

function transcode(input, output, bitrate) {
	const result = spawnSync(
		FFMPEG,
		['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vn', '-c:a', 'libopus', '-b:a', bitrate, '-vbr', 'on', output],
		{ stdio: ['ignore', 'inherit', 'inherit'] },
	);
	if (result.error) throw new Error(`無法執行 ffmpeg（${FFMPEG}）：${result.error.message}`);
	if (result.status !== 0) throw new Error(`轉換失敗：${relative(ROOT, input)}`);
}

let before = 0;
let after = 0;
for (const [folder, bitrate, only] of JOBS) {
	const dir = join(SOURCE, folder);
	const files = readdirSync(dir).filter((f) => f.endsWith('.ogg') && (!only || only.includes(basename(f, '.ogg'))));
	mkdirSync(join(OUTPUT, folder), { recursive: true });
	for (const file of files) {
		const input = join(dir, file);
		const output = join(OUTPUT, folder, `${basename(file, '.ogg')}.webm`);
		transcode(input, output, bitrate);
		before += statSync(input).size;
		after += statSync(output).size;
		console.log(`${relative(ROOT, input)} -> ${relative(ROOT, output)}`);
	}
}
const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`完成：${mb(before)} MB -> ${mb(after)} MB`);
