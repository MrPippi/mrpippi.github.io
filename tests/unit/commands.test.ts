import { describe, expect, it } from 'vitest';
import { isCreeperCall, MAX_INPUT, parseCommand, seedOf, suggest } from '../../src/lib/commands';

describe('parseCommand', () => {
	it('空白或只有斜線不做事', () => {
		expect(parseCommand('')).toEqual({ kind: 'empty' });
		expect(parseCommand('   ')).toEqual({ kind: 'empty' });
		expect(parseCommand('/')).toEqual({ kind: 'empty' });
	});

	it('不是斜線開頭就是聊天訊息', () => {
		expect(parseCommand('  尼好  ')).toEqual({ kind: 'chat', text: '尼好' });
	});

	it('訊息超過 256 字會被截斷', () => {
		const action = parseCommand('a'.repeat(MAX_INPUT + 50));
		expect(action).toEqual({ kind: 'chat', text: 'a'.repeat(MAX_INPUT) });
	});

	it('指令名稱與參數不分大小寫，/say 保留原文', () => {
		expect(parseCommand('/HELP')).toEqual({ kind: 'help' });
		expect(parseCommand('/Weather Rain')).toEqual({ kind: 'weather', value: 'rain' });
		expect(parseCommand('/time SET Night')).toEqual({ kind: 'time', value: 'night' });
		expect(parseCommand('/say Hello World')).toEqual({ kind: 'say', text: 'Hello World' });
	});

	it('未知指令', () => {
		expect(parseCommand('/creeper aww man')).toEqual({ kind: 'unknown', name: 'creeper' });
	});

	it.each([
		['/time set day', { kind: 'time', value: 'day' }],
		['/time set night', { kind: 'time', value: 'night' }],
		['/weather', { kind: 'weather', value: undefined }],
		['/weather thunder', { kind: 'weather', value: 'thunder' }],
		['/give @s cake', { kind: 'give', item: 'cake' }],
		['/give @s minecraft:Nether_Star', { kind: 'give', item: 'nether_star' }],
		['/give diamond_pickaxe', { kind: 'give', item: 'diamond_pickaxe' }],
		['/tp blog', { kind: 'tp', page: 'blog' }],
		['/music next', { kind: 'music', value: 'next' }],
		['/search  Astro 網站 ', { kind: 'search', query: 'Astro 網站' }],
		['/say hello   world', { kind: 'say', text: 'hello   world' }],
		['/seed', { kind: 'seed' }],
		['/kill', { kind: 'kill' }],
		['/clear', { kind: 'clear' }],
	])('%s', (input, expected) => {
		expect(parseCommand(input)).toEqual(expected);
	});

	it.each([
		['/time day', 'time'],
		['/time set noon', 'time'],
		['/weather hail', 'weather'],
		['/give @s dirt', 'give'],
		['/give @s', 'give'],
		['/give @s constructor', 'give'],
		['/tp nether', 'tp'],
		['/tp toString', 'tp'],
		['/music loud', 'music'],
		['/search', 'search'],
		['/say', 'say'],
	])('參數不對時回傳用法：%s', (input, command) => {
		expect(parseCommand(input)).toEqual({ kind: 'usage', command });
	});
});

describe('suggest', () => {
	it('補完指令名稱', () => {
		expect(suggest('/we')).toEqual(['/weather']);
		expect(suggest('/s')).toEqual(['/search', '/say', '/seed']);
	});

	it('補完參數', () => {
		expect(suggest('/weather r')).toEqual(['/weather rain']);
		expect(suggest('/time ')).toEqual(['/time set']);
		expect(suggest('/time set n')).toEqual(['/time set night']);
		expect(suggest('/give @s ca')).toEqual(['/give @s cake']);
		expect(suggest('/tp ')).toHaveLength(6);
	});

	it('已經打完整就不再建議同一個字', () => {
		expect(suggest('/weather rain')).toEqual([]);
	});

	it('一般聊天與未知指令沒有建議', () => {
		expect(suggest('hello')).toEqual([]);
		expect(suggest('/creeper ')).toEqual([]);
	});

	it('可以限制數量', () => {
		expect(suggest('/', 3)).toHaveLength(3);
	});
});

describe('seedOf', () => {
	it('同一個名稱永遠得到同一個整數', () => {
		expect(seedOf('MrPippi')).toBe(seedOf('MrPippi'));
		expect(Number.isInteger(seedOf('MrPippi'))).toBe(true);
		expect(seedOf('MrPippi')).not.toBe(seedOf('Steve'));
	});
});

describe('isCreeperCall', () => {
	it.each([
		['creeper', true],
		['Aw man, CREEPER!', true],
		['有苦力怕', true],
		['crepe', false],
		['', false],
	])('%s → %s', (text, expected) => {
		expect(isCreeperCall(text)).toBe(expected);
	});
});
