import { describe, expect, it } from 'vitest';
import { isLiveUptime } from '../../src/lib/twitch';

describe('isLiveUptime', () => {
	it.each(['1 hour, 5 minutes, 3 seconds', '42 minutes', '1 second', '2 days, 1 hour'])('開台中：%s', (text) => {
		expect(isLiveUptime(text)).toBe(true);
	});

	it.each(['mr_pippi is offline', 'User not found: mr_pippi', '', 'Error: rate limited', '<html>500</html>'])(
		'沒開台或錯誤：%s',
		(text) => {
			expect(isLiveUptime(text)).toBe(false);
		},
	);
});
