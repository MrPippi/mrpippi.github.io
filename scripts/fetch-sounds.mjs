/**
 * 從 Mojang 官方資源伺服器下載某個版本的全部原版音效到 minecraft-assets/sounds/（不進 git）。
 * 和啟動器一樣：讀版本設定檔裡的 assetIndex，再依雜湊值下載每個檔案並驗證 SHA-1。已經有的檔案會跳過。
 *
 *     node scripts/fetch-sounds.mjs            # 用 .minecraft/versions 裡最新修改的版本
 *     node scripts/fetch-sounds.mjs 26.3       # 指定版本
 *
 * 之後用 npm run audio 把網站用到的轉成 WebM。音效版權屬於 Mojang Studios / Microsoft，只在本機使用。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'minecraft-assets', 'sounds');
const MINECRAFT = process.env.MINECRAFT_DIR || join(process.env.APPDATA || join(homedir(), '.minecraft'), '.minecraft');
const RESOURCES = 'https://resources.download.minecraft.net';
const PREFIX = 'minecraft/sounds/';
const CONCURRENCY = 16;

function latestVersion() {
	const dir = join(MINECRAFT, 'versions');
	const versions = readdirSync(dir).filter((name) => existsSync(join(dir, name, `${name}.json`)));
	if (versions.length === 0) throw new Error(`在 ${dir} 找不到任何版本`);
	return versions.sort((a, b) => statSync(join(dir, b, `${b}.json`)).mtimeMs - statSync(join(dir, a, `${a}.json`)).mtimeMs)[0];
}

async function fetchJson(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}：${url}`);
	return res.json();
}

const sha1 = (data) => createHash('sha1').update(data).digest('hex');

async function download([name, { hash }]) {
	const out = join(OUTPUT, name.slice(PREFIX.length));
	if (existsSync(out) && sha1(readFileSync(out)) === hash) return 'skipped';
	const res = await fetch(`${RESOURCES}/${hash.slice(0, 2)}/${hash}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}：${name}`);
	const data = Buffer.from(await res.arrayBuffer());
	if (sha1(data) !== hash) throw new Error(`SHA-1 不符：${name}`);
	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, data);
	return 'downloaded';
}

const version = process.argv[2] || latestVersion();
const manifest = JSON.parse(readFileSync(join(MINECRAFT, 'versions', version, `${version}.json`), 'utf8'));
const { objects } = await fetchJson(manifest.assetIndex.url);
const sounds = Object.entries(objects).filter(([name]) => name.startsWith(PREFIX) && name.endsWith('.ogg'));
const totalMb = sounds.reduce((sum, [, o]) => sum + o.size, 0) / 1024 / 1024;
console.log(`版本 ${version}（索引 ${manifest.assetIndex.id}）：${sounds.length} 個音效，共 ${totalMb.toFixed(1)} MB`);

const counts = { downloaded: 0, skipped: 0, failed: 0 };
let next = 0;
async function worker() {
	while (next < sounds.length) {
		const entry = sounds[next++];
		try {
			counts[await download(entry)]++;
		} catch (error) {
			counts.failed++;
			console.warn(String(error));
		}
		const done = counts.downloaded + counts.skipped + counts.failed;
		if (done % 250 === 0) console.log(`${done} / ${sounds.length}`);
	}
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`完成：下載 ${counts.downloaded}、已有 ${counts.skipped}、失敗 ${counts.failed}`);
if (counts.failed > 0) process.exitCode = 1;
