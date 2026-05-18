from django_filters import rest_framework as filters
from .models import CPU, Motherboard, Memory, Videocard, CPU_Cooler, Power_Supply, Storage

class CPUFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = CPU
        fields = '__all__' 

class MotherboardFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = Motherboard
        fields = '__all__'

class MemoryFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = Memory
        fields = '__all__'

class VideocardFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = Videocard
        fields = '__all__'

class CoolerFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = CPU_Cooler
        fields = '__all__'

class PSUFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = Power_Supply
        fields = '__all__'
        
class StorageFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = Storage
        fields = '__all__'