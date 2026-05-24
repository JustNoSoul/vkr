"""

Создаёт учётную запись администратора и публичные готовые сборки (с проверкой совместимости).

Запуск: python seed_public_builds.py  (из папки backend, после seed.py)

"""

import os

import sys

import django



os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vkr.settings')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

django.setup()



from django.contrib.auth import get_user_model

from catalog.models import (

    CPU, Motherboard, Videocard, Memory, CPU_Cooler, Power_Supply, Storage,

    Configuration, Config_Item,

)

from catalog.power_calc import power_from_component_list

from catalog.compatibility import (

    validate_component_list,

    pick_ram_for_board,

    pick_motherboard_for_cpu,

    pick_cooler_for_board,

    pick_psu_for_components,

)



User = get_user_model()





def pick_cpu(name_part, socket=None):

    qs = CPU.objects.filter(name__icontains=name_part)

    if socket:

        qs = qs.filter(socket=socket)

    return qs.first()





def pick_gpu(name_part):

    return Videocard.objects.filter(name__icontains=name_part).first()





def pick_storage(name_part=None, min_capacity=0):

    qs = Storage.objects.all()

    if name_part:

        qs = qs.filter(name__icontains=name_part)

    if min_capacity:

        qs = qs.filter(capacity__gte=min_capacity)

    return qs.order_by('-read_speed').first()





def build_compatible_preset(cpu, gpu=None, ram_type=None, storage_hint=None, psu_min=None):

    """Собирает список комплектующих с согласованными сокетом, DDR и БП."""

    if not cpu:

        return None, ['CPU не найден']



    mb = pick_motherboard_for_cpu(cpu, ram_type=ram_type)

    if not mb:

        return None, [f'Нет платы под сокет {cpu.socket}']



    ram = pick_ram_for_board(mb)

    if not ram:

        return None, [f'Нет ОЗУ типа {mb.ram_type}']



    storage = pick_storage(storage_hint, min_capacity=500 if not storage_hint else 0)

    cool = pick_cooler_for_board(mb)

    if not cool:

        return None, [f'Нет кулера под {mb.socket}']



    parts = [cpu, mb, ram, storage, cool]

    if gpu:

        parts.insert(2, gpu)



    psu = pick_psu_for_components(parts, has_rgb=False, cooler_count=2)

    if psu_min and psu and psu.wattage < psu_min:

        psu = Power_Supply.objects.filter(wattage__gte=psu_min).order_by('wattage').first() or psu

    if psu:

        parts.append(psu)



    return parts, validate_component_list(parts)





def create_build(admin_user, name, description, component_list, has_rgb=False, cooler_count=2):

    components = [c for c in component_list if c]

    issues = validate_component_list(components, has_rgb, cooler_count)

    if issues:

        print(f'  ✗ {name}: несовместимость — {"; ".join(issues)}')

        return None



    _, recommended = power_from_component_list(components, has_rgb, cooler_count)



    cfg, created = Configuration.objects.get_or_create(

        user=admin_user,

        name=name,

        defaults={

            'description': description,

            'is_public': True,

            'total_power': recommended,

            'has_rgb': has_rgb,

            'cooler_count': cooler_count,

        },

    )

    if not created:

        cfg.description = description

        cfg.is_public = True

        cfg.total_power = recommended

        cfg.has_rgb = has_rgb

        cfg.cooler_count = cooler_count

        cfg.save()

        cfg.items.all().delete()



    for comp in components:

        Config_Item.objects.get_or_create(configuration=cfg, component_id=comp.id)



    print(f'  ✓ {name} — рек. БП {recommended} Вт ({len(components)} узлов)')

    return cfg





def recalc_all_public_powers():

    for cfg in Configuration.objects.filter(is_public=True).prefetch_related('items__component'):

        comps = [item.component for item in cfg.items.all()]

        raw, rec = power_from_component_list(comps, cfg.has_rgb, cfg.cooler_count)

        cfg.total_power = rec

        cfg.save(update_fields=['total_power'])

        print(f'  ↻ {cfg.name}: пик ~{raw} Вт, рек. БП {rec} Вт')





