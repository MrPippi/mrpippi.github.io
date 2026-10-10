/**
 * 建置時從 GitHub API 抓公開 repo 的資料（語言、星數、最後更新時間、網站）。
 * 只發一個請求（使用者的所有公開 repo）；CI 上有 GITHUB_TOKEN 時帶上，避免共用 IP 被限流。
 * 失敗時回傳 undefined，頁面改成只顯示名稱、介紹與連結，不讓建置失敗。
 */

export interface RepoInfo {
	readonly name: string;
	readonly url: string;
	readonly language: string | undefined;
	readonly stars: number;
	readonly pushedAt: Date;
	readonly homepage: string | undefined;
}

const FETCH_TIMEOUT_MS = 10_000;

/** GitHub 語言顏色（常用的幾種），其餘用灰色 */
const LANGUAGE_COLORS: Readonly<Record<string, string>> = {
	Java: '#b07219',
	TypeScript: '#3178c6',
	JavaScript: '#f1e05a',
	Python: '#3572a5',
	HTML: '#e34c26',
	CSS: '#663399',
	Astro: '#ff5a03',
	Kotlin: '#a97bff',
	Go: '#00add8',
	Rust: '#dea584',
};

export function languageColor(language: string | undefined): string {
	return (language && LANGUAGE_COLORS[language]) || '#8b8b8b';
}

const str = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value : undefined);

/** 驗證並轉換 API 回傳的單一 repo；格式不對回傳 undefined */
export function toRepoInfo(raw: unknown): RepoInfo | undefined {
	if (typeof raw !== 'object' || raw === null) return undefined;
	const r = raw as Record<string, unknown>;
	const name = str(r.name);
	const url = str(r.html_url);
	const pushedAt = new Date(str(r.pushed_at) ?? '');
	if (!name || !url || Number.isNaN(pushedAt.valueOf())) return undefined;
	return {
		name,
		url,
		language: str(r.language),
		stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : 0,
		pushedAt,
		homepage: str(r.homepage),
	};
}

/** 抓 owner 的所有公開 repo，以名稱（小寫）為 key；失敗時回傳 undefined */
export async function fetchPublicRepos(owner: string): Promise<ReadonlyMap<string, RepoInfo> | undefined> {
	const token = process.env.GITHUB_TOKEN;
	try {
		const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&type=owner`, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: {
				Accept: 'application/vnd.github+json',
				'User-Agent': `${owner}.github.io-build`,
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data: unknown = await res.json();
		if (!Array.isArray(data)) throw new Error('回傳格式不是陣列');
		const repos = data.map(toRepoInfo).filter((r): r is RepoInfo => r !== undefined);
		console.info(`[github] 取得 ${repos.length} 個公開 repo`);
		return new Map(repos.map((r) => [r.name.toLowerCase(), r]));
	} catch (error) {
		console.warn(`[github] 抓取 repo 資料失敗，作品集只顯示基本資訊：${String(error)}`);
		return undefined;
	}
}
