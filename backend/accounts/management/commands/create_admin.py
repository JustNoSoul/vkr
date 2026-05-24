"""Создание администратора без поля email.

Примеры:
  python manage.py create_admin --username myadmin --password secret
  python manage.py create_admin --username myadmin   # пароль запросит интерактивно
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Создаёт пользователя с ролью admin (обход проблемы email в createsuperuser)'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True, help='Логин')
        parser.add_argument('--password', default='', help='Пароль (если пусто — запрос в консоли)')

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']
        password = options['password'] or None
        if not password:
            from getpass import getpass
            password = getpass('Пароль: ')
            confirm = getpass('Повтор пароля: ')
            if password != confirm:
                self.stderr.write(self.style.ERROR('Пароли не совпадают'))
                return

        user, created = User.objects.get_or_create(username=username)
        user.role = 'admin'
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'Админ «{username}» создан'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Админ «{username}» обновлён (роль и пароль)'))
