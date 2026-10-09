import { playPling } from './sound';

const VISIBLE_MS = 2600;
const GAP_MS = 250;
const DEFAULT_ICON = '/mc/item/name_tag.png';

export interface ToastOptions {
	/** advancement：進度通知框（預設）；music：「正在播放」框 */
	readonly variant?: 'advancement' | 'music';
	/** 不播放「叮」聲 */
	readonly silent?: boolean;
}

interface ToastMessage extends ToastOptions {
	readonly title: string;
	readonly body: string;
	readonly icon: string;
}

let queue: readonly ToastMessage[] = [];
let showing = false;

function display(message: ToastMessage): boolean {
	const toast = document.querySelector<HTMLElement>('[data-toast]');
	const titleEl = toast?.querySelector('[data-toast-title]');
	const bodyEl = toast?.querySelector('[data-toast-body]');
	const iconEl = toast?.querySelector<HTMLImageElement>('[data-toast-icon]');
	if (!toast || !titleEl || !bodyEl || !iconEl) return false;

	titleEl.textContent = message.title;
	bodyEl.textContent = message.body;
	iconEl.src = message.icon;
	toast.dataset.variant = message.variant ?? 'advancement';
	// 重新觸發滑入動畫
	toast.hidden = true;
	void toast.offsetWidth;
	toast.hidden = false;
	if (!message.silent) playPling();

	window.setTimeout(() => {
		toast.hidden = true;
		window.setTimeout(next, GAP_MS);
	}, VISIBLE_MS);
	return true;
}

function next(): void {
	const [message, ...rest] = queue;
	queue = rest;
	showing = message !== undefined && display(message);
	if (message && !showing) next();
}

/** 顯示 <Toast /> 提示；同時有多則時依序排隊顯示。icon 為 public/ 下的物品圖路徑。 */
export function showToast(title: string, body: string, icon: string = DEFAULT_ICON, options: ToastOptions = {}): void {
	queue = [...queue, { title, body, icon, ...options }];
	if (!showing) next();
}
