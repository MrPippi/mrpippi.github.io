/**
 * 訪客在聊天列的名字：預設是翻譯檔的「訪客」，用名牌可以改成自己的名字（存在 localStorage）。
 * 使用名牌後進入「取名中」，下一句聊天訊息就是新名字。
 */
import { langFromDocument, t } from '../i18n';

const STORAGE_KEY = 'player-name';
export const MAX_NAME_LENGTH = 16;
/** 皮膚頭像（臉加上帽子那一層，16px） */
const HEAD_URL = 'https://crafthead.net/avatar';
/** 正版 Minecraft 名稱：3–16 個英數字或底線 */
const MINECRAFT_NAME = /^[A-Za-z0-9_]{3,16}$/;
/** 名稱不是正版格式（例如中文）時用史蒂夫的頭 */
const DEFAULT_HEAD = 'MHF_Steve';

let renaming = false;

/** 整理名字：去掉前後空白與換行，最多 16 字；空的回傳 undefined */
export function cleanName(raw: string): string | undefined {
	const name = [...raw.replace(/\s+/g, ' ').trim()].slice(0, MAX_NAME_LENGTH).join('');
	return name === '' ? undefined : name;
}

export function playerName(): string {
	try {
		const saved = cleanName(localStorage.getItem(STORAGE_KEY) ?? '');
		if (saved) return saved;
	} catch {
		// 讀不到就用預設名字
	}
	return t(langFromDocument()).commands.player;
}

export function startRename(): void {
	renaming = true;
}

export function isRenaming(): boolean {
	return renaming;
}

/** 用這句聊天訊息當新名字；成功回傳新名字 */
export function finishRename(raw: string): string | undefined {
	const name = cleanName(raw);
	if (!name) return undefined;
	renaming = false;
	try {
		localStorage.setItem(STORAGE_KEY, name);
	} catch {
		// 無法儲存時只在這次瀏覽有效
	}
	return name;
}

/** 這個名字的皮膚頭像網址：正版格式的名稱用那個玩家的皮膚，其他用史蒂夫 */
export function headUrl(name: string): string {
	return `${HEAD_URL}/${MINECRAFT_NAME.test(name) ? name : DEFAULT_HEAD}/16`;
}

/** 改過名字才有頭像（預設的「訪客」沒有） */
export function playerHead(): string | undefined {
	try {
		const saved = cleanName(localStorage.getItem(STORAGE_KEY) ?? '');
		return saved ? headUrl(saved) : undefined;
	} catch {
		return undefined;
	}
}
