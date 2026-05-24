from django.contrib import admin
from .models import Storage, CPU_Cooler, Component, CPU, Motherboard, Videocard, Memory, Power_Supply, Configuration, Config_Item

admin.site.register(Component)
admin.site.register(CPU)
admin.site.register(Motherboard)
admin.site.register(Videocard)
admin.site.register(Memory)
admin.site.register(Config_Item)
admin.site.register(CPU_Cooler)
admin.site.register(Power_Supply)
admin.site.register(Storage)


@admin.register(Configuration)
class ConfigurationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'user', 'is_public', 'total_power', 'has_rgb')
    list_filter = ('is_public',)
    search_fields = ('name', 'description')
    list_editable = ('is_public',)
    fields = (
        'user', 'name', 'description', 'is_public',
        'total_power', 'has_rgb', 'cooler_count',
    )
