/**
 * 原版提示框（<Tooltip />）：目標元素的 data-tooltip 內容改變時呼叫 refreshTooltip，正在顯示的提示框會跟著更新。
 */
export const TOOLTIP_REFRESH_EVENT = 'tooltip-refresh';

export function refreshTooltip(): void {
	document.dispatchEvent(new Event(TOOLTIP_REFRESH_EVENT));
}
