import httpx
from backend import config

GITHUB_API = "https://api.github.com"

def _headers() -> dict:
    token = config.get_github_token()
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h

async def get_repos(username: str, max_repos: int = 15) -> list[dict]:
    async with httpx.AsyncClient(timeout=15, headers=_headers()) as client:
        r = await client.get(
            f"{GITHUB_API}/users/{username}/repos",
            params={"per_page": 100, "sort": "updated", "type": "owner"}
        )
        r.raise_for_status()
        repos = r.json()

    # Filter out forks without stars, take top by stars+recency
    filtered = [
        repo for repo in repos
        if not repo.get("fork") or repo.get("stargazers_count", 0) > 0
    ]
    filtered.sort(key=lambda r: (r.get("stargazers_count", 0), r.get("pushed_at", "")), reverse=True)
    return filtered[:max_repos]

async def get_languages(full_name: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
            r = await client.get(f"{GITHUB_API}/repos/{full_name}/languages")
            r.raise_for_status()
            return r.json()
    except Exception:
        return {}

async def get_readme(full_name: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
            r = await client.get(
                f"{GITHUB_API}/repos/{full_name}/readme",
                headers={**_headers(), "Accept": "application/vnd.github.raw+json"}
            )
            if r.status_code == 404:
                return ""
            r.raise_for_status()
            return r.text[:2000]
    except Exception:
        return ""

async def enrich_repos(repos: list[dict], on_progress=None) -> list[dict]:
    enriched = []
    for i, repo in enumerate(repos):
        if on_progress:
            on_progress({"current": i + 1, "total": len(repos), "name": repo["name"]})
        langs = await get_languages(repo["full_name"])
        readme = await get_readme(repo["full_name"])
        enriched.append({
            "name": repo["name"],
            "full_name": repo["full_name"],
            "description": repo.get("description") or "",
            "stars": repo.get("stargazers_count", 0),
            "forks": repo.get("forks_count", 0),
            "language": repo.get("language") or "",
            "languages": list(langs.keys()),
            "pushed_at": repo.get("pushed_at", ""),
            "url": repo.get("html_url", ""),
            "readme_snippet": readme,
            "topics": repo.get("topics", []),
        })
    return enriched

async def get_authenticated_username() -> str | None:
    token = config.get_github_token()
    if not token:
        return None
    try:
        async with httpx.AsyncClient(timeout=10, headers=_headers()) as client:
            r = await client.get(f"{GITHUB_API}/user")
            r.raise_for_status()
            return r.json().get("login")
    except Exception:
        return None
