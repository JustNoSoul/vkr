from rest_framework import serializers
from .models import * # Импортируем всё для удобства
import re
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
    real_device_count = serializers.SerializerMethodField()
    class Meta:
        model = Memory
        fields = '__all__'
    def get_real_device_count(self, obj):
        # Ищем паттерны типа "2x8", "4x16", "2 x 32" в названии (регистронезависимо)
        match = re.search(r'(\d+)\s*[xхXХ]\s*\d+', obj.name)
        if match:
            return int(match.group(1)) # Возвращает 2 или 4
        return 1 # По дефолту 1 плашка
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
    component_name = serializers.ReadOnlyField(source='component.name')
    # Добавляем новое динамическое поле, которое само соберет все характеристики
    component_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Config_Item
        fields = ['id', 'configuration', 'component', 'component_name', 'component_details']

    def get_component_details(self, obj):
        component = obj.component
        category = component.category
        
        try:
            if category == 'cpus' and hasattr(component, 'cpu'):
                return CPUSerializer(component.cpu).data
            elif category == 'motherboards' and hasattr(component, 'motherboard'):
                return MotherboardSerializer(component.motherboard).data
            elif category == 'videocards' and hasattr(component, 'videocard'):
                return VideocardSerializer(component.videocard).data
            elif category == 'memory' and hasattr(component, 'memory'):
                return MemorySerializer(component.memory).data
            elif category == 'coolers' and hasattr(component, 'cpu_cooler'):
                return CPUCoolerSerializer(component.cpu_cooler).data
            elif category == 'power-supplies' and hasattr(component, 'power_supply'):
                return PowerSupplySerializer(component.power_supply).data
            elif category == 'storages' and hasattr(component, 'storage'):
                return StorageSerializer(component.storage).data
        except Exception as e:
            print(f"Ошибка сериализации дочерних полей для компонента {component.id}: {e}")
            
        # Если дочерняя модель не найдена, отдаем хотя бы базовые поля (id, name, category)
        return ComponentSerializer(component).data

class ConfigurationSerializer(serializers.ModelSerializer):
    # Показываем список предметов внутри конфигурации
    items = ConfigItemSerializer(many=True, read_only=True)
    user_username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Configuration
        fields = ['id', 'user', 'user_username', 'name', 'is_public', 'total_power', 'has_rgb', 'cooler_count', 'items']
class ConfigurationSaveSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    total_power = serializers.IntegerField(required=False, default=0)
    component_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    has_rgb = serializers.BooleanField(required=False, default=False)
    cooler_count = serializers.IntegerField(required=False, default=0)

    def _sync_items(self, configuration, component_ids):
        valid_component_ids = [c_id for c_id in component_ids if c_id is not None]
        components_map = {
            c.id: c for c in Component.objects.filter(id__in=valid_component_ids)
        }
        configuration.items.all().delete()
        config_items = []
        for c_id in valid_component_ids:
            component_obj = components_map.get(c_id)
            if component_obj:
                config_items.append(
                    Config_Item(configuration=configuration, component=component_obj)
                )
        if config_items:
            Config_Item.objects.bulk_create(config_items)

    def create(self, validated_data):
        user = self.context['request'].user
        name = validated_data.get('name')
        total_power = validated_data.get('total_power', 0)
        component_ids = validated_data.get('component_ids', [])
        has_rgb = validated_data.get('has_rgb', False)
        cooler_count = validated_data.get('cooler_count', 0)

        configuration = Configuration.objects.create(
            user=user,
            name=name,
            total_power=total_power,
            has_rgb=has_rgb,
            cooler_count=cooler_count,
        )
        self._sync_items(configuration, component_ids)
        return configuration

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.total_power = validated_data.get('total_power', instance.total_power)
        instance.has_rgb = validated_data.get('has_rgb', instance.has_rgb)
        instance.cooler_count = validated_data.get('cooler_count', instance.cooler_count)
        instance.save()
        if 'component_ids' in validated_data:
            self._sync_items(instance, validated_data['component_ids'])
        return instance