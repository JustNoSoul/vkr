# Используем официальный образ Python
FROM cr.yandex/mirror/python:3.11-slim

# Устанавливаем переменные окружения, чтобы Python не создавал файлы .pyc и выводил логи сразу
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Устанавливаем системные зависимости для работы PostgreSQL (psycopg2)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копируем файл зависимостей
COPY requirements.txt .

# Устанавливаем библиотеки
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код проекта в контейнер
COPY . .

# Команда для запуска сервера (используем 0.0.0.0, чтобы доступ был снаружи контейнера)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]