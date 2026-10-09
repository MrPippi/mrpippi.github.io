import type { Lang } from './config';
import { en } from './en';
import type { Dictionary } from './types';
import { zhTW } from './zh-TW';

export * from './config';
export type { AdvancementId, Dictionary, SkillKey } from './types';

const DICTIONARIES: Record<Lang, Dictionary> = { 'zh-TW': zhTW, en };

export function t(lang: Lang): Dictionary {
	return DICTIONARIES[lang];
}
