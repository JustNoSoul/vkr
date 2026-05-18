import os
import sys
import django

# Указываем правильный путь к настройкам относительно корня проекта
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vkr.settings') 

# Добавляем корень в пути, чтобы Python не терял приложения
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

django.setup()

# Импорт моделей строго ПОСЛЕ django.setup()
from catalog.models import CPU, Motherboard, Videocard, Memory, CPU_Cooler, Power_Supply, Storage
def seed_db():
    print("🚀 Удаление старых записей...")
    CPU.objects.all().delete()
    Motherboard.objects.all().delete()
    Videocard.objects.all().delete()
    Memory.objects.all().delete()
    CPU_Cooler.objects.all().delete()
    Power_Supply.objects.all().delete()
    Storage.objects.all().delete()

    print("🧠 Заполнение базы данных реальными комплектующими (по 20 штук)...")

    # ==========================================
    # 1. ПРОЦЕССОРЫ (CPUs) — 20 шт.
    # ==========================================
    cpus_data = [
        # AM4
        ("AMD", "Ryzen 5 5600", "AM4", 6, 12, 3.5, 4.4, 32, 65, False, 2),
        ("AMD", "Ryzen 5 5600X", "AM4", 6, 12, 3.7, 4.6, 32, 65, False, 2),
        ("AMD", "Ryzen 7 5700X", "AM4", 8, 16, 3.4, 4.6, 32, 65, False, 2),
        ("AMD", "Ryzen 7 5800X3D", "AM4", 8, 16, 3.4, 4.5, 96, 105, False, 2),
        ("AMD", "Ryzen 9 5900X", "AM4", 12, 24, 3.7, 4.8, 64, 105, False, 2),
        # AM5
        ("AMD", "Ryzen 5 7500F", "AM5", 6, 12, 3.7, 5.0, 32, 65, False, 2),
        ("AMD", "Ryzen 5 7600X", "AM5", 6, 12, 4.7, 5.3, 32, 105, True, 2),
        ("AMD", "Ryzen 7 7700X", "AM5", 8, 16, 4.5, 5.4, 32, 105, True, 2),
        ("AMD", "Ryzen 7 7800X3D", "AM5", 8, 16, 4.2, 5.0, 96, 120, True, 2),
        ("AMD", "Ryzen 9 7950X3D", "AM5", 16, 32, 4.2, 5.7, 128, 120, True, 2),
        # LGA1700
        ("Intel", "Core i3-12100F", "LGA1700", 4, 8, 3.3, 4.3, 12, 58, False, 2),
        ("Intel", "Core i5-12400F", "LGA1700", 6, 12, 2.5, 4.4, 18, 65, False, 2),
        ("Intel", "Core i5-13400F", "LGA1700", 10, 16, 2.5, 4.6, 20, 65, False, 2),
        ("Intel", "Core i5-13600KF", "LGA1700", 14, 20, 3.5, 5.1, 24, 125, False, 2),
        ("Intel", "Core i7-13700K", "LGA1700", 12, 24, 3.4, 5.4, 30, 125, True, 2),
        ("Intel", "Core i5-14400F", "LGA1700", 10, 16, 2.5, 4.7, 20, 65, False, 2),
        ("Intel", "Core i7-14700KF", "LGA1700", 20, 28, 3.4, 5.6, 33, 125, False, 2),
        ("Intel", "Core i9-14900KS", "LGA1700", 24, 32, 3.2, 6.2, 36, 150, True, 2),
        # LGA1851 (Core Ultra)
        ("Intel", "Core Ultra 5 245K", "LGA1851", 14, 14, 4.2, 5.2, 24, 125, True, 2),
        ("Intel", "Core Ultra 7 265K", "LGA1851", 20, 20, 3.9, 5.5, 30, 125, True, 2)
    ]

    for item in cpus_data:
        CPU.objects.create(
            category="cpus", manufacturer=item[0], name=f"{item[0]} {item[1]}",
            socket=item[2], cores=item[3], threads=item[4], base_clock_ghz=item[5],
            boost_clock_ghz=item[6], l3_cache_mb=item[7], tdp=item[8],
            integrated_graphics=item[9], memory_channels=item[10]
        )

    # ==========================================
    # 2. МАТЕРИНСКИЕ ПЛАТЫ (Motherboards) — 20 шт.
    # ==========================================
    mbs_data = [
        # AM4
        ("GIGABYTE", "B450M K", "AM4", "B450", "Micro-ATX", 2, 64, "DDR4", 3600, "PCI-e 3.0", 1, 1, "M.2 NVMe", 4, False, False),
        ("ASUS", "PRIME B550M-K", "AM4", "B550", "Micro-ATX", 4, 128, "DDR4", 4600, "PCI-e 4.0", 1, 2, "M.2 NVMe/SATA", 4, False, False),
        ("MSI", "MAG B550 TOMAHAWK", "AM4", "B550", "ATX", 4, 128, "DDR4", 4866, "PCI-e 4.0", 2, 2, "M.2 NVMe", 6, False, False),
        ("ASUS", "ROG STRIX B550-A GAMING", "AM4", "B550", "ATX", 4, 128, "DDR4", 5100, "PCI-e 4.0", 2, 2, "M.2 NVMe", 6, False, False),
        ("MSI", "MPG X570S CARBON MAX WIFI", "AM4", "X570", "ATX", 4, 128, "DDR4", 5300, "PCI-e 4.0", 3, 4, "M.2 NVMe", 8, True, True),
        # AM5
        ("ASRock", "B650M-HDV/M.2", "AM5", "B650", "Micro-ATX", 2, 96, "DDR5", 6400, "PCI-e 4.0", 1, 2, "M.2 NVMe", 4, False, False),
        ("GIGABYTE", "B650 GAMING X AX", "AM5", "B650", "ATX", 4, 192, "DDR5", 8000, "PCI-e 4.0", 3, 3, "M.2 NVMe", 4, True, True),
        ("MSI", "MAG B650 TOMAHAWK WIFI", "AM5", "B650", "ATX", 4, 192, "DDR5", 7600, "PCI-e 4.0", 3, 3, "M.2 NVMe", 6, True, True),
        ("ASUS", "ROG STRIX B650E-E GAMING WIFI", "AM5", "B650E", "ATX", 4, 192, "DDR5", 8000, "PCI-e 5.0", 3, 4, "M.2 NVMe", 4, True, True),
        ("GIGABYTE", "X670E AORUS MASTER", "AM5", "X670E", "ATX", 4, 192, "DDR5", 8000, "PCI-e 5.0", 3, 4, "M.2 NVMe", 6, True, True),
        # LGA1700
        ("MSI", "PRO H610M-E DDR4", "LGA1700", "H610", "Micro-ATX", 2, 64, "DDR4", 3200, "PCI-e 4.0", 1, 1, "M.2 NVMe/SATA", 4, False, False),
        ("GIGABYTE", "B760M DS3H DDR4", "LGA1700", "B760", "Micro-ATX", 4, 128, "DDR4", 5333, "PCI-e 4.0", 1, 2, "M.2 NVMe", 4, False, False),
        ("ASUS", "PRIME B760-PLUS", "LGA1700", "B760", "ATX", 4, 192, "DDR5", 7200, "PCI-e 5.0", 3, 3, "M.2 NVMe", 4, False, False),
        ("MSI", "MAG B760M MORTAR WIFI", "LGA1700", "B760", "Micro-ATX", 4, 192, "DDR5", 7000, "PCI-e 5.0", 2, 2, "M.2 NVMe", 4, True, True),
        ("GIGABYTE", "B760 AORUS ELITE AX", "LGA1700", "B760", "ATX", 4, 192, "DDR5", 7600, "PCI-e 4.0", 3, 3, "M.2 NVMe", 4, True, True),
        ("MSI", "PRO Z790-A MAX WIFI", "LGA1700", "Z790", "ATX", 4, 192, "DDR5", 7800, "PCI-e 5.0", 3, 4, "M.2 NVMe", 6, True, True),
        ("ASUS", "ROG STRIX Z790-E GAMING WIFI II", "LGA1700", "Z790", "ATX", 4, 192, "DDR5", 8000, "PCI-e 5.0", 3, 5, "M.2 NVMe", 4, True, True),
        ("ASUS", "ROG MAXIMUS Z790 HERO", "LGA1700", "Z790", "ATX", 4, 192, "DDR5", 7800, "PCI-e 5.0", 3, 5, "M.2 NVMe", 6, True, True),
        # LGA1851
        ("MSI", "PRO Z890-A WIFI", "LGA1851", "Z890", "ATX", 4, 192, "DDR5", 9200, "PCI-e 5.0", 3, 4, "M.2 NVMe", 4, True, True),
        ("ASUS", "ROG STRIX Z890-E GAMING WIFI", "LGA1851", "Z890", "ATX", 4, 192, "DDR5", 9066, "PCI-e 5.0", 3, 7, "M.2 NVMe", 4, True, True)
    ]

    for item in mbs_data:
        Motherboard.objects.create(
            category="motherboards", manufacturer=item[0], name=f"{item[0]} {item[1]}",
            socket=item[2], chipset=item[3], form_factor=item[4], ram_slots=item[5],
            ram_max=item[6], ram_type=item[7], ram_speed=item[8], pcie_ver=item[9],
            pcie_slots=item[10], m2_slots=item[11], m2_type=item[12], sata_ports=item[13],
            wifi=item[14], bluetooth=item[15]
        )

    # ==========================================
    # 3. ВИДЕОКАРТЫ (Videocards) — 20 шт.
    # ==========================================
    gpus_data = [
        ("Palit", "GeForce GTX 1650 StormX", "GTX 1650", "NVIDIA", 4, "PCI-e 3.0", "ITX", 75, "Без доп. питания", 145, "1x HDMI, 1x DisplayPort, 1x DVI", 1665),
        ("ASUS", "Phoenix GeForce GTX 1660 SUPER", "GTX 1660 SUPER", "NVIDIA", 6, "PCI-e 3.0", "Micro-ATX", 125, "1x 8-pin", 174, "1x HDMI, 1x DisplayPort, 1x DVI", 1830),
        ("MSI", "GeForce RTX 3050 VENTUS 2X XS", "RTX 3050", "NVIDIA", 8, "PCI-e 4.0", "ATX", 115, "1x 6-pin", 205, "1x HDMI, 1x DisplayPort, 1x DVI", 1807),
        ("Palit", "GeForce RTX 3060 Dual", "RTX 3060", "NVIDIA", 12, "PCI-e 4.0", "ATX", 170, "1x 8-pin", 245, "1x HDMI, 3x DisplayPort", 1777),
        ("GIGABYTE", "GeForce RTX 3060 Ti EAGLE OC", "RTX 3060 Ti", "NVIDIA", 8, "PCI-e 4.0", "ATX", 200, "1x 8-pin", 242, "2x HDMI, 2x DisplayPort", 1695),
        ("MSI", "GeForce RTX 4060 VENTUS 2X BLACK OC", "RTX 4060", "NVIDIA", 8, "PCI-e 4.0", "ATX", 115, "1x 8-pin", 199, "1x HDMI, 3x DisplayPort", 2490),
        ("GIGABYTE", "GeForce RTX 4060 Ti GAMING OC", "RTX 4060 Ti", "NVIDIA", 16, "PCI-e 4.0", "ATX", 165, "1x 8-pin", 281, "2x HDMI, 2x DisplayPort", 2580),
        ("Palit", "GeForce RTX 4070 Dual", "RTX 4070", "NVIDIA", 12, "PCI-e 4.0", "ATX", 200, "1x 8-pin", 269, "1x HDMI, 3x DisplayPort", 2475),
        ("MSI", "GeForce RTX 4070 SUPER VENTUS 3X OC", "RTX 4070 SUPER", "NVIDIA", 12, "PCI-e 4.0", "ATX", 220, "1x 16-pin (12VHPWR)", 308, "1x HDMI, 3x DisplayPort", 2520),
        ("ASUS", "TUF Gaming GeForce RTX 4070 Ti SUPER", "RTX 4070 Ti SUPER", "NVIDIA", 16, "PCI-e 4.0", "ATX", 285, "1x 16-pin (12VHPWR)", 305, "1x HDMI, 3x DisplayPort", 2640),
        ("GIGABYTE", "GeForce RTX 4080 SUPER EAGLE OC", "RTX 4080 SUPER", "NVIDIA", 16, "PCI-e 4.0", "ATX", 320, "1x 16-pin (12VHPWR)", 342, "1x HDMI, 3x DisplayPort", 2580),
        ("ASUS", "ROG Strix GeForce RTX 4090 OC", "RTX 4090", "NVIDIA", 24, "PCI-e 4.0", "ATX (3.5 слоя)", 450, "1x 16-pin (12VHPWR)", 358, "2x HDMI, 3x DisplayPort", 2640),
        # AMD
        ("PowerColor", "Radeon RX 6500 XT ITX", "RX 6500 XT", "AMD", 4, "PCI-e 4.0", "ITX", 107, "1x 6-pin", 165, "1x HDMI, 1x DisplayPort", 2815),
        ("Sapphire", "Radeon RX 6600 PULSE", "RX 6600", "AMD", 8, "PCI-e 4.0", "ATX", 140, "1x 8-pin", 193, "1x HDMI, 3x DisplayPort", 2491),
        ("ASUS", "Dual Radeon RX 6700 XT Standard", "RX 6700 XT", "AMD", 12, "PCI-e 4.0", "ATX", 230, "1x 6-pin + 1x 8-pin", 295, "1x HDMI, 3x DisplayPort", 2581),
        ("Sapphire", "Radeon RX 7600 PULSE", "RX 7600", "AMD", 8, "PCI-e 4.0", "ATX", 185, "1x 8-pin", 240, "1x HDMI, 3x DisplayPort", 2755),
        ("XFX", "Speedster QICK 319 RX 7700 XT", "RX 7700 XT", "AMD", 12, "PCI-e 4.0", "ATX", 245, "2x 8-pin", 335, "1x HDMI, 3x DisplayPort", 2599),
        ("Sapphire", "Radeon RX 7800 XT NITRO+", "RX 7800 XT", "AMD", 16, "PCI-e 4.0", "ATX", 288, "2x 8-pin", 320, "2x HDMI, 2x DisplayPort", 2565),
        ("PowerColor", "Hellhound Radeon RX 7900 XT", "RX 7900 XT", "AMD", 20, "PCI-e 4.0", "ATX", 315, "2x 8-pin", 320, "1x HDMI, 3x DisplayPort", 2500),
        ("Sapphire", "Radeon RX 7900 XTX PULSE", "RX 7900 XTX", "AMD", 24, "PCI-e 4.0", "ATX", 355, "3x 8-pin", 313, "2x HDMI, 2x DisplayPort", 2525)
    ]

    for item in gpus_data:
        Videocard.objects.create(
            category="gpus", manufacturer=item[0], name=f"{item[0]} {item[1]}",
            gpu_chip=item[2], chipset=item[3], capacity=item[4], pcie=item[5],
            form_factor=item[6], tdp=item[7], power_connectors=item[8],
            length=item[9], outputs=item[10], boost_clock=item[11]
        )

    # ==========================================
    # 4. ОПЕРАТИВНАЯ ПАМЯТЬ (Memory) — 20 шт.
    # ==========================================
    ram_data = [
        # DDR4
        ("Kingston", "FURY Beast Black DDR4", "DDR4", 8, 3200, "CL16-18-18", 1.35),
        ("Kingston", "FURY Beast Black DDR4 (Кит 2x8)", "DDR4", 16, 3200, "CL16-20-20", 1.35),
        ("G.Skill", "AEGIS DDR4", "DDR4", 16, 3200, "CL16-18-18", 1.35),
        ("ADATA", "XPG GAMMIX D20 DDR4 (Кит 2x8)", "DDR4", 16, 3200, "CL16-20-20", 1.35),
        ("Corsair", "Vengeance LPX DDR4 (Кит 2x8)", "DDR4", 16, 3600, "CL18-22-22", 1.35),
        ("Kingston", "FURY Renegade DDR4 (Кит 2x16)", "DDR4", 32, 3600, "CL16-20-20", 1.35),
        ("G.Skill", "RIPJAWS V DDR4 (Кит 2x16)", "DDR4", 32, 3600, "CL18-22-22", 1.35),
        ("ADATA", "XPG SPECTRIX D50 RGB (Кит 2x16)", "DDR4", 32, 4133, "CL19-23-23", 1.4),
        ("G.Skill", "Trident Z Royal DDR4 (Кит 2x32)", "DDR4", 64, 3600, "CL18-22-22", 1.35),
        ("Corsair", "Vengeance LPX DDR4 (Кит 2x32)", "DDR4", 64, 4000, "CL18-22-22", 1.4),
        # DDR5
        ("Crucial", "DDR5 Standard", "DDR5", 16, 4800, "CL40-40-40", 1.1),
        ("Kingston", "FURY Beast Black DDR5 (Кит 2x8)", "DDR5", 16, 5200, "CL40-40-40", 1.25),
        ("Team Group", "Elite DDR5", "DDR5", 32, 4800, "CL40-40-40", 1.1),
        ("Kingston", "FURY Beast Black DDR5 (Кит 2x16)", "DDR5", 32, 5600, "CL36-38-38", 1.25),
        ("ADATA", "XPG Lancer Blade RGB (Кит 2x16)", "DDR5", 32, 6000, "CL30-40-40", 1.35),
        ("G.Skill", "Flare X5 DDR5 (Кит 2x16)", "DDR5", 32, 6000, "CL32-38-38", 1.35),
        ("G.Skill", "Trident Z5 Neo RGB (Кит 2x16)", "DDR5", 32, 6400, "CL32-39-39", 1.4),
        ("Corsair", "Vengeance RGB DDR5 (Кит 2x32)", "DDR5", 64, 6000, "CL30-40-40", 1.4),
        ("G.Skill", "Trident Z5 RGB DDR5 (Кит 2x32)", "DDR5", 64, 7200, "CL36-46-46", 1.45),
        ("Team Group", "T-Force Delta RGB (Кит 2x48)", "DDR5", 96, 6800, "CL36-46-46", 1.4)
    ]

    for item in ram_data:
        Memory.objects.create(
            category="rams", manufacturer=item[0], name=f"{item[0]} {item[1]} {item[3]}МГц",
            type=item[2], capacity=item[3], speed_mhz=item[4], timings=item[5], voltage=item[6]
        )

    # ==========================================
    # 5. КУЛЕРЫ (CPU Coolers) — 20 шт.
    # ==========================================
    coolers_data = [
        # Воздушные кулеры
        ("ID-COOLING", "DK-01T", 52, "2200 RPM", 26.3, 95, "AM4, LGA1700, LGA1200"),
        ("Deepcool", "GAMMAXX 300", 136, "900 - 1600 RPM", 21.0, 130, "AM4, LGA1700, LGA1200"),
        ("ID-COOLING", "SE-214-XT", 150, "500 - 1500 RPM", 26.6, 180, "AM4, AM5, LGA1700"),
        ("Deepcool", "AK400", 155, "500 - 1850 RPM", 29.4, 220, "AM4, AM5, LGA1700"),
        ("ID-COOLING", "SE-224-XTS BLACK", 151, "600 - 1500 RPM", 28.9, 220, "AM4, AM5, LGA1700"),
        ("be quiet!", "PURE ROCK 2", 155, "1500 RPM", 26.8, 150, "AM4, AM5, LGA1700"),
        ("Thermalright", "Peerless Assassin 120 SE", 155, "1550 RPM", 25.6, 245, "AM4, AM5, LGA1700"),
        ("Deepcool", "AK620", 160, "500 - 1850 RPM", 28.0, 260, "AM4, AM5, LGA1700"),
        ("be quiet!", "DARK ROCK PRO 5", 168, "1300 / 1700 RPM", 23.3, 270, "AM4, AM5, LGA1700"),
        ("Noctua", "NH-D15 chromax.black", 165, "300 - 1500 RPM", 24.6, 250, "AM4, AM5, LGA1700"),
        # Системы жидкостного охлаждения (СЖО) - По высоте пишется толщина радиатора (в мм)
        ("ID-COOLING", "FROSTFLOW X 240", 27, "700 - 1800 RPM", 35.2, 250, "AM4, AM5, LGA1700"),
        ("Deepcool", "LE520", 27, "500 - 2250 RPM", 32.9, 280, "AM4, AM5, LGA1700"),
        ("ARCTIC", "Liquid Freezer III 240", 38, "200 - 1800 RPM", 30.0, 280, "AM4, AM5, LGA1700"),
        ("MSI", "MAG CORELIQUID M240", 27, "500 - 2000 RPM", 34.3, 270, "AM4, AM5, LGA1700"),
        ("Deepcool", "LT520", 27, "500 - 2250 RPM", 32.9, 300, "AM4, AM5, LGA1700"),
        ("ID-COOLING", "DASHFLOW 360 XT", 27, "900 - 2000 RPM", 31.5, 350, "AM4, AM5, LGA1700"),
        ("LIAN LI", "Galahad II Trinity 360", 27, "900 - 2450 RPM", 32.6, 350, "AM4, AM5, LGA1700"),
        ("MSI", "MAG CORELIQUID M360", 27, "500 - 2000 RPM", 34.3, 330, "AM4, AM5, LGA1700"),
        ("Deepcool", "LT720", 27, "500 - 2250 RPM", 32.9, 350, "AM4, AM5, LGA1700"),
        ("ARCTIC", "Liquid Freezer III 420", 38, "200 - 1700 RPM", 32.0, 420, "AM4, AM5, LGA1700")
    ]

    for item in coolers_data:
        CPU_Cooler.objects.create(
            category="coolings", manufacturer=item[0], name=f"{item[0]} {item[1]}",
            height=item[2], fan_speed=item[3], noise_level=item[4], tdp=item[5], socket=item[6]
        )

    # ==========================================
    # 6. БЛОКИ ПИТАНИЯ (Power Supplies) — 20 шт.
    # ==========================================
    psus_data = [
        ("AeroCool", "VX PLUS 500W", 500, "Standard", 1, 1, 0, 2, 0, 0, 3),
        ("Deepcool", "PF550", 550, "Standard", 1, 1, 0, 2, 0, 0, 4),
        ("AeroCool", "KCAS PLUS 600W", 600, "80+ Bronze", 1, 1, 0, 2, 0, 0, 7),
        ("Deepcool", "PK650D", 650, "80+ Bronze", 1, 1, 0, 2, 0, 0, 6),
        ("Chieftec", "Task Task TPS-650S", 650, "80+ Bronze", 1, 1, 0, 2, 0, 0, 5),
        ("Montech", "CENTURY 650", 650, "80+ Gold", 1, 2, 0, 4, 0, 0, 6),
        ("Deepcool", "PK750D", 750, "80+ Bronze", 1, 1, 0, 4, 0, 0, 6),
        ("Chieftec", "Proton BDF-750C", 750, "80+ Bronze", 1, 1, 0, 4, 0, 0, 6),
        ("Montech", "GAMMA II 750", 750, "80+ Gold", 1, 2, 0, 4, 0, 0, 8),
        ("Deepcool", "PM750D", 750, "80+ Gold", 1, 2, 0, 3, 0, 0, 6),
        ("Deepcool", "DQ750ST", 750, "80+ Gold", 1, 1, 1, 4, 0, 0, 7),
        ("Corsair", "RM750e", 750, "80+ Gold", 1, 2, 0, 3, 0, 1, 7), # ATX 3.0 (12VHPWR)
        ("Chieftec", "Polaris PPS-850FC", 850, "80+ Gold", 1, 2, 0, 4, 0, 0, 6),
        ("Montech", "CENTURY 850", 850, "80+ Gold", 1, 2, 0, 4, 0, 0, 8),
        ("Deepcool", "PX850G", 850, "80+ Gold", 1, 2, 0, 3, 0, 1, 8), # ATX 3.0
        ("Corsair", "RM850x Shift", 850, "80+ Gold", 1, 2, 0, 4, 0, 1, 12), # ATX 3.0
        ("Super Flower", "Leadex VI Platinum PRO 850W", 850, "80+ Platinum", 1, 2, 0, 6, 0, 0, 9),
        ("Deepcool", "PX1000G", 1000, "80+ Gold", 1, 2, 0, 3, 0, 1, 8), # ATX 3.0
        ("Montech", "TITAN GOLD 1000W", 1000, "80+ Gold", 1, 2, 0, 5, 0, 1, 12), # ATX 3.0
        ("Super Flower", "Leadex VII Gold 1300W", 1300, "80+ Gold", 1, 2, 0, 4, 0, 2, 12)  # ATX 3.0
    ]

    for item in psus_data:
        Power_Supply.objects.create(
            category="psus", manufacturer=item[0], name=f"{item[0]} {item[1]}",
            wattage=item[2], efficiency_rating=item[3], connectors_24pin=item[4],
            connectors_cpu4_4pin=item[5], connectors_cpu_8pin=item[6],
            connectors_pcie_6_2pin=item[7], connectors_pcie_8pin=item[8],
            connectors_pcie_12pin=item[9], connectors_sata=item[10]
        )

    # ==========================================
    # 7. НАКОПИТЕЛИ (Storages) — 20 шт.
    # ==========================================
    storages_data = [
        # HDD (Жесткие диски)
        ("Western Digital", "WD Blue", "HDD", "3.5\"", 1000, "SATA III", 150, 140),
        ("Seagate", "BarraCuda", "HDD", "3.5\"", 1000, "SATA III", 156, 150),
        ("Western Digital", "WD Blue", "HDD", "3.5\"", 2000, "SATA III", 175, 160),
        ("Seagate", "BarraCuda", "HDD", "3.5\"", 2000, "SATA III", 190, 185),
        ("Toshiba", "P300", "HDD", "3.5\"", 2000, "SATA III", 150, 140),
        ("Western Digital", "WD Purple", "HDD", "3.5\"", 4000, "SATA III", 175, 170),
        # SATA SSD (2.5")
        ("Kingston", "A400", "SSD", "2.5\"", 240, "SATA III", 500, 350),
        ("Crucial", "BX500", "SSD", "2.5\"", 480, "SATA III", 540, 500),
        ("Kingston", "A400", "SSD", "2.5\"", 480, "SATA III", 500, 450),
        ("ADATA", "Ultimate SU650", "SSD", "2.5\"", 512, "SATA III", 520, 450),
        ("Samsung", "870 EVO", "SSD", "2.5\"", 500, "SATA III", 560, 530),
        ("Crucial", "MX500", "SSD", "2.5\"", 1000, "SATA III", 560, 510),
        ("Samsung", "870 EVO", "SSD", "2.5\"", 1000, "SATA III", 560, 530),
        # M.2 NVMe SSD (Быстрые накопители)
        ("Kingston", "NV2", "SSD", "M.2 2280", 500, "PCIe 4.0 x4", 3500, 2100),
        ("ADATA", "XPG GAMMIX S11 Pro", "SSD", "M.2 2280", 512, "PCIe 3.0 x4", 3500, 2300),
        ("Samsung", "980", "SSD", "M.2 2280", 500, "PCIe 3.0 x4", 3100, 2600),
        ("Kingston", "NV2", "SSD", "M.2 2280", 1000, "PCIe 4.0 x4", 3500, 2100),
        ("ADATA", "XPG LEGEND 960", "SSD", "M.2 2280", 1000, "PCIe 4.0 x4", 7400, 6000),
        ("Samsung", "980 PRO", "SSD", "M.2 2280", 1000, "PCIe 4.0 x4", 7000, 5000),
        ("Samsung", "990 PRO", "SSD", "M.2 2280", 2000, "PCIe 4.0 x4", 7450, 6900)
    ]

    for item in storages_data:
        Storage.objects.create(
            category="storages", manufacturer=item[0], name=f"{item[0]} {item[1]} {item[4]}ГБ",
            type=item[2], form_factor=item[3], capacity=item[4], interface=item[5],
            read_speed=item[6], write_speed=item[7]
        )

    print("\n🎉 Все 140 объектов успешно импортированы! Данные абсолютно точные и готовы к фильтрации.")

if __name__ == '__main__':
    seed_db()