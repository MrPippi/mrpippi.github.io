/**
 * 從其他功能印訊息到聊天列（例如使用物品的結果）。<CommandBar /> 監聽 CHAT_PRINT_EVENT。
 */
import type { Tone } from './command-runner';

export const CHAT_PRINT_EVENT = 'chat-print';

export interface ChatPrint {
	readonly text: string;
	readonly tone: Tone;
}

export function printToChat(text: string, tone: Tone = 'info'): void {
	document.dispatchEvent(new CustomEvent<ChatPrint>(CHAT_PRINT_EVENT, { detail: { text, tone } }));
}

export const CHAT_OPEN_EVENT = 'chat-open';

/** 打開聊天列並預先填入文字 */
export function openChat(prefill = ''): void {
	document.dispatchEvent(new CustomEvent<string>(CHAT_OPEN_EVENT, { detail: prefill }));
}
