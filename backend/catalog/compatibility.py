"""Проверки совместимости сборки (для сидов и серверной валидации)."""
import re

from .power_calc import power_from_component_list, slots_from_component_list, _resolve_component


def _norm(value):
    return str(value or '').lower().strip()


def cooler_supports_socket(cooler, socket):
    if not cooler or not socket:
        return True
    mb_socket = _norm(socket)
    raw = getattr(cooler, 'socket', '') or ''
    if not raw:
        return True
    for part in str(raw).lower().split(','):
        part = part.strip()
        if part and (part in mb_socket or mb_socket in part):
            return True
    return False


def ram_fits_motherboard(ram, motherboard):
    if not ram or not motherboard:
        return True
    mb_type = _norm(motherboard.ram_type)
    ram_type = _norm(ram.type)
    if mb_type and ram_type and mb_type != ram_type:
        return False
    return True


def cpu_fits_motherboard(cpu, motherboard):
    if not cpu or not motherboard:
        return True
    cs = _norm(cpu.socket)
    ms = _norm(motherboard.socket)
    return not cs or not ms or cs == ms


def psu_meets_recommended(psu, recommended_watts):
    if not psu or not recommended_watts:
        return True
    return int(getattr(psu, 'wattage', 0) or 0) >= int(recommended_watts)


def validate_component_list(component_list, has_rgb=False, cooler_count=0):
    """Возвращает список текстов критических ошибок."""
    slots = slots_from_component_list(component_list)
    errors = []
    cpu = slots.get('cpu')
    mb = slots.get('motherboard')
    gpu = slots.get('gpu')
    cooling = slots.get('cooling')
    ram_list = slots.get('ram') or []
    storage_list = slots.get('storage') or []
    psu = None
    for raw in component_list:
        comp = _resolve_component(raw)
        if comp and _norm(getattr(comp, 'category', '')) in ('psus', 'power-supplies', 'psu'):
            psu = comp
            break

    if cpu and mb and not cpu_fits_motherboard(cpu, mb):
        errors.append(
            f'Сокет CPU ({cpu.socket}) не совпадает с платой ({mb.socket})'
        )

    if mb:
        for ram in ram_list:
            if not ram_fits_motherboard(ram, mb):
                errors.append(
                    f'ОЗУ {ram.type} несовместима с платой ({mb.ram_type})'
                )
        if mb.ram_slots:
            from .power_calc import _count_ram_modules_from_components
            modules = _count_ram_modules_from_components(ram_list)
            if modules > int(mb.ram_slots):
                errors.append(f'Слишком много модулей ОЗУ ({modules} > {mb.ram_slots} слотов)')
        if mb.ram_max and ram_list:
            total_gb = sum(int(getattr(r, 'capacity', 0) or 0) for r in ram_list)
            if total_gb > int(mb.ram_max):
                errors.append(f'Объём ОЗУ {total_gb} ГБ превышает лимит платы {mb.ram_max} ГБ')

    if cooling and mb and not cooler_supports_socket(cooling, mb.socket):
        errors.append(f'Кулер не поддерживает сокет {mb.socket}')

    _, rec_psu = power_from_component_list(component_list, has_rgb, cooler_count)
    if psu and not psu_meets_recommended(psu, rec_psu):
        errors.append(
            f'БП {psu.wattage} Вт меньше рекомендуемых {rec_psu} Вт'
        )

    if gpu and psu:
        conn = _norm(getattr(gpu, 'power_connectors', ''))
        if '16-pin' in conn or '12vhpwr' in conn:
            if int(getattr(psu, 'connectors_pcie_12pin', 0) or 0) < 1:
                errors.append('GPU требует 12VHPWR, у БП нет разъёма 12-pin')

    if mb and storage_list:
        m2 = int(getattr(mb, 'm2_slots', 0) or 0)
        sata = int(getattr(mb, 'sata_ports', 0) or 0)
        m2_used = sum(
            1 for s in storage_list
            if 'm.2' in _norm(getattr(s, 'form_factor', '')) or 'nvme' in _norm(getattr(s, 'interface', ''))
        )
        sata_used = len(storage_list) - m2_used
        if m2_used > m2:
            errors.append(f'M.2 накопителей ({m2_used}) больше слотов платы ({m2})')
        if sata_used > sata:
            errors.append(f'SATA накопителей ({sata_used}) больше портов ({sata})')

    return errors


def pick_ram_for_board(motherboard, min_capacity=16, prefer_kit=True):
    from .models import Memory
    qs = Memory.objects.filter(type=motherboard.ram_type)
    if min_capacity:
        qs = qs.filter(capacity__gte=min_capacity)
    if prefer_kit:
        kit = qs.filter(name__iregex=r'2\s*[xх]\s*\d+|кит|kit').order_by('capacity').first()
        if kit:
            return kit
    return qs.order_by('capacity').first()


def pick_motherboard_for_cpu(cpu, ram_type=None):
    from .models import Motherboard
    qs = Motherboard.objects.filter(socket=cpu.socket)
    if ram_type:
        qs = qs.filter(ram_type=ram_type)
    return qs.order_by('ram_max').first()


def pick_cooler_for_board(motherboard):
    from .models import CPU_Cooler
    for cooler in CPU_Cooler.objects.all():
        if cooler_supports_socket(cooler, motherboard.socket):
            return cooler
    return None


def pick_psu_for_components(components, has_rgb=False, cooler_count=0, headroom=True):
    from .models import Power_Supply
    _, rec = power_from_component_list(components, has_rgb, cooler_count)
    return Power_Supply.objects.filter(wattage__gte=rec).order_by('wattage').first()
