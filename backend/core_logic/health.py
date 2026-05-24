"""Проверки работоспособности приложения (БД и ресурсы хоста)."""
import logging
import time

import psutil
from django.db import connection
from django.http import JsonResponse
from django.views import View

logger = logging.getLogger('vkr.health')


def check_database():
    start = time.perf_counter()
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
        cursor.fetchone()
    ms = round((time.perf_counter() - start) * 1000, 2)
    return {'ok': True, 'latency_ms': ms}


def check_system_resources():
    cpu = psutil.cpu_percent(interval=0.2)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    return {
        'cpu_percent': cpu,
        'ram_percent': mem.percent,
        'ram_used_gb': round(mem.used / (1024 ** 3), 2),
        'disk_percent': disk.percent,
        'disk_free_gb': round(disk.free / (1024 ** 3), 2),
    }


def run_app_health_check():
    result = {
        'status': 'ok',
        'database': {},
        'resources': {},
        'warnings': [],
    }
    try:
        result['database'] = check_database()
    except Exception as exc:
        result['database'] = {'ok': False, 'error': str(exc)}
        result['status'] = 'degraded'

    try:
        result['resources'] = check_system_resources()
        res = result['resources']
        if res.get('cpu_percent', 0) > 90:
            result['warnings'].append('Высокая загрузка CPU')
        if res.get('ram_percent', 0) > 90:
            result['warnings'].append('Высокая загрузка RAM')
        if res.get('disk_percent', 0) > 90:
            result['warnings'].append('Мало места на диске')
    except Exception as exc:
        result['resources'] = {'ok': False, 'error': str(exc)}
        result['status'] = 'degraded'

    if result['warnings'] and result['status'] == 'ok':
        result['status'] = 'degraded'

    return result


class HealthCheckView(View):
    def get(self, request):
        payload = run_app_health_check()
        code = 200 if payload['status'] == 'ok' else 503
        return JsonResponse(payload, status=code)


class HealthPingView(View):
    def get(self, request):
        return JsonResponse({'status': 'ok', 'message': 'Сервис доступен'})
