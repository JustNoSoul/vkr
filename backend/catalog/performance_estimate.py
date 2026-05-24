"""
Проверка сборки на соответствие минимальным требованиям типичных приложений.
Сравнение видеокарт — по открытой базе бенчмарков (балл G3Dmark).
"""
from catalog.gpu_benchmarks_data import (
    OPEN_GPU_BENCHMARKS_TITLE,
    benchmark_percentile,
    find_gpu_benchmark,
    load_benchmark_table,
)

APPLICATIONS = [
    {
        'id': 'blender',
        'name': 'Blender',
        'min_g3d': 8000,
        'min_vram_gb': 4,
        'min_cpu_cores': 4,
        'min_ram_gb': 16,
        'gpu_weight': 0.9,
    },
    {
        'id': 'cs2',
        'name': 'Counter-Strike 2',
        'min_g3d': 3500,
        'min_vram_gb': 2,
        'min_cpu_cores': 4,
        'min_ram_gb': 8,
        'gpu_weight': 0.7,
    },
    {
        'id': 'dota2',
        'name': 'Dota 2',
        'min_g3d': 1500,
        'min_vram_gb': 2,
        'min_cpu_cores': 2,
        'min_ram_gb': 4,
        'gpu_weight': 0.5,
    },
    {
        'id': 'visual_studio',
        'name': 'Visual Studio',
        'min_g3d': 1200,
        'min_vram_gb': 2,
        'min_cpu_cores': 4,
        'min_ram_gb': 8,
        'gpu_weight': 0.3,
    },
    {
        'id': 'cyberpunk',
        'name': 'Cyberpunk 2077',
        'min_g3d': 12000,
        'min_vram_gb': 6,
        'min_cpu_cores': 6,
        'min_ram_gb': 16,
        'gpu_weight': 1.0,
    },
    {
        'id': 'premiere',
        'name': 'Adobe Premiere Pro',
        'min_g3d': 7000,
        'min_vram_gb': 4,
        'min_cpu_cores': 6,
        'min_ram_gb': 16,
        'gpu_weight': 0.85,
    },
]


def _status_for_ratio(ratio):
    if ratio >= 1.15:
        return 'ok', 'С запасом'
    if ratio >= 1.0:
        return 'ok', 'Соответствует'
    if ratio >= 0.85:
        return 'warning', 'На грани'
    return 'fail', 'Ниже минимума'


def _check_application(app, g3d_mark, vram_gb, cpu_cores, ram_gb):
    issues = []
    ratios = []

    if g3d_mark < app['min_g3d']:
        issues.append(f"GPU {g3d_mark} < {app['min_g3d']}")
    ratios.append(g3d_mark / app['min_g3d'])

    if vram_gb < app['min_vram_gb']:
        issues.append(f"VRAM {vram_gb} ГБ < {app['min_vram_gb']} ГБ")
    ratios.append(vram_gb / app['min_vram_gb'])

    if cpu_cores < app['min_cpu_cores']:
        issues.append(f"CPU {cpu_cores} яд. < {app['min_cpu_cores']}")
    ratios.append(cpu_cores / app['min_cpu_cores'])

    if ram_gb < app['min_ram_gb']:
        issues.append(f"RAM {ram_gb} ГБ < {app['min_ram_gb']} ГБ")
    ratios.append(ram_gb / app['min_ram_gb'])

    weighted = (
        ratios[0] * app['gpu_weight']
        + sum(ratios[1:]) * (1 - app['gpu_weight']) / 3
    )
    status, label = _status_for_ratio(weighted)

    return {
        'id': app['id'],
        'name': app['name'],
        'status': status,
        'label': label,
        'min_g3d': app['min_g3d'],
        'user_g3d': g3d_mark,
        'detail': '; '.join(issues) if issues else label,
    }


def estimate_performance(
    cpu_manufacturer='',
    cpu_name='',
    gpu_manufacturer='',
    gpu_name='',
    gpu_chipset=None,
    gpu_vram_gb=8,
    cpu_cores=6,
    cpu_boost_ghz=3.5,
    ram_total_gb=16,
    mem_channels=2,
    mem_frequency=3200,
):
    del cpu_manufacturer, cpu_name, cpu_boost_ghz, mem_channels, mem_frequency

    bench, err = find_gpu_benchmark(gpu_manufacturer, gpu_name, gpu_chipset)
    if err:
        return {'available': False, 'message': err}

    g3d = bench['g3d_mark']
    vram = max(1, int(gpu_vram_gb or 8))
    cores = max(1, int(cpu_cores or 4))
    ram = max(1, int(ram_total_gb or 8))

    apps = [_check_application(a, g3d, vram, cores, ram) for a in APPLICATIONS]
    fails = [a for a in apps if a['status'] == 'fail']
    warnings = [a for a in apps if a['status'] == 'warning']

    if fails:
        overall = 'fail'
    elif warnings:
        overall = 'warning'
    else:
        overall = 'ok'

    return {
        'available': True,
        'source': OPEN_GPU_BENCHMARKS_TITLE,
        'matched_gpu': bench['gpu_name'],
        'g3d_mark': g3d,
        'benchmark_percentile': benchmark_percentile(g3d),
        'overall_status': overall,
        'applications': apps,
        'disclaimer': (
            'Оценка основана на открытой базе бенчмарков видеокарт и типовых системных требованиях '
            'приложений. Реальная производительность зависит от настроек, драйверов и охлаждения.'
        ),
    }
