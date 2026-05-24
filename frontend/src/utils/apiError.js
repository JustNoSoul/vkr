const RU_MAP = {
  'NetworkError': 'Нет соединения с сервером. Проверьте сеть.',
  'Failed to fetch': 'Не удалось связаться с сервером.',
  'Authentication credentials were not provided.': 'Требуется авторизация.',
};

export function parseApiError(data, fallback = 'Произошла ошибка. Попробуйте позже.') {
  if (!data) return fallback;
  if (typeof data === 'string') return RU_MAP[data] || data;
  if (data.detail) {
    if (typeof data.detail === 'string') return RU_MAP[data.detail] || data.detail;
    if (Array.isArray(data.detail)) return data.detail.map(d => parseApiError(d, '')).filter(Boolean).join('; ');
  }
  if (data.message && typeof data.message === 'string') return data.message;
  if (data.errors && typeof data.errors === 'object') {
    const parts = [];
    Object.entries(data.errors).forEach(([key, val]) => {
      const label = Array.isArray(val) ? val.join(', ') : String(val);
      parts.push(`${key}: ${label}`);
    });
    if (parts.length) return `Ошибка проверки данных: ${parts.join('; ')}`;
  }
  if (typeof data === 'object') {
    const parts = [];
    Object.entries(data).forEach(([key, val]) => {
      if (key === 'non_field_errors' && Array.isArray(val)) {
        parts.push(val.join('; '));
      } else if (Array.isArray(val)) {
        parts.push(`${key}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        parts.push(`${key}: ${val}`);
      }
    });
    if (parts.length) return parts.join('; ');
  }
  return fallback;
}

export async function readApiError(res, fallback) {
  try {
    const data = await res.json();
    return parseApiError(data, fallback || `Ошибка сервера (${res.status})`);
  } catch {
    return fallback || `Ошибка сервера (${res.status})`;
  }
}
