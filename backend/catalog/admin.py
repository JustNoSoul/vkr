from django.contrib import admin
from .models import Storage, CPU_Cooler, Component, CPU, Motherboard, Videocard, Memory, Power_Supply, Configuration, Config_Item

# Регистрация без декораторов (самый надежный способ)
admin.site.register(Component)
admin.site.register(CPU)
admin.site.register(Motherboard)
admin.site.register(Videocard)
admin.site.register(Memory)
admin.site.register(Configuration)
admin.site.register(Config_Item)
admin.site.register(CPU_Cooler)
admin.site.register(Power_Supply)
admin.site.register(Storage)