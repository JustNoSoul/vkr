from django.db import models
from django.conf import settings

# Базовая модель компонента
class Component(models.Model):
    category = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    manufacturer = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.manufacturer} {self.name}"

# Процессор
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

# Материнская плата
class Motherboard(Component):
    socket = models.CharField(max_length=50)
    chipset = models.CharField(max_length=50)
    form_factor = models.CharField(max_length=50)
    ram_slots = models.IntegerField()
    ram_max = models.IntegerField()
    ram_type = models.CharField(max_length=20) # DDR4, DDR5
    ram_speed = models.IntegerField()
    pcie_ver = models.CharField(max_length=20)
    pcie_slots = models.IntegerField()
    m2_slots = models.IntegerField()
    m2_type = models.CharField(max_length=50) # NVMe, SATA
    sata_ports = models.IntegerField()
    wifi = models.BooleanField(default=False)
    bluetooth = models.BooleanField(default=False)

# Видеокарта
class Videocard(Component):
    gpu_chip = models.CharField(max_length=100)
    chipset = models.CharField(max_length=100)
    capacity = models.IntegerField(help_text="VRAM size in GB")
    pcie = models.CharField(max_length=20)
    form_factor = models.CharField(max_length=50)
    tdp = models.IntegerField()
    power_connectors = models.CharField(max_length=100)
    length = models.IntegerField()
    outputs = models.CharField(max_length=200)
    boost_clock = models.IntegerField()

# Оперативная память
class Memory(Component):
    type = models.CharField(max_length=20) # DDR4, DDR5
    capacity = models.IntegerField(help_text="Total capacity in GB")
    speed_mhz = models.IntegerField()
    timings = models.CharField(max_length=100)
    voltage = models.FloatField()

# Кулер для процессора
class CPU_Cooler(Component):
    height = models.IntegerField()
    fan_speed = models.CharField(max_length=100)
    noise_level = models.FloatField()
    tdp = models.IntegerField()
    socket = models.CharField(max_length=255) # Поддерживаемые сокеты

# Блок питания
class Power_Supply(Component):
    wattage = models.IntegerField()
    efficiency_rating = models.CharField(max_length=100)
    connectors_24pin = models.IntegerField(default=1)
    connectors_cpu4_4pin = models.IntegerField(default=0)
    connectors_cpu_8pin = models.IntegerField(default=0)
    connectors_pcie_6_2pin = models.IntegerField(default=0)
    connectors_pcie_8pin = models.IntegerField(default=0)
    connectors_pcie_12pin = models.IntegerField(default=0)
    connectors_sata = models.IntegerField(default=0)

# Накопитель
class Storage(Component):
    type = models.CharField(max_length=50) # SSD/HDD
    form_factor = models.CharField(max_length=50) # M.2, 2.5
    capacity = models.IntegerField()
    interface = models.CharField(max_length=50) # SATA, NVMe
    read_speed = models.IntegerField()
    write_speed = models.IntegerField()

# Сборка (Конфигурация)
class Configuration(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    is_public = models.BooleanField(default=True)
    total_power = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} (by {self.user.username})"

# Элемент сборки (связующая таблица)
class Config_Item(models.Model):
    configuration = models.ForeignKey(Configuration, on_delete=models.CASCADE, related_name='items')
    component = models.ForeignKey(Component, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Config Item"
        verbose_name_plural = "Config Items"