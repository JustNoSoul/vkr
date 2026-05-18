from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Чтение разрешено всем (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Запись разрешена только владельцу (у модели Configuration есть поле user)
        return obj.user == request.user