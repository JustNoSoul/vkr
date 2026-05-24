/**
 * Проверка соответствия сборки минимальным требованиям приложений.
 */

function totalRamGb(ramList) {
  if (!Array.isArray(ramList) || !ramList.length) return 16;
  return ramList.reduce((sum, m) => sum + (Number(m.capacity) || 8), 0);
}

export async function fetchAppRequirements(build, signal) {
  if (!build?.cpu || !build?.gpu) {
    return null;
  }

  const res = await fetch('/api/performance/estimate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      cpu_manufacturer: build.cpu.manufacturer || '',
      cpu_name: build.cpu.name || '',
      cpu_cores: build.cpu.cores,
      cpu_boost_ghz: build.cpu.boost_clock_ghz || build.cpu.base_clock_ghz,
      gpu_manufacturer: build.gpu.manufacturer || '',
      gpu_name: build.gpu.name || '',
      gpu_chipset: build.gpu.chipset || '',
      gpu_vram_gb: build.gpu.capacity,
      ram_total_gb: totalRamGb(build.ram),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      available: false,
      message: err.detail || 'Не удалось выполнить проверку требований.',
    };
  }

  return res.json();
}
