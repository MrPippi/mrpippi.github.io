/**
 * 使用物品欄裡的物品：結果印在聊天列，有些會換頁、換主題、放煙火或打開地圖。
 * 回傳 consumed 表示用掉一個；kept 表示物品還在（地圖、山羊角、鑽石鎬，或名牌等你輸入名字）。
 * 附魔書由物品欄自己處理（要先選另一個物品）。
 */
import { navigate } from 'astro:transitions/client';
import { langFromDocument, localizePath, stripLang, t } from '../i18n';
import { openChat, printToChat } from './chat';
import { type GiveItem, TP_PAGES, type TpPage } from './commands';
import { beaconBeam, launchFirework } from './firework-anim';
import type { Point } from './item-drop';
import { openSiteMap } from './map-screen';
import { playerName, startRename } from './player';
import { playBeacon, playEat, playHorn, playLever, playTeleport } from './sound';
import { effectiveTheme, setTheme } from './theme';
import { throwXpBottle } from './xp-anim';

export type UseResult = 'consumed' | 'kept';

const pickRandom = <T>(list: readonly T[]): T | undefined => list[Math.floor(Math.random() * list.length)];

export function pagePath(page: TpPage): string {
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
	playTeleport();
	printToChat(commands.tp(commands.pages[page]));
	void navigate(pagePath(page));
}

/** 紅石：像開關紅石燈一樣切換白天／夜晚 */
function toggleLamp(): void {
	const { inventory } = t(langFromDocument());
	const toLight = effectiveTheme() === 'dark';
	playLever(toLight);
	setTheme(toLight ? 'light' : 'dark');
	printToChat(toLight ? inventory.redstoneOn : inventory.redstoneOff);
}

/** 名牌：打開聊天列，下一句話就是新名字（取好名字才用掉名牌） */
function rename(): void {
	startRename();
	printToChat(t(langFromDocument()).inventory.renamePrompt);
	openChat();
}

export function useItem(item: GiveItem, from: Point | undefined): UseResult {
	const { inventory } = t(langFromDocument());
	const player = playerName();
	switch (item) {
		case 'cake':
			playEat();
			printToChat(inventory.cake(player));
			return 'consumed';
		case 'diamond_pickaxe':
			printToChat(inventory.pickaxeHint);
			return 'kept';
		case 'enchanted_book':
			return 'kept';
		case 'ender_pearl':
			teleport();
			return 'consumed';
		case 'nether_star':
			playBeacon();
			beaconBeam();
			printToChat(inventory.beacon);
			return 'consumed';
		case 'firework_rocket':
			launchFirework();
			return 'consumed';
		case 'map':
			openSiteMap();
			return 'kept';
		case 'compass':
			printToChat(inventory.compass);
			void navigate(localizePath('/', langFromDocument()));
			return 'consumed';
		case 'redstone':
			toggleLamp();
			return 'consumed';
		case 'name_tag':
			rename();
			return 'kept';
		case 'goat_horn':
			playHorn();
			printToChat(inventory.horn(player));
			return 'kept';
		case 'bundle':
			printToChat(inventory.bundle);
			return 'consumed';
		case 'experience_bottle':
			throwXpBottle(from);
			return 'consumed';
	}
}
