import { describe, expect, it } from 'vitest';
import { parseOpenMeteo, weatherFromCode } from '../../src/lib/weather';

describe('weatherFromCode', () => {
	it.each([
		[0, 'clear'],
		[3, 'clear'],
		[45, 'clear'],
		[51, 'rain'],
		[63, 'rain'],
		[67, 'rain'],
		[71, 'snow'],
		[77, 'snow'],
		[80, 'rain'],
		[82, 'rain'],
		[85, 'snow'],
		[95, 'thunder'],
		[99, 'thunder'],
	])('WMO %i → %s', (code, expected) => {
		expect(weatherFromCode(code)).toBe(expected);
	});
});

describe('parseOpenMeteo', () => {
	it('讀出 current.weather_code', () => {
		expect(parseOpenMeteo({ current: { time: '2026-10-10T16:00', weather_code: 61 } })).toBe('rain');
	});

	it.each([null, 'rain', {}, { current: null }, { current: { weather_code: 'x' } }, { current: { weather_code: Number.NaN } }])(
		'格式不對回傳 undefined：%j',
		(json) => {
			expect(parseOpenMeteo(json)).toBeUndefined();
		},
	);
});
