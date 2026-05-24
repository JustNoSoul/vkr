from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role']  # Убрали email отсюда


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password']  # Только логин и пароль

    def create(self, validated_data):
        # Создаем пустой объект пользователя
        user = User(username=validated_data['username'])
        # Хэшируем пароль вручную (чтобы он не хранился в открытом виде!)
        user.set_password(validated_data['password'])
        user.save()
        return user