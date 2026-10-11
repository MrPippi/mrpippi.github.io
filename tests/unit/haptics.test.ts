import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAPTICS, vibrate } from '../../src/lib/haptics';

describe('vibrate', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('照節奏呼叫 navigator.vibrate', () => {
		const spy = vi.fn(() => true);
		vi.stubGlobal('navigator', { vibrate: spy });
		vibrate('explosion');
		expect(spy).toHaveBeenCalledWith([...HAPTICS.explosion]);
	});

	it('瀏覽器不支援時不出錯', () => {
		vi.stubGlobal('navigator', {});
		expect(() => vibrate('hit')).not.toThrow();
	});

	it('關掉音效時不震動', () => {
		const spy = vi.fn(() => true);
		vi.stubGlobal('navigator', { vibrate: spy });
		vi.stubGlobal('localStorage', { getItem: () => 'off' });
		vibrate('totem');
		expect(spy).not.toHaveBeenCalled();
	});
});
