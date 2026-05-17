/**
 * GitHubService — acessa a API do GitHub para buscar repositórios e conteúdo.
 */

const GITHUB_API = 'https://api.github.com'
const STORAGE_KEY = 'resumeforge_github_token'

export function saveToken(token) {
  if (token) localStorage.setItem(STORAGE_KEY, token.trim())
  else localStorage.removeItem(STORAGE_KEY)
}

export function getToken() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY)
}

function headers() {
  const token = getToken()
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function ghFetch(path) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: headers() })
  if (res.status === 401) throw new Error('Token invalido ou expirado.')
  if (res.status === 403) throw new Error('Rate limit atingido. Adicione um token nas configuracoes.')
  if (res.status === 404) throw new Error(`Usuario ou recurso nao encontrado: ${path}`)
  if (!res.ok) throw new Error(`GitHub retornou status ${res.status}`)
  return res.json()
}

export async function getUser(username) {
  const path = username ? `/users/${username}` : '/user'
  return ghFetch(path)
}

export async function getRepos(username, maxRepos = 15) {
  const path = username
    ? `/users/${username}/repos?sort=pushed&per_page=50&type=all`
    : `/user/repos?sort=pushed&per_page=50&affiliation=owner`

  const repos = await ghFetch(path)

  return repos
    .filter((r) => !(r.fork && r.stargazers_count === 0))
    .slice(0, maxRepos)
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      language: r.language || '',
      stars: r.stargazers_count,
      forks: r.forks_count,
      fork: r.fork,
      isPrivate: r.private,
      url: r.html_url,
      pushedAt: r.pushed_at,
      topics: r.topics || [],
    }))
}

export async function getLanguages(fullName) {
  try {
    return await ghFetch(`/repos/${fullName}/languages`)
  } catch {
    return {}
  }
}

export async function getReadme(fullName) {
  try {
    const data = await ghFetch(`/repos/${fullName}/readme`)
    const decoded = atob(data.content.replace(/\n/g, ''))
    return decoded.slice(0, 2000)
  } catch {
    return ''
  }
}

export async function enrichRepos(repos, onProgress) {
  const enriched = []
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i]
    onProgress?.({ current: i + 1, total: repos.length, name: repo.name })
    const [languages, readme] = await Promise.all([
      getLanguages(repo.fullName),
      getReadme(repo.fullName),
    ])
    enriched.push({ ...repo, languages, readme })
  }
  return enriched
}
