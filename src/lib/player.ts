/**
 * 訪客在聊天列的名字：預設是翻譯檔的「訪客」，用名牌可以改成自己的名字（存在 localStorage）。
 * 使用名牌後進入「取名中」，下一句聊天訊息就是新名字。
 */
import { langFromDocument, t } from '../i18n';

const STORAGE_KEY = 'player-name';
export const MAX_NAME_LENGTH = 16;

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
