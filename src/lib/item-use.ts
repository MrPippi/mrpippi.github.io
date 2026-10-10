/**
 * 使用物品欄裡的物品（每用一次少一個）：結果印在聊天列，有些會換頁、換主題或放煙火。
 */
import { navigate } from 'astro:transitions/client';
import { langFromDocument, localizePath, stripLang, t } from '../i18n';
import { visitedCount } from './advancements';
import { printToChat } from './chat';
import { type GiveItem, TP_PAGES, type TpPage } from './commands';
import { beaconBeam, launchFirework } from './firework-anim';
import { playHorn, playPop } from './sound';
import { effectiveTheme, setTheme } from './theme';

const pickRandom = <T>(list: readonly T[]): T | undefined => list[Math.floor(Math.random() * list.length)];

function pathOf(page: TpPage): string {
	// 文章只有中文版
	return page === 'blog' ? TP_PAGES.blog : localizePath(TP_PAGES[page], langFromDocument());
}

/** 終界珍珠：傳送到另一個隨機頁面 */
function teleport(): void {
	const { commands } = t(langFromDocument());
	const here = stripLang(location.pathname);
	const pages = (Object.keys(TP_PAGES) as TpPage[]).filter((page) => TP_PAGES[page] !== here);
	const page = pickRandom(pages);
	if (!page) return;
	printToChat(commands.tp(commands.pages[page]));
	void navigate(pathOf(page));
}

/** 紅石：像開關紅石燈一樣切換白天／夜晚 */
function toggleLamp(): void {
	const { inventory } = t(langFromDocument());
	const toLight = effectiveTheme() === 'dark';
	setTheme(toLight ? 'light' : 'dark');
	printToChat(toLight ? inventory.redstoneOn : inventory.redstoneOff);
}

export function useItem(item: GiveItem): void {
	const dict = t(langFromDocument());
	const { inventory, commands } = dict;
	const player = commands.player;
	switch (item) {
		case 'cake':
			playPop();
			printToChat(inventory.cake(player));
			return;
		case 'diamond_pickaxe':
			printToChat(inventory.pickaxe(player));
			return;
		case 'enchanted_book':
			printToChat(inventory.learned(player, pickRandom(inventory.enchantments) ?? ''));
			return;
		case 'ender_pearl':
			teleport();
			return;
		case 'nether_star':
			beaconBeam();
			printToChat(inventory.beacon);
			return;
		case 'firework_rocket':
			launchFirework();
			return;
		case 'map':
			printToChat(inventory.map(visitedCount()));
			return;
		case 'compass':
			printToChat(inventory.compass);
			void navigate(localizePath('/', langFromDocument()));
			return;
		case 'redstone':
			toggleLamp();
			return;
		case 'name_tag':
			printToChat(inventory.nameTag(dict.profile.name));
			return;
		case 'goat_horn':
			playHorn();
			printToChat(inventory.horn(player));
			return;
		case 'bundle':
			printToChat(inventory.bundle);
			return;
	}
}
