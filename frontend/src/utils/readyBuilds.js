import { getCatalogMiniSpecs, getCategoryLabel, normalizeCategory } from './componentSpecs.js';

export function getComponentIdsFromConfiguration(config) {
  return (config?.items || [])
    .map(item => item.component ?? item.component_details?.id)
    .filter(id => id != null);
}

/** Краткая строка характеристик для карточки компонента в просмотре готовой сборки */
export function getComponentBriefLine(comp) {
  if (!comp) return '';
  const specs = getCatalogMiniSpecs(comp.category, comp);
  if (specs.length === 0) return '';
  return specs.map(s => `${s.value}`).join(' · ');
}

export function getBuildPurposeText(config) {
  const desc = (config?.description || '').trim();
  if (desc) return desc;
  return 'Универсальная конфигурация, подобранная администратором. Подходит как отправная точка для вашей сборки.';
}

export function getBuildAccentColor(index) {
  const palette = ['#0071e3', '#ffcc00', '#34c759', '#ff3b30', '#a259ff', '#00f0ff'];
  return palette[index % palette.length];
}

export function getBuildBadge(config) {
  const name = (config?.name || '').toLowerCase();
  if (name.includes('game') || name.includes('гейм')) return 'Гейминг';
  if (name.includes('office') || name.includes('офис')) return 'Офис';
  if (name.includes('work') || name.includes('рабоч')) return 'Работа';
  if (name.includes('budget') || name.includes('бюджет')) return 'Бюджет';
  return 'Готовая сборка';
}

export function sortPublicBuildItems(items) {
  const order = ['cpus', 'motherboards', 'videocards', 'memory', 'coolers', 'storages', 'power-supplies'];
  return [...(items || [])].sort((a, b) => {
    const ca = normalizeCategory((a.component_details || a).category);
    const cb = normalizeCategory((b.component_details || b).category);
    return order.indexOf(ca) - order.indexOf(cb);
  });
}

export function formatReadyBuildComponentRow(item) {
  const comp = item.component_details || item;
  return {
    id: comp.id || item.id,
    categoryLabel: getCategoryLabel(comp.category),
    name: comp.name || item.component_name || 'Без названия',
    brief: getComponentBriefLine(comp),
    specs: getCatalogMiniSpecs(comp.category, comp),
  };
}
