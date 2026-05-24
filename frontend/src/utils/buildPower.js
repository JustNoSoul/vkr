const parseToNumber = (val) => {
  if (val === undefined || val === null) return 0;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export function itemsToBuildSlots(items) {
  const build = {
    cpu: null,
    motherboard: null,
    gpu: null,
    ram: [],
    storage: [],
    psu: null,
    cooling: null,
  };

  (items || []).forEach(item => {
    const comp = item.component_details || item;
    if (!comp) return;
    const category = comp.category;
    if (!category) return;

    switch (category) {
      case 'cpus':
        build.cpu = comp;
        break;
      case 'motherboards':
        build.motherboard = comp;
        break;
      case 'videocards':
      case 'gpus':
        build.gpu = comp;
        break;
      case 'coolers':
      case 'coolings':
        build.cooling = comp;
        break;
      case 'power-supplies':
      case 'psus':
        build.psu = comp;
        break;
      case 'memory':
      case 'rams':
        build.ram.push(comp);
        break;
      case 'storages':
        build.storage.push(comp);
        break;
      default:
        break;
    }
  });

  return build;
}

export function countPhysicalRamModules(ramList) {
  let count = 0;
  if (!ramList?.length) return 0;
  ramList.forEach(item => {
    const fromApi = item.real_device_count;
    if (fromApi != null && !isNaN(Number(fromApi))) {
      count += Number(fromApi);
      return;
    }
    const nameLower = String(item.name || '').toLowerCase();
    const kitMatch = nameLower.match(/(\d+)\s*[xхXХ]\s*\d+/i) || nameLower.match(/(\d+)x/i);
    if (kitMatch) count += parseInt(kitMatch[1], 10);
    else if (nameLower.includes('кит') || nameLower.includes('комплект') || nameLower.includes('kit')) count += 2;
    else count += 1;
  });
  return count;
}

/** Запас БП по ТЗ: 25% (диапазон 20–30%) */
export const PSU_HEADROOM_FACTOR = 1.25;

/**
 * Расчёт пикового потребления системы (база без запаса БП).
 */
export function calculateBuildPowerRaw(build, { hasRgb = false, caseFans = 0 } = {}) {
  let tdp = 0;
  const hasAnyComponent =
    build.cpu ||
    build.motherboard ||
    build.gpu ||
    build.ram?.length > 0 ||
    build.storage?.length > 0 ||
    build.cooling;

  if (!hasAnyComponent) return 0;

  if (build.motherboard) tdp += 50;
  else tdp += 10;

  if (build.cpu) tdp += parseToNumber(build.cpu.tdp);
  if (build.gpu) tdp += parseToNumber(build.gpu.tdp);
  if (build.cooling) tdp += 5;

  tdp += countPhysicalRamModules(build.ram) * 5;
  if (build.storage?.length) tdp += build.storage.length * 7;
  if (hasRgb) tdp += 15;
  tdp += Math.min(Math.max(parseToNumber(caseFans), 0), 20) * 2;

  return Math.round(tdp);
}

/** Потребление с запасом для рекомендации БП (+25%) */
export function calculateBuildPower(build, options) {
  return Math.round(calculateBuildPowerRaw(build, options) * PSU_HEADROOM_FACTOR);
}

export function getRecommendedPsuWattage(build, options) {
  return calculateBuildPower(build, options);
}

export function calculatePowerFromConfiguration(config) {
  const build = itemsToBuildSlots(config?.items);
  return calculateBuildPower(build, {
    hasRgb: Boolean(config?.has_rgb),
    caseFans: config?.cooler_count || 0,
  });
}
