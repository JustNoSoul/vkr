"""Импорт CSV бенчмарков: python manage.py import_gpu_benchmarks --file путь.csv"""
import shutil
from pathlib import Path

from django.core.management.base import BaseCommand

from catalog.gpu_benchmarks_data import DEFAULT_CSV, load_benchmark_table

DEFAULT_CSV.parent.mkdir(parents=True, exist_ok=True)


class Command(BaseCommand):
    help = f'Загрузить открытую базу бенчмарков GPU в {DEFAULT_CSV.name}'

    def add_arguments(self, parser):
        parser.add_argument('--file', required=True, help='Путь к CSV-файлу')

    def handle(self, *args, **options):
        src = Path(options['file'])
        if not src.is_file():
            self.stderr.write(self.style.ERROR(f'Файл не найден: {src}'))
            return
        shutil.copy2(src, DEFAULT_CSV)
        load_benchmark_table.cache_clear()
        count = len(load_benchmark_table())
        self.stdout.write(self.style.SUCCESS(f'Загружено записей: {count}'))
