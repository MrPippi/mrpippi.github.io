import { describe, expect, it } from 'vitest';
import { cleanName, MAX_NAME_LENGTH } from '../../src/lib/player';

describe('cleanName', () => {
	it('去掉前後空白、合併中間的空白', () => {
		expect(cleanName('  Steve  ')).toBe('Steve');
		expect(cleanName('皮皮\n 本人')).toBe('皮皮 本人');
	});

	it('最多 16 字，中文與 Emoji 都算一個字', () => {
		expect(cleanName('a'.repeat(20))).toHaveLength(MAX_NAME_LENGTH);
		expect([...(cleanName('😀'.repeat(20)) ?? '')]).toHaveLength(MAX_NAME_LENGTH);
	});

	it('空白名字不算', () => {
		expect(cleanName('   ')).toBeUndefined();
	});
});
