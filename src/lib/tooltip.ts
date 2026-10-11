/**
 * 原版提示框（<Tooltip />）：目標元素的 data-tooltip 內容改變時呼叫 refreshTooltip，正在顯示的提示框會跟著更新。
 */
export const TOOLTIP_REFRESH_EVENT = 'tooltip-refresh';

export function refreshTooltip(): void {
	document.dispatchEvent(new Event(TOOLTIP_REFRESH_EVENT));
}

export const TOOLTIP_SHOW_EVENT = 'tooltip-show';

/** 觸控裝置沒有懸停：點一下時主動在元素上方顯示它的提示框，過幾秒自動收起 */
export function showTooltipFor(target: HTMLElement): void {
	document.dispatchEvent(new CustomEvent<HTMLElement>(TOOLTIP_SHOW_EVENT, { detail: target }));
}
