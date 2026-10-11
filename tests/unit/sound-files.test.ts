import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SAMPLES } from '../../src/lib/sound';

describe('音效檔', () => {
	it.each(Object.entries(SAMPLES))('%s（%s）在 public/ 裡', (_, url) => {
		expect(existsSync(join(process.cwd(), 'public', url))).toBe(true);
	});
});
