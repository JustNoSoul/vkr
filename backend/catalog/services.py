from django.contrib.auth import get_user_model

User = get_user_model()
MAX_USER_CONFIGURATIONS = 5


def is_admin(user):
    if not user or not user.is_authenticated:
        return False
    return (
        getattr(user, 'role', None) == 'admin'
        or getattr(user, 'is_superuser', False)
        or getattr(user, 'is_staff', False)
    )


def check_configuration_limit(user):
    """None — можно создать; иначе текст ошибки."""
    if is_admin(user):
        return None
    count = user.configuration_set.count()
    if count >= MAX_USER_CONFIGURATIONS:
        return (
            f'Лимит исчерпан: не более {MAX_USER_CONFIGURATIONS} личных конфигураций. '
            'Удалите одну из сборок в личном кабинете.'
        )
    return None
