"""Открытая база бенчмарков видеокарт (G3Dmark) для сопоставления моделей."""
import csv
import re
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / 'data'
DEFAULT_CSV = DATA_DIR / 'gpu_benchmarks.csv'

OPEN_GPU_BENCHMARKS_TITLE = 'Открытая база данных бенчмарков GPU'


def _norm(s):
    return re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()


@lru_cache(maxsize=1)
def load_benchmark_table(csv_path=None):
    path = Path(csv_path) if csv_path else DEFAULT_CSV
    if not path.is_file():
        return []

    rows = []
    with open(path, encoding='utf-8', newline='') as fh:
        reader = csv.DictReader(fh)
        if not reader.fieldnames:
            return []
        fields = {_norm(f): f for f in reader.fieldnames}
        name_key = (
            fields.get('gpu name')
            or fields.get('gpu_name')
            or fields.get('gpu')
            or fields.get('name')
            or fields.get('product name')
        )
        score_key = (
            fields.get('g3dmark')
            or fields.get('g3d mark')
            or fields.get('g3d_mark')
            or fields.get('benchmark')
            or fields.get('score')
        )
        if not name_key or not score_key:
            raise ValueError(
                f'В файле бенчмарков нужны колонки названия GPU и балла. Найдено: {reader.fieldnames}',
            )
        for row in reader:
            name = (row.get(name_key) or '').strip()
            if not name:
                continue
            try:
                score = int(float(str(row.get(score_key) or '0').replace(',', '')))
            except ValueError:
                continue
            if score > 0:
                rows.append({'gpu_name': name, 'g3d_mark': score})
    return rows


def find_gpu_benchmark(manufacturer, name, chipset=None):
    table = load_benchmark_table()
    if not table:
        return None, (
            f'Не найден файл {DEFAULT_CSV.name}. Обратитесь к администратору системы.'
        )

    mfr = (manufacturer or '').strip()
    nm = (name or '').strip()
    chip = (chipset or '').strip()

    candidates = []
    for prefix in (chip, mfr, 'NVIDIA', 'AMD', 'Intel', ''):
        if prefix and nm:
            candidates.append(f'{prefix} {nm}'.strip())
    candidates.append(nm)

    for cand in candidates:
        cn = _norm(cand)
        for row in table:
            rn = _norm(row['gpu_name'])
            if rn == cn or cn in rn or rn in cn:
                return row, None

    tokens = [t for t in _norm(nm).split() if len(t) > 2]
    best, best_score = None, 0
    for row in table:
        rn = _norm(row['gpu_name'])
        hits = sum(1 for t in tokens if t in rn)
        if hits > best_score:
            best_score, best = hits, row
    if best and best_score >= 2:
        return best, None
    return None, f'Видеокарта не найдена в открытой базе бенчмарков: {mfr} {nm}'


def benchmark_percentile(g3d_mark, table=None):
    table = table or load_benchmark_table()
    if not table:
        return None
    scores = sorted(r['g3d_mark'] for r in table)
    if not scores:
        return None
    below = sum(1 for s in scores if s <= g3d_mark)
    return round(100 * below / len(scores))
