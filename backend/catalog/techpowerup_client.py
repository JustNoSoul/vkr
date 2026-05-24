"""Поиск видеокарт во внешнем открытом каталоге (для админ-панели)."""
import json
import os
import re
import urllib.error
import urllib.request
from functools import lru_cache

DEFAULT_GPU_CATALOG_URL = (
    'https://raw.githubusercontent.com/RightNow-AI/RightNow-GPU-Database/main/data/all-gpus.json'
)


def _norm(s):
    return re.sub(r'\s+', ' ', str(s or '').lower()).strip()


def _fetch_json_url(url, timeout=60, retries=3):
    last_err = None
    for _ in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'VKR-Configurator/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
            last_err = exc
    raise RuntimeError(str(last_err))


@lru_cache(maxsize=1)
def _load_gpu_catalog():
    url = os.environ.get('TECHPOWERUP_GPU_JSON_URL', DEFAULT_GPU_CATALOG_URL)
    data = _fetch_json_url(url)
    if isinstance(data, list):
        return data
    return data.get('gpus') or data.get('data') or []


def _search_in_catalog(catalog, query, limit, name_keys=('name',)):
    q = _norm(query)
    if not q or len(q) < 2:
        return []
    scored = []
    for item in catalog:
        texts = [_norm(item.get(k, '')) for k in name_keys]
        if not any(q in t for t in texts if t):
            continue
        primary = texts[0] if texts else ''
        if primary == q:
            score = 100
        elif primary.startswith(q):
            score = 50
        else:
            score = 10
        scored.append((score, item))
    scored.sort(key=lambda x: (-x[0], x[1].get('name', '')))
    return [x[1] for x in scored[:limit]]


def search_gpus(query, limit=25):
    return [_map_gpu_to_draft(x) for x in _search_in_catalog(_load_gpu_catalog(), query, limit, ('name', 'gpuName'))]


def search_external(kind, query, limit=25):
    kind = (kind or 'gpu').lower()
    if kind in ('gpu', 'gpus', 'videocard'):
        return search_gpus(query, limit)
    raise ValueError('Доступен только поиск видеокарт (gpu)')


def _map_gpu_to_draft(item):
    mem_gb = int(float(item.get('memorySize') or 8))
    tdp = int(float(item.get('tdp') or 200))
    boost = int(float(item.get('boostClock') or 2000))
    length = int(float(item.get('length') or 280))
    vendor = (item.get('vendor') or item.get('manufacturer') or 'Unknown').upper()
    chipset = {'NVIDIA': 'NVIDIA', 'AMD': 'AMD', 'INTEL': 'Intel'}.get(vendor, vendor)
    return {
        'import_kind': 'gpus',
        'source': 'techpowerup_gpu',
        'source_url': item.get('url') or '',
        'category': 'gpus',
        'manufacturer': item.get('manufacturer') or vendor.title(),
        'name': item.get('name') or 'GPU',
        'gpu_chip': item.get('gpuName') or '',
        'chipset': chipset,
        'capacity': mem_gb,
        'pcie': str(item.get('busInterface') or 'PCIe 4.0 x16'),
        'form_factor': item.get('slot') or 'ATX',
        'tdp': tdp,
        'power_connectors': str(item.get('powerConnectors') or '1x 8-pin'),
        'length': length,
        'outputs': item.get('displayOutputs') or '',
        'boost_clock': boost,
    }
