"""Русские сообщения об ошибках API."""
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import (
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    Throttled,
)


def _ru_detail(data):
    if isinstance(data, str):
        return _translate_string(data)
    if isinstance(data, list):
        return [_translate_string(x) if isinstance(x, str) else x for x in data]
    if isinstance(data, dict):
        return {k: _ru_detail(v) for k, v in data.items()}
    return data


def _translate_string(msg):
    mapping = {
        'Authentication credentials were not provided.': 'Требуется авторизация.',
        'Given token not valid for any token type': 'Недействительный или просроченный токен.',
        'No active account found with the given credentials': 'Неверный логин или пароль.',
        'User not found': 'Пользователь не найден.',
        'Not found.': 'Объект не найден.',
        'You do not have permission to perform this action.': 'Недостаточно прав для этого действия.',
    }
    return mapping.get(msg, msg)


def russian_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, NotAuthenticated):
        response.data = {'detail': 'Требуется авторизация. Войдите в систему.'}
    elif isinstance(exc, AuthenticationFailed):
        response.data = {'detail': 'Ошибка авторизации. Проверьте логин и пароль.'}
    elif isinstance(exc, PermissionDenied):
        response.data = {'detail': 'Доступ запрещён.'}
    elif isinstance(exc, NotFound):
        response.data = {'detail': 'Запрашиваемый объект не найден.'}
    elif isinstance(exc, Throttled):
        response.data = {'detail': 'Слишком много запросов. Повторите позже.'}
    elif isinstance(exc, ValidationError):
        response.data = {'detail': 'Ошибка проверки данных.', 'errors': _ru_detail(response.data)}
    else:
        response.data = _ru_detail(response.data)

    if isinstance(response.data, dict) and 'detail' not in response.data and 'message' not in response.data:
        if len(response.data) == 1 and 'detail' in str(response.data):
            pass

    return response
