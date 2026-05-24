from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    message = 'Доступ только для администратора.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, 'role', None) == 'admin'
                or getattr(request.user, 'is_superuser', False)
            )
        )
