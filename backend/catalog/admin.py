from django.contrib import admin
from .models import Storage, CPU_Cooler, Component, CPU, Motherboard, VideoCard, Memory, PowerSupply, Configuration, ConfigItem

# Регистрация без декораторов (самый надежный способ)
admin.site.register(Component)
admin.site.register(CPU)
admin.site.register(Motherboard)
admin.site.register(VideoCard)
admin.site.register(Memory)
admin.site.register(Configuration)
admin.site.register(ConfigItem)
admin.site.register(CPU_Cooler)
admin.site.register(PowerSupply)
admin.site.register(Storage)