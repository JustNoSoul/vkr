/** Категории в БД (seed) и в UI — приводим к ключам SPECS_BY_CATEGORY */
export function normalizeCategory(category) {
  const map = {
    gpus: 'videocards',
    gpu: 'videocards',
    videocards: 'videocards',
    rams: 'memory',
    ram: 'memory',
    memory: 'memory',
    coolings: 'coolers',
    cooling: 'coolers',
    coolers: 'coolers',
    psus: 'power-supplies',
    psu: 'power-supplies',
    'power-supplies': 'power-supplies',
    storages: 'storages',
    storage: 'storages',
    cpus: 'cpus',
    motherboards: 'motherboards',
  };
  return map[category] || category;
}

const CATEGORY_LABELS = {
  cpus: 'Процессор',
  motherboards: 'Материнская плата',
  videocards: 'Видеокарта',
  memory: 'Оперативная память',
  coolers: 'Система охлаждения CPU',
  'power-supplies': 'Блок питания',
  storages: 'Накопитель',
};

/** Все поля из catalog/models.py (кроме служебных) */
const SPECS_BY_CATEGORY = {
  cpus: [
    ['manufacturer', 'Производитель'],
    ['name', 'Название'],
    ['socket', 'Сокет'],
    ['cores', 'Ядра'],
    ['threads', 'Потоки'],
    ['base_clock_ghz', 'Базовая частота (ГГц)'],
    ['boost_clock_ghz', 'Boost частота (ГГц)'],
    ['l3_cache_mb', 'Кэш L3 (МБ)'],
    ['tdp', 'TDP (Вт)'],
    ['integrated_graphics', 'Встроенная графика'],
    ['memory_channels', 'Каналы памяти'],
  ],
  motherboards: [
    ['manufacturer', 'Производитель'],
    ['name', 'Название'],
    ['socket', 'Сокет'],
    ['chipset', 'Чипсет'],
    ['form_factor', 'Форм-фактор'],
    ['ram_slots', 'Слоты ОЗУ'],
    ['ram_max', 'Макс. объём ОЗУ (ГБ)'],
    ['ram_type', 'Тип ОЗУ'],
    ['ram_speed', 'Частота ОЗУ (МГц)'],
    ['pcie_ver', 'Версия PCIe'],
    ['pcie_slots', 'Слоты PCIe'],
    ['m2_slots', 'Слоты M.2'],
    ['m2_type', 'Тип M.2'],
    ['sata_ports', 'Порты SATA'],
    ['wifi', 'Wi-Fi'],
    ['bluetooth', 'Bluetooth'],
  ],
  videocards: [
    ['manufacturer', 'Производитель'],
    ['name', 'Название'],
    ['gpu_chip', 'Графический чип'],
    ['chipset', 'Чипсет'],
    ['capacity', 'Объём памяти (ГБ)'],
    ['pcie', 'Интерфейс PCIe'],
    ['form_factor', 'Форм-фактор'],
    ['tdp', 'TDP (Вт)'],
    ['power_connectors', 'Разъёмы питания'],
    ['length', 'Длина (мм)'],
    ['outputs', 'Видеовыходы'],
    ['boost_clock', 'Boost частота (МГц)'],
  ],
  memory: [
    ['manufacturer', 'Производитель'],
    ['name', 'Название'],
    ['type', 'Тип'],
    ['capacity', 'Объём (ГБ)'],
    ['speed_mhz', 'Частота (МГц)'],
    ['timings', 'Тайминги'],
    ['voltage', 'Напряжение (В)'],
  ],
  coolers: [
    ['manufacturer', 'Производитель'],
    ['name', 'Название'],
    ['height', 'Высота (мм)'],
    ['fan_speed', 'Скорость вентилятора'],
    ['noise_level', 'Уровень шума (дБ)'],
    ['tdp', 'Рассеиваемая мощность TDP (Вт)'],
    ['socket', 'Поддерживаемые сокеты'],
  ],
  'power-supplies': [
    ['manufacturer', 'Производитель'],
    ['name', 'Название'],
    ['wattage', 'Мощность (Вт)'],
    ['efficiency_rating', 'Сертификат 80 Plus'],
    ['connectors_24pin', 'Разъём 24-pin ATX'],
    ['connectors_cpu4_4pin', 'Разъёмы CPU 4+4 pin'],
    ['connectors_cpu_8pin', 'Разъёмы CPU 8 pin'],
    ['connectors_pcie_6_2pin', 'Разъёмы PCIe 6+2 pin'],
    ['connectors_pcie_8pin', 'Разъёмы PCIe 8 pin'],
    ['connectors_pcie_12pin', 'Разъёмы PCIe 12 pin'],
    ['connectors_sata', 'Разъёмы SATA'],
  ],
  storages: [
    ['manufacturer', 'Производитель'],
    ['name', 'Название'],
    ['type', 'Тип'],
    ['form_factor', 'Форм-фактор'],
    ['capacity', 'Объём (ГБ)'],
    ['interface', 'Интерфейс'],
    ['read_speed', 'Скорость чтения (МБ/с)'],
    ['write_speed', 'Скорость записи (МБ/с)'],
  ],
};

function formatDisplayValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  return String(value);
}

export function getAllSpecRows(comp) {
  if (!comp) return '';
  const category = normalizeCategory(comp.category);
  const specList = SPECS_BY_CATEGORY[category];
  if (!specList) {
    return `<tr><td colspan="2">Категория: ${category || 'неизвестно'}</td></tr>`;
  }

  return specList
    .map(([key, label]) => {
      const display = formatDisplayValue(comp[key]);
      if (display === null) return '';
      return `<tr><td style="padding:5px 12px 5px 0;color:#555;width:44%;vertical-align:top;font-size:12px;">${label}</td><td style="padding:5px 0;color:#111;font-weight:600;font-size:12px;">${display}</td></tr>`;
    })
    .filter(Boolean)
    .join('');
}

