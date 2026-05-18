from rest_framework import serializers
from .models import * # Импортируем всё для удобства

class ComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Component
        fields = '__all__'

class CPUSerializer(serializers.ModelSerializer):
    class Meta:
        model = CPU
        fields = '__all__'

class MotherboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motherboard
        fields = '__all__'

class VideocardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Videocard
        fields = '__all__'

class MemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Memory
        fields = '__all__'

class CPUCoolerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CPU_Cooler
        fields = '__all__'

class PowerSupplySerializer(serializers.ModelSerializer):
    class Meta:
        model = Power_Supply
        fields = '__all__'

class StorageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Storage
        fields = '__all__'
class ConfigItemSerializer(serializers.ModelSerializer):
    # Добавляем детали компонента, чтобы фронтенд сразу знал название
    component_name = serializers.ReadOnlyField(source='component.name')
    
    class Meta:
        model = Config_Item
        fields = ['id', 'configuration', 'component', 'component_name']

class ConfigurationSerializer(serializers.ModelSerializer):
    # Показываем список предметов внутри конфигурации
    items = ConfigItemSerializer(many=True, read_only=True)
    user_username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Configuration
        fields = ['id', 'user', 'user_username', 'name', 'is_public', 'total_power', 'items']