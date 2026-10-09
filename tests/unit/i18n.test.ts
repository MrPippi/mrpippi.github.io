import { describe, expect, it } from 'vitest';
import { langFromPath, langStaticPaths, localizePath, stripLang, switchLangPath } from '../../src/i18n/config';

describe('langFromPath', () => {
	it.each([
		['/', 'zh-TW'],
		['/about/', 'zh-TW'],
		['/blog/hello/', 'zh-TW'],
		['/en', 'en'],
		['/en/', 'en'],
		['/en/about/', 'en'],
		['/english/', 'zh-TW'],
	])('%s → %s', (path, lang) => {
		expect(langFromPath(path)).toBe(lang);
	});
});

describe('stripLang / localizePath', () => {
	it('去掉英文前綴', () => {
		expect(stripLang('/en/about/')).toBe('/about/');
		expect(stripLang('/en/')).toBe('/');
		expect(stripLang('/en')).toBe('/');
		expect(stripLang('/about/')).toBe('/about/');
	});

	it('加上語系前綴，且不會重複加', () => {
		expect(localizePath('/about/', 'en')).toBe('/en/about/');
		expect(localizePath('/en/about/', 'en')).toBe('/en/about/');
		expect(localizePath('/en/about/', 'zh-TW')).toBe('/about/');
		expect(localizePath('/', 'en')).toBe('/en/');
	});
});

describe('switchLangPath', () => {
	it('雙語頁面切到對應語言', () => {
		expect(switchLangPath('/about/', 'en')).toBe('/en/about/');
		expect(switchLangPath('/en/contact/', 'zh-TW')).toBe('/contact/');
		expect(switchLangPath('/en/media', 'zh-TW')).toBe('/media/');
	});

	it('只有中文的頁面（文章）切到英文時回標題畫面', () => {
		expect(switchLangPath('/blog/', 'en')).toBe('/en/');
		expect(switchLangPath('/blog/tags/Astro/', 'en')).toBe('/en/');
	});
});

describe('langStaticPaths', () => {
	it('中文是根目錄、英文是 en', () => {
		expect(langStaticPaths()).toEqual([{ params: { lang: undefined } }, { params: { lang: 'en' } }]);
	});
});
