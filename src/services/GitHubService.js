/**
 * GitHubService — lê perfis e repositórios públicos do GitHub.
 *
 * Usa a API REST pública (60 req/hora sem token, 5000 com token).
 * Token opcional configurado via SettingsModal.
 */

const BASE = 'https://api.github.com'

function headers(token) {
  const h = { Accept: 'application/vnd.github+json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

/**
 * Extrai o username de uma URL do GitHub ou retorna o valor direto.
 * Aceita: "torvalds", "https://github.com/torvalds", "github.com/torvalds"
 */
export function parseUsername(input) {
  const clean = input.trim().replace(/\/$/, '')
  const match = clean.match(/github\.com\/([^/?#]+)/)
  return match ? match[1] : clean
}

/**
 * Busca todos os repositórios públicos do usuário, ordenados por estrelas.
 * Retorna array de objetos simplificados.
 */
export async function fetchRepos(username, token) {
  const url = `${BASE}/users/${username}/repos?sort=updated&per_page=100&type=public`
  const res = await fetch(url, { headers: headers(token) })

  if (res.status === 404) throw new Error(`Usuário "${username}" não encontrado no GitHub.`)
  if (res.status === 403) throw new Error('Rate limit do GitHub atingido. Adicione um token nas Configurações.')
  if (!res.ok) throw new Error(`Erro ao acessar GitHub: status ${res.status}`)

  const data = await res.json()

  return data
    .filter(r => !r.fork) // ignora forks
    .map(r => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description || '',
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language || '',
      topics: r.topics || [],
      updated_at: r.updated_at,
      url: r.html_url,
      homepage: r.homepage || '',
    }))
    .sort((a, b) => b.stars - a.stars)
}

/**
 * Busca README e linguagens dos top N repositórios.
 * Retorna os repos enriquecidos com readme_excerpt e languages.
 */
export async function fetchRepoDetails(repos, token, topN = 12) {
  const top = repos.slice(0, topN)

  const enriched = await Promise.allSettled(
    top.map(async (repo) => {
      const [readmeRes, langsRes] = await Promise.allSettled([
        fetch(`${BASE}/repos/${repo.full_name}/readme`, { headers: headers(token) }),
        fetch(`${BASE}/repos/${repo.full_name}/languages`, { headers: headers(token) }),
      ])

      let readme = ''
      if (readmeRes.status === 'fulfilled' && readmeRes.value.ok) {
        const data = await readmeRes.value.json()
        const decoded = atob(data.content.replace(/\n/g, ''))
        // Pega só os primeiros 600 chars do README para não sobrecarregar o prompt
        readme = decoded.slice(0, 600).replace(/[#*`]/g, '').trim()
      }

      let languages = {}
      if (langsRes.status === 'fulfilled' && langsRes.value.ok) {
        languages = await langsRes.value.json()
      }

      return {
        ...repo,
        readme_excerpt: readme,
        languages: Object.keys(languages).slice(0, 6),
      }
    })
  )

  return enriched
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
}
