from __future__ import annotations

import asyncio
import logging
import urllib.parse
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _query_duckduckgo_sync(query: str, max_results: int = 10, region: str = "id-id") -> List[Dict[str, Any]]:
    """
    Synchronous helper using the ddgs library to fetch search results.
    Configured with verify=False to prevent TLS version issues on macOS / LibreSSL.
    """
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        results: List[Dict[str, Any]] = []
        try:
            ddgs_client = DDGS(verify=False)
            raw = list(ddgs_client.text(query, max_results=max_results, region=region))
        except TypeError:
            ddgs_client = DDGS()
            raw = list(ddgs_client.text(query, max_results=max_results, region=region))

        for item in raw:
            url = item.get("href") or item.get("url") or ""
            if not url:
                continue
            hostname = urllib.parse.urlparse(url).netloc or "DuckDuckGo"
            results.append({
                "title": item.get("title", ""),
                "url": url,
                "description": item.get("body", "") or item.get("description", ""),
                "meta_url": {"hostname": hostname},
                "source": hostname,
                "engine": "duckduckgo",
            })
        return results
    except Exception as exc:
        logger.warning(f"DuckDuckGo search error for query '{query}': {exc}")
        return []


async def search_duckduckgo_async(query: str, max_results: int = 10, region: str = "id-id") -> List[Dict[str, Any]]:
    """Run synchronous DuckDuckGo search in an async background thread."""
    return await asyncio.to_thread(_query_duckduckgo_sync, query, max_results, region)


async def search_web_with_fallback(
    query: str,
    count: int = 10,
    client: Optional[httpx.AsyncClient] = None,
    country: str = "ID",
) -> List[Dict[str, Any]]:
    """
    Search the web using Brave Search first.
    If Brave Search fails (quota reached 429, invalid key 401, timeout, or key not configured),
    automatically and seamlessly fall back to DuckDuckGo.
    """
    # 1. Attempt Brave Search if API key is present
    if settings.BRAVE_SEARCH_API_KEY:
        try:
            headers = {
                "X-Subscription-Token": settings.BRAVE_SEARCH_API_KEY,
                "Accept": "application/json",
                "User-Agent": f"{settings.APP_NAME}/{settings.APP_VERSION} (market search)",
            }
            params = {"q": query, "count": count, "country": country, "result_filter": "web"}
            brave_url = "https://api.search.brave.com/res/v1/web/search"

            if client:
                res = await client.get(brave_url, params=params, headers=headers)
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=3.0)) as standalone_client:
                    res = await standalone_client.get(brave_url, params=params, headers=headers)

            if res.status_code == 200:
                brave_data = res.json()
                results = brave_data.get("web", {}).get("results", [])
                if results:
                    for item in results:
                        item["engine"] = "brave"
                    return results
            else:
                logger.warning(
                    f"Brave Search returned status {res.status_code} ({res.text[:120]}). "
                    "Auto-fallback to DuckDuckGo."
                )
        except Exception as exc:
            logger.warning(f"Brave Search error ({exc}). Auto-fallback to DuckDuckGo.")

    # 2. Fallback to DuckDuckGo
    return await search_duckduckgo_async(query, max_results=count)


def classify_result_type(url: str, title: str) -> str:
    """Classify result into 'social', 'negative', 'news', or 'article'."""
    url_lower = url.lower()
    title_lower = title.lower()

    if any(soc in url_lower for soc in ["facebook.com", "instagram.com", "linkedin.com", "tiktok.com", "twitter.com", "x.com"]):
        return "social"
    if any(leg in url_lower or leg in title_lower for leg in [
        "mahkamahagung", "putusan", "polri", "kejaksaan", "kasus", "sidang", "tersangka", "sengketa", "penipuan", "pailit", "buron"
    ]):
        return "negative"
    if any(med in url_lower for med in [
        "detik.com", "kompas.com", "tribunnews.com", "jawapos.com", "balipost.com", "nusabali.com", "radarbali", "antara"
    ]):
        return "news"
    return "article"
