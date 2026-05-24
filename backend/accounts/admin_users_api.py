from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRole

User = get_user_model()


class AdminUsersView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        users = User.objects.order_by('username').values(
            'id', 'username', 'role', 'is_staff', 'is_superuser', 'is_active', 'date_joined',
        )
        return Response(list(users))

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        if not username or not password:
            return Response(
                {'detail': 'Укажите username и password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=username).exists():
            return Response(
                {'detail': 'Пользователь с таким логином уже существует.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.create_user(
            username=username,
            password=password,
            role='admin',
            is_staff=True,
            is_superuser=True,
        )
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'message': 'Администратор создан.',
            },
            status=status.HTTP_201_CREATED,
        )


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Пользователь не найден.'}, status=404)

        new_role = request.data.get('role')
        if new_role is not None:
            if new_role not in ('user', 'admin'):
                return Response({'detail': 'Роль: user или admin.'}, status=400)
            if user.role == 'admin' and new_role == 'user':
                admins_left = User.objects.filter(role='admin').exclude(pk=user.pk).count()
                if admins_left < 1:
                    return Response(
                        {'detail': 'Нельзя снять роль у последнего администратора.'},
                        status=400,
                    )
            user.role = new_role
            user.is_staff = new_role == 'admin'
            if new_role == 'admin':
                user.is_superuser = True

        if 'is_active' in request.data:
            user.is_active = bool(request.data['is_active'])

        if request.data.get('password'):
            user.set_password(request.data['password'])

        user.save()
        return Response({
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'is_active': user.is_active,
        })

    def delete(self, request, pk):
        if str(request.user.pk) == str(pk):
            return Response({'detail': 'Нельзя удалить свою учётную запись.'}, status=400)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Пользователь не найден.'}, status=404)
        if user.role == 'admin' and User.objects.filter(role='admin').count() <= 1:
            return Response({'detail': 'Нельзя удалить последнего администратора.'}, status=400)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
