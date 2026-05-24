"""Расчёт потребления — та же логика, что на фронтенде (buildPower.js)."""

import re



PSU_HEADROOM_FACTOR = 1.25





def _resolve_component(comp):

    """

    Config_Item.component возвращает базовый Component без полей подкласса (tdp и т.д.).

    Подгружаем конкретную модель по category.

    """

    if comp is None:

        return None

    from .models import CPU, Motherboard, Videocard, Memory, CPU_Cooler, Power_Supply, Storage



    pk = comp.pk

    cat = (comp.category or '').lower()

    try:

        if cat == 'cpus':

            return CPU.objects.get(pk=pk)

        if cat == 'motherboards':

            return Motherboard.objects.get(pk=pk)

        if cat in ('gpus', 'videocards', 'gpu'):

            return Videocard.objects.get(pk=pk)

        if cat in ('rams', 'memory', 'ram'):

            return Memory.objects.get(pk=pk)

        if cat in ('coolings', 'coolers', 'cooling'):

            return CPU_Cooler.objects.get(pk=pk)

        if cat in ('psus', 'power-supplies', 'psu'):

            return Power_Supply.objects.get(pk=pk)

        if cat in ('storages', 'storage'):

            return Storage.objects.get(pk=pk)

    except Exception:

        pass

    return comp





def _count_ram_modules_from_components(ram_components):

    count = 0

    for comp in ram_components:

        if not comp:

            continue

        name = (getattr(comp, 'name', None) or '').lower()

        kit = re.search(r'(\d+)\s*[xхXХ]\s*\d+', name) or re.search(r'(\d+)x', name)

        if kit:

            count += int(kit.group(1))

        elif 'кит' in name or 'комплект' in name or 'kit' in name:

            count += 2

        else:

            count += 1

    return count





def slots_from_component_list(component_list):

    slots = {

        'cpu': None,

        'motherboard': None,

        'gpu': None,

        'ram': [],

        'storage': [],

        'cooling': None,

    }

    for raw in component_list:

        comp = _resolve_component(raw)

        if not comp:

            continue

        cat = (getattr(comp, 'category', '') or '').lower()

        if cat == 'cpus':

            slots['cpu'] = comp

        elif cat == 'motherboards':

            slots['motherboard'] = comp

        elif cat in ('gpus', 'videocards', 'gpu'):

            slots['gpu'] = comp

        elif cat in ('rams', 'memory', 'ram'):

            slots['ram'].append(comp)

        elif cat in ('storages', 'storage'):

            slots['storage'].append(comp)

        elif cat in ('coolings', 'coolers', 'cooling'):

            slots['cooling'] = comp

    return slots





def calculate_build_power_raw(slots, has_rgb=False, cooler_count=0):

    """Базовое пиковое потребление (Вт), без запаса БП."""

    has_any = (

        slots.get('cpu')

        or slots.get('motherboard')

        or slots.get('gpu')

        or slots.get('ram')

        or slots.get('storage')

        or slots.get('cooling')

    )

    if not has_any:

        return 0



    tdp = 50 if slots.get('motherboard') else 10



    cpu = slots.get('cpu')

    if cpu and getattr(cpu, 'tdp', None):

        tdp += int(cpu.tdp)



    gpu = slots.get('gpu')

    if gpu and getattr(gpu, 'tdp', None):

        tdp += int(gpu.tdp)



    # Кулер: только ~5 Вт на вентилятор, НЕ поле tdp (это рассеиваемая мощность)

    if slots.get('cooling'):

        tdp += 5



    tdp += _count_ram_modules_from_components(slots.get('ram') or []) * 5

    tdp += len(slots.get('storage') or []) * 7

    if has_rgb:

        tdp += 15

    fans = max(0, min(int(cooler_count or 0), 20))

    tdp += fans * 2



    return round(tdp)





def calculate_build_power_recommended(slots, has_rgb=False, cooler_count=0):

    """Рекомендуемая мощность БП с запасом 25%."""

    return round(calculate_build_power_raw(slots, has_rgb, cooler_count) * PSU_HEADROOM_FACTOR)





def power_from_component_list(component_list, has_rgb=False, cooler_count=0):

    slots = slots_from_component_list(component_list)

    raw = calculate_build_power_raw(slots, has_rgb, cooler_count)

    recommended = calculate_build_power_recommended(slots, has_rgb, cooler_count)

    return raw, recommended

