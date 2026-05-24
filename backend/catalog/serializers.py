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

        base = {
            'id': component.id,
            'name': component.name,
            'category': category,
            'manufacturer': component.manufacturer,
        }

        try:
            if category in ('cpus',) and hasattr(component, 'cpu'):
                return {**base, **CPUSerializer(component.cpu).data}
            elif category in ('motherboards',) and hasattr(component, 'motherboard'):
                return {**base, **MotherboardSerializer(component.motherboard).data}
            elif category in ('videocards', 'gpus', 'gpu') and hasattr(component, 'videocard'):
                return {**base, **VideocardSerializer(component.videocard).data}
            elif category in ('memory', 'rams', 'ram') and hasattr(component, 'memory'):
                return {**base, **MemorySerializer(component.memory).data}
            elif category in ('coolers', 'coolings', 'cooling') and hasattr(component, 'cpu_cooler'):
                return {**base, **CPUCoolerSerializer(component.cpu_cooler).data}
            elif category in ('power-supplies', 'psus', 'psu') and hasattr(component, 'power_supply'):
                return {**base, **PowerSupplySerializer(component.power_supply).data}
            elif category in ('storages', 'storage') and hasattr(component, 'storage'):
                return {**base, **StorageSerializer(component.storage).data}
        except Exception as e:
            print(f"Ошибка сериализации дочерних полей для компонента {component.id}: {e}")

        return base

class ConfigurationSerializer(serializers.ModelSerializer):
    # Показываем список предметов внутри конфигурации
    items = ConfigItemSerializer(many=True, read_only=True)
    user_username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Configuration
        fields = [
            'id', 'user', 'user_username', 'name', 'description', 'is_public',
            'total_power', 'has_rgb', 'cooler_count', 'items',
        ]


class PublicConfigurationSerializer(serializers.ModelSerializer):
    """Публичные сборки для главной и просмотра без авторизации."""
    items = ConfigItemSerializer(many=True, read_only=True)
    components_count = serializers.SerializerMethodField()

    class Meta:
        model = Configuration
        fields = [
            'id', 'name', 'description', 'total_power', 'has_rgb', 'cooler_count',
            'components_count', 'items',
        ]

    def get_components_count(self, obj):
        return obj.items.count()


class ConfigurationSaveSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    is_public = serializers.BooleanField(required=False, default=False)
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
            description=validated_data.get('description', ''),
            is_public=validated_data.get('is_public', False),
            total_power=total_power,
            has_rgb=has_rgb,
            cooler_count=cooler_count,
        )
        self._sync_items(configuration, component_ids)
        return configuration

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        if 'description' in validated_data:
            instance.description = validated_data['description']
        if 'is_public' in validated_data:
            instance.is_public = validated_data['is_public']
        instance.total_power = validated_data.get('total_power', instance.total_power)
        instance.has_rgb = validated_data.get('has_rgb', instance.has_rgb)
        instance.cooler_count = validated_data.get('cooler_count', instance.cooler_count)
        instance.save()
        if 'component_ids' in validated_data:
            self._sync_items(instance, validated_data['component_ids'])
        return instance