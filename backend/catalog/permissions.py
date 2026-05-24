from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user


class IsConfigurationOwner(permissions.BasePermission):
    """Доступ к конфигурации только владельцу (чтение и изменение)."""
    message = 'У вас нет доступа к этой конфигурации.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id