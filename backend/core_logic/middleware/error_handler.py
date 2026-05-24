"""Перехват необработанных исключений Django."""
import logging
import traceback

from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger('vkr.errors')


class ErrorHandlerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        logger.error(
            'Необработанное исключение: %s %s\n%s',
            request.method,
            request.path,
            traceback.format_exc(),
        )

        if request.path.startswith('/api/'):
            detail = 'Внутренняя ошибка сервера. Попробуйте позже.'
            if settings.DEBUG:
                detail = f'{type(exception).__name__}: {exception}'
            return JsonResponse({'detail': detail}, status=500)

        return None
