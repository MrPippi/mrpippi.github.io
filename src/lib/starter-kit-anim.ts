/**
 * 新手禮包的畫面：物品欄上方出現一個晃動的束口袋，點一下打開（原版束口袋倒出物品的聲音），
 * 物品一個個從袋子噴出、飛進物品欄。減少動態效果時袋子不晃、物品直接放進物品欄。
 */
import { langFromDocument, t } from '../i18n';
import { printToChat } from './chat';
import { GIVE_ITEMS } from './commands';
import { receiveItems, showHotbar, slotCenter } from './hotbar';
import { playBundleOpen, playPop } from './sound';
import { type KitEntry, markStarterKitOpened, STARTER_KIT, starterKitOpened } from './starter-kit';

const BUNDLE_ICON = '/mc/item/bundle.png';
/** 每個物品噴出的間隔、飛行時間 */
const STAGGER_MS = 160;
const FLIGHT_MS = 750;
/** 噴出時往上拋多高（px） */
const ARC_HEIGHT = 140;

function itemLabel(entry: KitEntry): string {
	const name = t(langFromDocument()).commands.items[entry.item];
	return entry.count > 1 ? `${name} ×${entry.count}` : name;
}

/** 從袋子拋出一個物品，畫弧線落進它的格子 */
function fly(entry: KitEntry, from: { x: number; y: number }): Promise<void> {
	const to = slotCenter(entry.item, entry.count);
	const img = document.createElement('img');
	img.src = GIVE_ITEMS[entry.item];
	img.alt = '';
	img.className = 'kit-item pixelated';
	document.body.append(img);
	const end = to ?? from;
	const side = (Math.random() * 2 - 1) * 90;
	const peak = { x: from.x + side, y: Math.min(from.y, end.y) - ARC_HEIGHT * (0.7 + Math.random() * 0.6) };
	const at = (p: { x: number; y: number }, scale: number) => ({
		transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%) scale(${scale})`,
	});
	return img
		.animate([at(from, 0.4), { ...at(peak, 1.2), easing: 'ease-in' }, at(end, 0.8)], {
			duration: FLIGHT_MS,
			easing: 'ease-out',
		})
		.finished.catch(() => undefined)
		.then(() => img.remove());
}

function receive(entry: KitEntry): void {
	receiveItems(entry.item, entry.count, itemLabel(entry));
}

async function open(button: HTMLButtonElement): Promise<void> {
	markStarterKitOpened();
	playBundleOpen();
	const { inventory } = t(langFromDocument());
	printToChat(inventory.starterKitOpened);
	const box = button.getBoundingClientRect();
	const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
	button.remove();
	showHotbar();
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		STARTER_KIT.forEach(receive);
		return;
	}
	await Promise.all(
		STARTER_KIT.map(
			(entry, i) =>
				new Promise<void>((resolve) => {
					window.setTimeout(() => {
						void fly(entry, from).then(() => {
							playPop();
							receive(entry);
							resolve();
						});
					}, i * STAGGER_MS);
				}),
		),
	);
}

/** 每次進入頁面呼叫：還沒打開過就放一個禮包 */
export function offerStarterKit(): void {
	if (starterKitOpened() || document.querySelector('[data-starter-kit]')) return;
	const { inventory } = t(langFromDocument());
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'starter-kit';
	button.dataset.starterKit = '';
	button.setAttribute('aria-label', `${inventory.starterKit}：${inventory.starterKitHint}`);
	const icon = document.createElement('img');
	icon.src = BUNDLE_ICON;
	icon.alt = '';
	icon.className = 'pixelated';
	const label = document.createElement('span');
	label.className = 'label mc-text';
	label.textContent = inventory.starterKit;
	const hint = document.createElement('span');
	hint.className = 'hint';
	hint.textContent = inventory.starterKitHint;
	button.append(icon, label, hint);
	button.addEventListener('click', () => void open(button), { once: true });
	document.body.append(button);
}
