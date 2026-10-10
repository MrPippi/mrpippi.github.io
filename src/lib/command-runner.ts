/**
 * 執行聊天列指令的動作（換主題、天氣、音樂、換頁…），結果用 print 印回聊天列。
 * 解析在 commands.ts；畫面在 <CommandBar />。
 */
import { navigate } from 'astro:transitions/client';
import { langFromDocument, localizePath, t } from '../i18n';
import { recordGive, unlock } from './advancements';
import { type Action, COMMANDS, GIVE_ITEMS, TP_PAGES, isCreeperCall, seedOf } from './commands';
import { igniteCreeper } from './explosion-anim';
import { receiveItems, showHotbar, slotCenter } from './hotbar';
import { dieWithItems } from './death-drops';
import { consumeItem, hasItem } from './hotbar';
import { dropItems } from './item-drop-anim';
import { finishRename, isRenaming, playerHead, playerName } from './player';
import { nextTrack, setMusicOn } from './music';
import { setTheme } from './theme';
import { fetchRealWeather, overrideWeather } from './weather';

export type Tone = 'chat' | 'info' | 'error';
/** head：訊息前面顯示的玩家頭像網址 */
export type Print = (text: string, tone?: Tone, head?: string) => void;

/** 這些結果算「成功執行了一個指令」，會解鎖進度 */
const NOT_COMMANDS: readonly Action['kind'][] = ['chat', 'empty', 'unknown', 'usage'];
/** 「/kill」之後過一下才換到死亡畫面，讓訪客看到訊息 */
const KILL_DELAY_MS = 600;
const SEED_NAME = 'MrPippi';

async function runMusic(value: 'on' | 'off' | 'next', print: Print): Promise<void> {
	const { commands, music } = t(langFromDocument());
	if (value === 'off') {
		await setMusicOn(false);
		print(commands.music.off, 'info');
		return;
	}
	const ok = await (value === 'next' ? nextTrack() : setMusicOn(true));
	if (!ok) {
		print(music.unsupportedBody, 'error');
		return;
	}
	unlock('dj');
	print(commands.music[value], 'info');
}

async function runWeather(value: Parameters<typeof overrideWeather>[0] | undefined, print: Print): Promise<void> {
	const { commands } = t(langFromDocument());
	if (value) {
		overrideWeather(value);
		print(commands.weatherSet(commands.weatherNames[value]), 'info');
		return;
	}
	print(commands.weatherNow(commands.weatherNames[await fetchRealWeather()]), 'info');
}

/** 用了名牌之後的第一句話：當成新名字，名牌用掉 */
function rename(text: string, print: Print): void {
	const name = finishRename(text);
	if (!name) return;
	consumeItem('name_tag');
	print(t(langFromDocument()).inventory.renamed(name), 'info');
}

export async function runAction(action: Action, print: Print): Promise<void> {
	const lang = langFromDocument();
	const { commands } = t(lang);
	if (!NOT_COMMANDS.includes(action.kind)) unlock('commander');

	switch (action.kind) {
		case 'empty':
			return;
		case 'chat':
			if (isRenaming() && hasItem('name_tag')) return rename(action.text, print);
			print(`<${playerName()}> ${action.text}`, 'chat', playerHead());
			if (isCreeperCall(action.text) && (await igniteCreeper())) print(commands.blownUp(playerName()), 'info');
			return;
		case 'say':
			print(`[${playerName()}] ${action.text}`, 'chat', playerHead());
			unlock('soliloquy');
			return;
		case 'unknown':
			print(commands.unknown(action.name), 'error');
			print(commands.helpHint, 'error');
			return;
		case 'usage':
			print(commands.usage(COMMANDS[action.command]), 'error');
			return;
		case 'help':
			print(commands.helpTitle, 'info');
			Object.values(COMMANDS).forEach((usage) => print(usage, 'info'));
			return;
		case 'time':
			setTheme(action.value === 'night' ? 'dark' : 'light');
			if (action.value === 'night') unlock('sweet-dreams');
			print(commands.time[action.value], 'info');
			return;
		case 'weather':
			return runWeather(action.value, print);
		case 'give': {
			const { item, count } = action;
			const name = commands.items[item];
			print(commands.gave(name, count, playerName()), 'info');
			// 物品欄先出現，掉落物撿起來後飛進對應的格子
			showHotbar();
			const label = count > 1 ? `${name} ×${count}` : name;
			dropItems(GIVE_ITEMS[item], count, {
				target: (share) => slotCenter(item, share),
				onPickup: (share) => receiveItems(item, share, label),
			});
			recordGive(item);
			if (item === 'diamond_pickaxe') unlock('diamonds');
			return;
		}
		case 'tp': {
			print(commands.tp(commands.pages[action.page]), 'info');
			// 文章只有中文版
			const path = action.page === 'blog' ? TP_PAGES.blog : localizePath(TP_PAGES[action.page], lang);
			return navigate(path);
		}
		case 'music':
			return runMusic(action.value, print);
		case 'search':
			print(commands.search(action.query), 'info');
			return navigate(`${TP_PAGES.blog}?q=${encodeURIComponent(action.query)}`);
		case 'seed':
			print(commands.seed(seedOf(SEED_NAME)), 'info');
			return;
		case 'kill':
			print(commands.kill(playerName()), 'info');
			// 背包裡的東西會噴在死亡畫面上
			dieWithItems();
			// 不存在的網址會顯示死亡畫面（404）；整頁載入才會拿到 404 頁
			window.setTimeout(() => location.assign(localizePath('/kill/', lang)), KILL_DELAY_MS);
			return;
		case 'clear':
			// 清除畫面由 CommandBar 處理
			return;
	}
}