def main():

    print('=== Администратор и публичные сборки ===\n')



    admin, created = User.objects.get_or_create(

        username='admin',

        defaults={'role': 'admin', 'is_staff': True, 'is_superuser': True},

    )

    admin.role = 'admin'

    admin.is_staff = True

    admin.is_superuser = True

    admin.set_password('admin123')

    admin.save()

    print(f'Админ: логин admin / пароль admin123 ({"создан" if created else "обновлён"})')



    if CPU.objects.count() < 5:

        print('\n⚠ Мало комплектующих в БД. Сначала выполните: python seed.py')

        return



    print('\nПубличные сборки (подбор с проверкой совместимости):')



    # Офис: Intel LGA1700 + DDR4, без видеокарты

    cpu_office = pick_cpu('12400F', socket='LGA1700')

    parts_office, err_office = build_compatible_preset(

        cpu_office, gpu=None, ram_type='DDR4', storage_hint='500'

    )

    if parts_office:

        create_build(

            admin,

            'Офисный стандарт',

            'Тихая сборка для офиса и учёбы. Без дискретной видеокарты.',

            parts_office,

            has_rgb=False,

            cooler_count=2,

        )

    else:

        print(f'  ✗ Офисный стандарт: {err_office}')



    # Gaming: AM5 + DDR5 + RX 7700 XT

    cpu_game = pick_cpu('7800X3D', socket='AM5') or pick_cpu('7600X', socket='AM5')

    gpu_game = pick_gpu('7700 XT') or pick_gpu('4060')

    parts_game, err_game = build_compatible_preset(

        cpu_game, gpu=gpu_game, ram_type='DDR5', storage_hint='1000', psu_min=750

    )

    if parts_game:

        create_build(

            admin,

            'Gaming Extreme',

            'Игровая конфигурация для AAA-игр в Full HD и QHD.',

            parts_game,

            has_rgb=True,

            cooler_count=4,

        )

    else:

        print(f'  ✗ Gaming Extreme: {err_game}')



    # Workstation: Intel LGA1700 + DDR5 + мощная GPU

    cpu_work = pick_cpu('13700K', socket='LGA1700') or pick_cpu('14700KF', socket='LGA1700')

    gpu_work = pick_gpu('7900 XTX') or pick_gpu('7900 XT') or pick_gpu('4080')

    parts_work, err_work = build_compatible_preset(

        cpu_work, gpu=gpu_work, ram_type='DDR5', storage_hint='990', psu_min=850

    )

    if parts_work:

        # Больше ОЗУ для рабочей станции

        mb = parts_work[1]

        ram64 = Memory.objects.filter(type=mb.ram_type, capacity__gte=64).order_by('capacity').first()

        if ram64:
            for i, comp in enumerate(parts_work):
                if getattr(comp, 'category', '') in ('rams', 'memory'):
                    parts_work[i] = ram64
                    break

        create_build(

            admin,

            'Workstation Pro',

            'Рабочая станция для монтажа и 3D.',

            parts_work,

            has_rgb=False,

            cooler_count=3,

        )

    else:

        print(f'  ✗ Workstation Pro: {err_work}')



    # Баланс: AM5 средний класс

    cpu_bal = pick_cpu('7500F', socket='AM5') or pick_cpu('7600X', socket='AM5')

    gpu_bal = pick_gpu('7600') or pick_gpu('6700 XT')

    parts_bal, err_bal = build_compatible_preset(

        cpu_bal, gpu=gpu_bal, ram_type='DDR5', storage_hint='NV2', psu_min=650

    )

    if parts_bal:

        create_build(

            admin,

            'Баланс Плюс',

            'Универсальная сборка цена/качество.',

            parts_bal,

            has_rgb=True,

            cooler_count=3,

        )

    else:

        print(f'  ✗ Баланс Плюс: {err_bal}')



    print('\nПересчёт мощности у всех публичных сборок:')

    recalc_all_public_powers()



    public_count = Configuration.objects.filter(is_public=True).count()

    print(f'\nГотово. Публичных сборок: {public_count}')





if __name__ == '__main__':

    main()

