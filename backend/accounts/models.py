from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Отключаем email на уровне модели Django
    email = None 
    
    ROLE_CHOICES = [
        ('user', 'Обычный пользователь'),
        ('admin', 'Администратор'),
    ]
    
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='user',
        verbose_name="Роль"
    )

    # Указываем, что для авторизации нужен только username
    REQUIRED_FIELDS = [] 

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"