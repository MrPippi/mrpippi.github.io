import { describe, expect, it } from 'vitest';
import { cleanName, headUrl, MAX_NAME_LENGTH } from '../../src/lib/player';

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

describe('headUrl', () => {
	it('正版格式的名稱用那個玩家的皮膚', () => {
		expect(headUrl('Mr__Pippi')).toBe('https://crafthead.net/avatar/Mr__Pippi/16');
	});

	it('中文、空白、太短的名稱用史蒂夫', () => {
		expect(headUrl('皮皮')).toBe('https://crafthead.net/avatar/MHF_Steve/16');
		expect(headUrl('a b')).toBe('https://crafthead.net/avatar/MHF_Steve/16');
		expect(headUrl('ab')).toBe('https://crafthead.net/avatar/MHF_Steve/16');
	});
});
