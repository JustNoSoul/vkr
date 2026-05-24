from django.db import models
from django.conf import settings

class Component(models.Model):
    category = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    manufacturer = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class CPU(Component):
    socket = models.CharField(max_length=50)
    cores = models.IntegerField()
    threads = models.IntegerField()
    base_clock_ghz = models.FloatField()
    boost_clock_ghz = models.FloatField()
    l3_cache_mb = models.IntegerField()
    tdp = models.IntegerField()
    integrated_graphics = models.BooleanField(default=False)
    memory_channels = models.IntegerField()

class Motherboard(Component):
    socket = models.CharField(max_length=50)
    chipset = models.CharField(max_length=50)
    form_factor = models.CharField(max_length=50)
    ram_slots = models.IntegerField()
    ram_max = models.IntegerField() # На схеме maxmemory
    ram_type = models.CharField(max_length=20)
    ram_speed = models.IntegerField()
    pcie_ver = models.CharField(max_length=20)
    pcie_slots = models.IntegerField()
    m2_slots = models.IntegerField()
    m2_type = models.CharField(max_length=50)
    sata_ports = models.IntegerField()
    wifi = models.BooleanField(default=False)
    bluetooth = models.BooleanField(default=False)

class Videocard(Component):
    gpu_chip = models.CharField(max_length=100)
    chipset = models.CharField(max_length=100)
    capacity = models.IntegerField()
    pcie = models.CharField(max_length=20)
    form_factor = models.CharField(max_length=50)
    tdp = models.IntegerField()
    power_connectors = models.CharField(max_length=100)
    length = models.IntegerField()
    outputs = models.CharField(max_length=200)
    boost_clock = models.IntegerField()

class Memory(Component):
    type = models.CharField(max_length=20)
    capacity = models.IntegerField()
    speed_mhz = models.IntegerField()
    timings = models.CharField(max_length=100)
    voltage = models.FloatField()

class CPU_Cooler(Component):
    height = models.IntegerField()
    fan_speed = models.CharField(max_length=100)
    noise_level = models.FloatField()
    tdp = models.IntegerField()
    socket = models.CharField(max_length=255)

class Power_Supply(Component):
    wattage = models.IntegerField()
    efficiency_rating = models.CharField(max_length=100)
    connectors_24pin = models.IntegerField()
    connectors_cpu4_4pin = models.IntegerField()
    connectors_cpu_8pin = models.IntegerField()
    connectors_pcie_6_2pin = models.IntegerField()
    connectors_pcie_8pin = models.IntegerField()
    connectors_pcie_12pin = models.IntegerField()
    connectors_sata = models.IntegerField()

class Storage(Component):
    type = models.CharField(max_length=50)
    form_factor = models.CharField(max_length=50)
    capacity = models.IntegerField()
    interface = models.CharField(max_length=50)
    read_speed = models.IntegerField()
    write_speed = models.IntegerField()

class Configuration(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_public = models.BooleanField(default=False)
    total_power = models.IntegerField(default=0)
    has_rgb = models.BooleanField(default=False)
    cooler_count = models.IntegerField(default=0)

class Config_Item(models.Model):
    configuration = models.ForeignKey(Configuration, on_delete=models.CASCADE, related_name='items')
    component = models.ForeignKey(Component, on_delete=models.CASCADE)