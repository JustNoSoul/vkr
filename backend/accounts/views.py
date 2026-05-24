from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import RegisterSerializer, UserSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Пользователь успешно зарегистрирован"}, status=status.HTTP_201_CREATED)
        errors = serializer.errors
        if 'username' in errors:
            detail = 'Такой логин уже занят или указан некорректно.'
        elif 'password' in errors:
            detail = 'Пароль не подходит под требования безопасности.'
        else:
            detail = 'Проверьте введённые данные регистрации.'
        return Response({'detail': detail, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated] # Доступ только по валидному токену

    def get(self, request):
        # Возвращает данные текущего авторизованного юзера
        serializer = UserSerializer(request.user)
        return Response(serializer.data)