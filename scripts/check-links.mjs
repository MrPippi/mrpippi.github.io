/**
 * 檢查建置結果（dist/）裡所有站內連結與資源都存在：href、src 以 / 開頭的路徑，
 * 對應到 dist 底下的檔案，或資料夾裡的 index.html。外部網址不檢查。
 *
 *     npm run build && npm run check:links
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const ATTR = /\s(?:href|src)="(\/[^"#?]*)/g;

function htmlFiles(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return htmlFiles(path);
		return name.endsWith('.html') ? [path] : [];
	});
}

function exists(urlPath) {
	const target = join(DIST, decodeURIComponent(urlPath));
	if (urlPath.endsWith('/')) return existsSync(join(target, 'index.html'));
	return existsSync(target) || existsSync(join(target, 'index.html'));
}

if (!existsSync(DIST)) {
	console.error('找不到 dist/，請先執行 npm run build');
	process.exit(1);
}

const pages = htmlFiles(DIST);
const broken = pages.flatMap((file) => {
	const html = readFileSync(file, 'utf8');
	const links = new Set([...html.matchAll(ATTR)].map((m) => m[1]).filter((p) => !p.startsWith('//')));
	return [...links].filter((link) => !exists(link)).map((link) => `${relative(DIST, file)} → ${link}`);
});

if (broken.length > 0) {
	console.error(`發現 ${broken.length} 個壞掉的站內連結：`);
	for (const line of broken) console.error(`  ${line}`);
	process.exit(1);
}
console.log(`檢查 ${pages.length} 個頁面，站內連結全部正常。`);
