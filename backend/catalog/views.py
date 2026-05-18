from rest_framework import viewsets
from .models import *
from .serializers import *
from .permissions import IsOwnerOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend

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
class ConfigurationViewSet(viewsets.ModelViewSet):
    queryset = Configuration.objects.all()
    serializer_class = ConfigurationSerializer

class ConfigItemViewSet(viewsets.ModelViewSet):
    queryset = Config_Item.objects.all()
    serializer_class = ConfigItemSerializer
class ConfigurationViewSet(viewsets.ModelViewSet):
    queryset = Configuration.objects.all()
    serializer_class = ConfigurationSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
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