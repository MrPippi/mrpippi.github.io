/**
 * 白天／夜晚主題：存在 localStorage（沒選過就跟隨系統），切換時整頁淡入淡出。
 * 主題按鈕與聊天列的 /time 指令共用；切換後發出 THEME_EVENT 讓按鈕更新文字。
 */
import { unlock } from './advancements';

export type Theme = 'light' | 'dark';

export const THEME_EVENT = 'theme-change';

const STORAGE_KEY = 'theme';

function prefersDark(): boolean {
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function effectiveTheme(): Theme {
	const explicit = document.documentElement.dataset.theme;
	if (explicit === 'light' || explicit === 'dark') return explicit;
	return prefersDark() ? 'dark' : 'light';
}

function apply(next: Theme): void {
	document.documentElement.dataset.theme = next;
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// 無法儲存時只在本次瀏覽生效
	}
	document.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: next }));
	if (next === 'dark') unlock('night-owl');
}

/** 切換到指定主題。畫面已經是這個主題時只記住選擇（原本是跟隨系統的話），不播轉場 */
export function setTheme(next: Theme): void {
	if (effectiveTheme() === next) {
		if (!document.documentElement.dataset.theme) apply(next);
		return;
	}
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!document.startViewTransition || reduced) {
		apply(next);
		return;
	}
	document.startViewTransition(() => apply(next));
}

export function toggleTheme(): void {
	setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
}