export function getCategoryLabel(category) {
  return CATEGORY_LABELS[normalizeCategory(category)] || category || 'Компонент';
}

/** Поля формы админки: category — id API (cpus, gpus, …) */
export function getAdminFieldSchema(apiCategory) {
  const cat = normalizeCategory(apiCategory);
  return SPECS_BY_CATEGORY[cat] || [];
}

export const API_CATEGORY_IDS = ['cpus', 'motherboards', 'gpus', 'rams', 'coolings', 'psus', 'storages'];

export function getDefaultComponentDraft(apiCategory) {
  const base = { manufacturer: '', name: '', category: apiCategory };
  const cat = normalizeCategory(apiCategory);
  const defaults = {
    cpus: { socket: 'AM4', cores: 6, threads: 12, base_clock_ghz: 3.5, boost_clock_ghz: 4.2, l3_cache_mb: 32, tdp: 65, integrated_graphics: false, memory_channels: 2 },
    motherboards: { socket: 'AM4', chipset: 'B550', form_factor: 'ATX', ram_slots: 4, ram_max: 128, ram_type: 'DDR4', ram_speed: 3600, pcie_ver: 'PCI-e 4.0', pcie_slots: 2, m2_slots: 2, m2_type: 'M.2 NVMe', sata_ports: 4, wifi: false, bluetooth: false },
    videocards: { gpu_chip: '', chipset: 'NVIDIA', capacity: 8, pcie: 'PCI-e 4.0', form_factor: 'ATX', tdp: 200, power_connectors: '1x 8-pin', length: 280, outputs: '', boost_clock: 2000 },
    memory: { type: 'DDR4', capacity: 16, speed_mhz: 3200, timings: 'CL16', voltage: 1.35 },
    coolers: { height: 155, fan_speed: '500-1800 RPM', noise_level: 28, tdp: 220, socket: 'AM4, AM5, LGA1700' },
    'power-supplies': { wattage: 650, efficiency_rating: '80+ Gold', connectors_24pin: 1, connectors_cpu4_4pin: 1, connectors_cpu_8pin: 1, connectors_pcie_6_2pin: 2, connectors_pcie_8pin: 0, connectors_pcie_12pin: 0, connectors_sata: 6 },
    storages: { type: 'SSD', form_factor: 'M.2 2280', capacity: 1000, interface: 'PCIe 4.0 x4', read_speed: 5000, write_speed: 4000 },
  };
  return { ...base, category: apiCategory, ...(defaults[cat] || {}) };
}

function formatCatalogMiniValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  return String(value);
}

/** Краткие характеристики для карточки в каталоге — по типу комплектующего */
export function getCatalogMiniSpecs(catalogCategory, item) {
  if (!item) return [];

  const row = (label, value) => {
    const v = formatCatalogMiniValue(value);
    if (v === null) return null;
    return { label, value: v };
  };

  const cat = normalizeCategory(catalogCategory);
  let rows = [];

  switch (cat) {
    case 'cpus':
      rows = [
        row('Сокет', item.socket),
        row('Ядра / потоки', item.cores != null ? `${item.cores} / ${item.threads ?? '—'}` : null),
        item.base_clock_ghz != null
          ? row('Частота', `${item.base_clock_ghz}–${item.boost_clock_ghz ?? item.base_clock_ghz} ГГц`)
          : null,
        item.tdp != null ? row('TDP', `${item.tdp} Вт`) : null,
      ];
      break;
    case 'motherboards':
      rows = [
        row('Сокет', item.socket),
        row('Чипсет', item.chipset),
        row('Форм-фактор', item.form_factor),
        item.ram_type
          ? row('Память', `${item.ram_type}, до ${item.ram_max ?? '—'} ГБ`)
          : null,
      ];
      break;
    case 'videocards':
      rows = [
        row('Графический чип', item.gpu_chip || item.chipset),
        item.capacity != null ? row('Память', `${item.capacity} ГБ`) : null,
        item.length != null ? row('Длина', `${item.length} мм`) : null,
        row('PCIe', item.pcie),
      ];
      break;
    case 'memory':
      rows = [
        row('Тип', item.type),
        item.capacity != null ? row('Объём', `${item.capacity} ГБ`) : null,
        item.speed_mhz != null ? row('Частота', `${item.speed_mhz} МГц`) : null,
        row('Тайминги', item.timings),
      ];
      break;
    case 'storages':
      rows = [
        row('Тип', item.type),
        item.capacity != null ? row('Объём', `${item.capacity} ГБ`) : null,
        row('Интерфейс', item.interface),
        item.read_speed != null ? row('Скорость чтения', `${item.read_speed} МБ/с`) : null,
      ];
      break;
    case 'power-supplies':
      rows = [
        item.wattage != null ? row('Мощность', `${item.wattage} Вт`) : null,
        row('Сертификат', item.efficiency_rating),
        item.connectors_24pin != null ? row('24-pin ATX', item.connectors_24pin) : null,
        item.connectors_pcie_6_2pin != null ? row('PCIe 6+2 pin', item.connectors_pcie_6_2pin) : null,
      ];
      break;
    case 'coolers':
      rows = [
        row('Сокеты', item.socket),
        item.height != null ? row('Высота', `${item.height} мм`) : null,
        item.tdp != null ? row('Рассеивание', `до ${item.tdp} Вт`) : null,
        item.noise_level != null ? row('Шум', `${item.noise_level} дБ`) : null,
      ];
      break;
    default:
      break;
  }

  return rows.filter(Boolean).slice(0, 4);
}
