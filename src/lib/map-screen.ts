/**
 * 地圖：打開一張原版羊皮紙地圖，列出網站的頁面——你在這裡（玩家標記）、去過（白旗）、還沒去過（紅叉），點了就過去。
 */
import { langFromDocument, localizePath, stripLang, t } from '../i18n';
import { visitedPages } from './advancements';
import { TP_PAGES, type TpPage } from './commands';

const MARKERS = {
	here: '/mc/map/player.png',
	visited: '/mc/map/white_banner.png',
	unvisited: '/mc/map/red_x.png',
} as const;

function pagePath(page: TpPage): string {
	// 文章只有中文版
	return page === 'blog' ? TP_PAGES.blog : localizePath(TP_PAGES[page], langFromDocument());
}

function pageItem(page: TpPage, here: string, visited: readonly string[]): HTMLLIElement {
	const { inventory, commands } = t(langFromDocument());
	const state = TP_PAGES[page] === here ? 'here' : visited.includes(TP_PAGES[page]) ? 'visited' : 'unvisited';
	const status = { here: inventory.mapHere, visited: inventory.mapVisited, unvisited: inventory.mapUnvisited }[state];
	const item = document.createElement('li');
	const link = document.createElement('a');
	link.href = pagePath(page);
	link.dataset.state = state;
	const marker = document.createElement('img');
	marker.src = MARKERS[state];
	marker.alt = '';
	marker.className = 'pixelated';
	const name = document.createElement('span');
	name.className = 'name mc-text';
	name.textContent = commands.pages[page];
	const note = document.createElement('span');
	note.className = 'status';
	note.textContent = status;
	link.append(marker, name, note);
	item.append(link);
	return item;
}

export function openSiteMap(): void {
	document.querySelector('dialog.site-map')?.remove();
	const { inventory } = t(langFromDocument());
	const here = stripLang(location.pathname);
	const visited = visitedPages();
	const pages = Object.keys(TP_PAGES) as TpPage[];
	const explored = pages.filter((page) => visited.includes(TP_PAGES[page])).length;

	const dialog = document.createElement('dialog');
	dialog.className = 'site-map';
	dialog.setAttribute('aria-labelledby', 'site-map-title');
	const title = document.createElement('h2');
	title.id = 'site-map-title';
	title.className = 'mc-text';
	title.textContent = inventory.mapTitle;
	const count = document.createElement('p');
	count.className = 'explored';
	count.textContent = inventory.mapExplored(explored, pages.length);
	const list = document.createElement('ul');
	list.append(...pages.map((page) => pageItem(page, here, visited)));
	const close = document.createElement('button');
	close.type = 'button';
	close.className = 'close mc-text';
	close.textContent = inventory.mapClose;
	close.addEventListener('click', () => dialog.close());
	dialog.append(title, count, list, close);

	// 點地圖外面、點了頁面連結都關掉；關掉就移除
	dialog.addEventListener('click', (event) => {
		const target = event.target;
		if (target === dialog || (target instanceof Element && target.closest('a'))) dialog.close();
	});
	dialog.addEventListener('close', () => dialog.remove());
	document.body.append(dialog);
	dialog.showModal();
}
