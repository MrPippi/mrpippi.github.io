/**
 * 執行聊天列指令的動作（換主題、天氣、音樂、換頁…），結果用 print 印回聊天列。
 * 解析在 commands.ts；畫面在 <CommandBar />。
 */
import { navigate } from 'astro:transitions/client';
import { langFromDocument, localizePath, t } from '../i18n';
import { recordGive, unlock } from './advancements';
import { type Action, COMMANDS, GIVE_ITEMS, TP_PAGES, seedOf } from './commands';
import { dropItem } from './item-drop-anim';
import { nextTrack, setMusicOn } from './music';
import { setTheme } from './theme';
import { showToast } from './toast';
import { fetchRealWeather, overrideWeather } from './weather';

export type Tone = 'chat' | 'info' | 'error';
export type Print = (text: string, tone?: Tone) => void;

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

export async function runAction(action: Action, print: Print): Promise<void> {
	const lang = langFromDocument();
	const { commands } = t(lang);
	if (!NOT_COMMANDS.includes(action.kind)) unlock('commander');

	switch (action.kind) {
		case 'empty':
			return;
		case 'chat':
			print(`<${commands.player}> ${action.text}`, 'chat');
			return;
		case 'say':
			print(`[${commands.player}] ${action.text}`, 'chat');
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
			const item = commands.items[action.item];
			const message = commands.gave(item, commands.player);
			print(message, 'info');
			showToast(item, message, GIVE_ITEMS[action.item]);
			dropItem(GIVE_ITEMS[action.item]);
			recordGive(action.item);
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
			print(commands.kill(commands.player), 'info');
			// 不存在的網址會顯示死亡畫面（404）；整頁載入才會拿到 404 頁
			window.setTimeout(() => location.assign(localizePath('/kill/', lang)), KILL_DELAY_MS);
			return;
		case 'clear':
			// 清除畫面由 CommandBar 處理
			return;
	}
}
