from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import *
from .serializers import *
from .permissions import IsConfigurationOwner
from .services import check_configuration_limit
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .serializers import (
    ConfigurationSerializer,
    ConfigurationSaveSerializer,
    PublicConfigurationSerializer,
)

class CPUViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CPU.objects.all()
    serializer_class = CPUSerializer

class MotherboardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Motherboard.objects.all()
    serializer_class = MotherboardSerializer

class VideocardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Videocard.objects.all()
    serializer_class = VideocardSerializer

class MemoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Memory.objects.all()
    serializer_class = MemorySerializer

class CPUCoolerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CPU_Cooler.objects.all()
    serializer_class = CPUCoolerSerializer

class PowerSupplyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Power_Supply.objects.all()
    serializer_class = PowerSupplySerializer

class StorageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Storage.objects.all()
    serializer_class = StorageSerializer
class PublicConfigurationViewSet(viewsets.ReadOnlyModelViewSet):
    """Готовые сборки администратора (is_public=True), доступны без входа."""
    serializer_class = PublicConfigurationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Configuration.objects.filter(is_public=True)
            .prefetch_related('items__component')
            .order_by('-id')
        )


class ConfigurationViewSet(viewsets.ModelViewSet):
    queryset = Configuration.objects.all()
    permission_classes = [IsAuthenticated, IsConfigurationOwner]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ConfigurationSaveSerializer
        return ConfigurationSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Configuration.objects.none()
        return Configuration.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        limit_msg = check_configuration_limit(request.user)
        if limit_msg:
            return Response({'detail': limit_msg}, status=400)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        output = ConfigurationSerializer(instance, context=self.get_serializer_context())
        return Response(output.data, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        output = ConfigurationSerializer(instance, context=self.get_serializer_context())
        return Response(output.data)


class ConfigItemViewSet(viewsets.ModelViewSet):
    queryset = Config_Item.objects.all()
    serializer_class = ConfigItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Config_Item.objects.none()
        return Config_Item.objects.filter(configuration__user=self.request.user)
from .filters import (
    CPUFilter, MotherboardFilter, MemoryFilter, 
    VideocardFilter, CoolerFilter, PSUFilter, StorageFilter
)

class CPUViewSet(viewsets.ModelViewSet):
    queryset = CPU.objects.all()
    serializer_class = CPUSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CPUFilter

class MotherboardViewSet(viewsets.ModelViewSet):
    queryset = Motherboard.objects.all()
    serializer_class = MotherboardSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = MotherboardFilter

class MemoryViewSet(viewsets.ModelViewSet):
    queryset = Memory.objects.all()
    serializer_class = MemorySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = MemoryFilter

class VideocardViewSet(viewsets.ModelViewSet):
    queryset = Videocard.objects.all()
    serializer_class = VideocardSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = VideocardFilter

class CPUCoolerViewSet(viewsets.ModelViewSet):
    queryset = CPU_Cooler.objects.all()
    serializer_class = CPUCoolerSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CoolerFilter

class PowerSupplyViewSet(viewsets.ModelViewSet):
    queryset = Power_Supply.objects.all()
    serializer_class = PowerSupplySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = PSUFilter

class StorageViewSet(viewsets.ModelViewSet):
    queryset = Storage.objects.all()
    serializer_class = StorageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = StorageFilter


class PerformanceEstimateView(APIView):
    """Соответствие минимальным требованиям типичных приложений."""
    permission_classes = [AllowAny]

    def post(self, request):
        from .performance_estimate import estimate_performance

        data = request.data
        ram_modules = data.get('ram_modules_gb') or []
        if isinstance(ram_modules, list) and ram_modules:
            ram_total = sum(int(x) for x in ram_modules if x)
        else:
            ram_total = int(data.get('ram_total_gb') or 16)

        result = estimate_performance(
            cpu_manufacturer=data.get('cpu_manufacturer', ''),
            cpu_name=data.get('cpu_name', ''),
            gpu_manufacturer=data.get('gpu_manufacturer', ''),
            gpu_name=data.get('gpu_name', ''),
            gpu_chipset=data.get('gpu_chipset'),
            gpu_vram_gb=int(data.get('gpu_vram_gb') or data.get('gpu_capacity') or 8),
            cpu_cores=int(data.get('cpu_cores') or 6),
            cpu_boost_ghz=float(data.get('cpu_boost_ghz') or 3.5),
            ram_total_gb=ram_total,
            mem_channels=int(data.get('mem_channels') or 2),
            mem_frequency=int(data.get('mem_frequency') or data.get('ram_mhz') or 3200),
        )
        return Response(result)
