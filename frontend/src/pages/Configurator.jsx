import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Cpu, Layers, Gamepad2, Box, HardDrive, Plug, Wind, 
  Trash2, Plus, AlertTriangle, CheckCircle, ShieldAlert 
} from 'lucide-react';

function Configurator({ openAuthModal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const processedStateRef = useRef(null);

  // Стейт структуры ПК-сборки
  const [build, setBuild] = useState(() => {
    const savedBuild = localStorage.getItem('pc_build');
    return savedBuild ? JSON.parse(savedBuild) : {
      cpu: null,
      motherboard: null,
      gpu: null,
      ram: [], 
      storage: [], 
      psu: null,
      cooling: null,
    };
  });

  // Наличие RGB-подсветки
  const [hasRgb, setHasRgb] = useState(() => {
    return localStorage.getItem('pc_build_rgb') === 'true';
  });

  // Синхронизация сборки и RGB с localStorage
  useEffect(() => {
    localStorage.setItem('pc_build', JSON.stringify(build));
  }, [build]);

  useEffect(() => {
    localStorage.setItem('pc_build_rgb', hasRgb);
  }, [hasRgb]);

  // СЛУШАЕМ УСПЕШНУЮ АВТОРИЗАЦИЮ ИЗ ШАПКИ ДЛЯ АВТО-СОХРАНЕНИЯ
  useEffect(() => {
    const handleAuthSuccess = () => {
      if (localStorage.getItem('accessToken')) {
        handleSaveConfiguration();
      }
    };
    window.addEventListener('auth_success', handleAuthSuccess);
    return () => window.removeEventListener('auth_success', handleAuthSuccess);
  }, [build]);

  // Обработка выбора детали из каталога
  useEffect(() => {
    if (location.state?.chosenComponent && location.state?.nodeId) {
      const { nodeId, chosenComponent } = location.state;
      
      if (processedStateRef.current === location.state) return;
      processedStateRef.current = location.state;

      setBuild(prev => {
        if (nodeId === 'ram' || nodeId === 'storage') {
          return {
            ...prev,
            [nodeId]: [...prev[nodeId], { ...chosenComponent, uniqueId: chosenComponent.id + '_' + Date.now() }]
          };
        }
        return { ...prev, [nodeId]: chosenComponent };
      });

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleSelectComponent = (category) => {
    navigate(`/catalog?mode=configurator&category=${category}`);
  };

  const handleRemoveComponent = (slotId, uniqueId = null) => {
    setBuild(prev => {
      if (slotId === 'ram' || slotId === 'storage') {
        return {
          ...prev,
          [slotId]: prev[slotId].filter(item => item.uniqueId !== uniqueId)
        };
      }
      return { ...prev, [slotId]: null };
    });
  };

  const handleClearBuild = () => {
    setBuild({ cpu: null, motherboard: null, gpu: null, ram: [], storage: [], psu: null, cooling: null });
    setHasRgb(false);
    localStorage.removeItem('pc_build');
    localStorage.removeItem('pc_build_rgb');
  };

  // --- ПЕРЕВОД В ЧИСЛО ---
  const parseToNumber = (val) => {
    if (val === undefined || val === null) return 0;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // --- ПОДСЧЕТ ФИЗИЧЕСКИХ МОДУЛЕЙ ОЗУ ---
  const countPhysicalRamModules = () => {
    let count = 0;
    if (!build.ram) return 0;
    build.ram.forEach(item => {
      const nameLower = String(item.name || '').toLowerCase();
      const kitMatch = nameLower.match(/(\d+)x/);
      if (kitMatch) {
        count += parseInt(kitMatch[1], 10);
      } else if (nameLower.includes('kit')) {
        count += 2; 
      } else {
        count += 1; 
      }
    });
    return count;
  };

  const psuWattage = build.psu ? parseToNumber(build.psu.wattage) : 0;

  // --- СТАНДАРТНЫЙ РАСЧЕТ ЭНЕРГОПОТРЕБЛЕНИЯ ---
  const calculateTotalTdp = () => {
    let tdp = 0;
    const hasAnyComponent = build.cpu || build.motherboard || build.gpu || build.ram.length > 0 || build.storage.length > 0 || build.cooling;
    
    if (!hasAnyComponent) return 0;

    tdp += 50; 

    if (build.cpu) tdp += parseToNumber(build.cpu.tdp);
    if (build.gpu) tdp += parseToNumber(build.gpu.tdp);
    
    tdp += countPhysicalRamModules() * 5;
    if (build.storage) tdp += build.storage.length * 7;
    if (hasRgb) tdp += 15;

    return Math.round(tdp * 1.10); 
  };

  const totalTdp = calculateTotalTdp();

  // --- АНАЛИЗАТОР СОВМЕСТИМОСТИ (ОБНОВЛЕННЫЙ) ---
  const getValidationMessages = () => {
    const errors = [];
    const warnings = [];
    const { cpu, motherboard, gpu, ram, psu, cooling, storage } = build;

    // 1. ПРОВЕРКА ОПЕРАТИВНОЙ ПАМЯТИ (ОЗУ)
    if (ram && ram.length > 0) {
      let hasDifferentModels = false;
      const firstRamId = ram[0].id;
      let totalRamCapacity = 0;

      ram.forEach(item => {
        if (item.id !== firstRamId) hasDifferentModels = true; 
        totalRamCapacity += parseToNumber(item.capacity);
      });

      const totalPhysicalModules = countPhysicalRamModules();

      if (hasDifferentModels) {
        warnings.push({
          slot: 'ram',
          text: 'Внимание: Вы выбрали разные устройства ОЗУ. Из-за несовпадения таймингов или частот двухканальный режим (Dual-Channel) может не включиться, память будет работать на минимальной общей частоте.'
        });
      }

      if (totalPhysicalModules === 1 && !hasDifferentModels) {
        warnings.push({
          slot: 'ram',
          text: 'В сборке всего один модуль памяти. Рекомендуется добавить второе идентичное устройство для активации двухканального режима.'
        });
      }

      if (motherboard) {
        if (motherboard.ram_slots) {
          const maxSlots = parseToNumber(motherboard.ram_slots);
          if (totalPhysicalModules > maxSlots) {
            errors.push({
              slot: 'ram',
              text: `КРИТИЧЕСКАЯ ОШИБКА: Превышено количество слотов ОЗУ! Вы пытаетесь установить модулей: ${totalPhysicalModules}, а на плате доступно только: ${maxSlots} разъемов.`
            });
          }
        }

        if (motherboard.ram_max) {
          const maxCapacity = parseToNumber(motherboard.ram_max);
          if (totalRamCapacity > maxCapacity) {
            errors.push({
              slot: 'ram',
              text: `КРИТИЧЕСКАЯ ОШИБКА: Превышен максимальный объем памяти! Суммарный объем ОЗУ: ${totalRamCapacity} ГБ, а материнская плата поддерживает максимум: ${maxCapacity} ГБ.`
            });
          }
        }
      }
    }

    // 2. ПРОВЕРКА СОКЕТА (ПРОЦЕССОР + МАТЕРИНКА)
    if (cpu && motherboard) {
      const cpuSocket = String(cpu.socket || '').toLowerCase().trim();
      const mbSocket = String(motherboard.socket || '').toLowerCase().trim();

      if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
        errors.push({
          slot: 'motherboard',
          text: `КРИТИЧЕСКАЯ ОШИБКА: Несовпадение сокетов! Процессор (${cpu.socket.toUpperCase()}) физически невозможно установить в разъем платы (${motherboard.socket.toUpperCase()}).`
        });
      }
    }

    // 3. ПРОВЕРКА ОХЛАЖДЕНИЯ
    if (cooling && motherboard) {
      const mbSocket = String(motherboard.socket || '').toLowerCase().trim();
      const rawSockets = cooling.socket || cooling.supported_sockets; 

      if (mbSocket && rawSockets) {
        const coolingSockets = String(rawSockets).toLowerCase().split(',').map(s => s.trim());
        const isCoolerCompatible = coolingSockets.some(s => s.includes(mbSocket) || mbSocket.includes(s));

        if (!isCoolerCompatible) {
          errors.push({
            slot: 'cooling',
            text: `КРИТИЧЕСКАЯ ОШИБКА: Кулер несовместим с платой! Системе охлаждения не хватает креплений под сокет ${motherboard.socket.toUpperCase()}.`
          });
        }
      }
    }

    // 4. ПРОВЕРКА PCIe ВЕРСИИ
    if (gpu && motherboard) {
      const extractPcieVersion = (str) => {
        if (!str) return 0;
        const targetStr = String(str).toLowerCase();
        const cleanStr = targetStr.replace(/x\s*\d+/g, ''); 
        const match = cleanStr.match(/[\d.]+/);
        if (match) {
          const parsed = parseFloat(match[0]);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      const gpuPcie = extractPcieVersion(gpu.pcie || gpu.pcie_ver);
      const mbPcie = extractPcieVersion(motherboard.pcie_ver || motherboard.pcie);

      if (gpuPcie > 0 && mbPcie > 0 && mbPcie < gpuPcie) {
        warnings.push({
          slot: 'gpu',
          text: `Внимание: Ограничение интерфейса шины. Видеокарта задействует PCIe v${gpuPcie}, а материнская плата работает на более старой версии PCIe v${mbPcie}. Карта запустится и будет работать, но её максимальная пропускная способность будет ограничена возможностями платы.`
        });
      }
    }

    // 5. ПРОВЕРКА КОЛИЧЕСТВА НАКОПИТЕЛЕЙ
    if (storage && storage.length > 0 && motherboard) {
      const totalStorageCount = storage.length;
      const availableM2Slots = parseToNumber(motherboard.m2_slots);
      const availableSataPorts = parseToNumber(motherboard.sata_ports);
      const totalAvailablePorts = availableM2Slots + availableSataPorts;

      if (totalStorageCount > totalAvailablePorts) {
        errors.push({
          slot: 'storage',
          text: `КРИТИЧЕСКАЯ ОШИБКА: Недостаточно портов для накопителей! Вы добавили ${totalStorageCount} устройств(а), а на материнской плате всего ${totalAvailablePorts} разъемов (M.2: ${availableM2Slots}, SATA: ${availableSataPorts}).`
        });
      }
    }

    // 6. ТРЕБОВАНИЯ К ПИТАНИЮ ВИДЕОКАРТЫ
    if (gpu && psu) {
      const gpuPowerStr = String(gpu.power_connectors || '').toLowerCase();
      let required8Pin = 0;
      let required12Vhpwr = false;

      if (gpuPowerStr.includes('16-pin') || gpuPowerStr.includes('12vhpwr') || gpuPowerStr.includes('12-pin')) {
        required12Vhpwr = true;
      }
      
      const digitMatch = gpuPowerStr.match(/(\d+)\s*x/);
      let multiplier = digitMatch ? parseInt(digitMatch[1], 10) : 1;

      if (gpuPowerStr.includes('8-pin')) {
        required8Pin += multiplier;
      } else if (gpuPowerStr.includes('6-pin')) {
        required8Pin += multiplier; 
      }

      const psu12Pin = parseToNumber(psu.connectors_pcie_12pin);
      const psu8Pin = parseToNumber(psu.connectors_pcie_8pin);
      const psu62Pin = parseToNumber(psu.connectors_pcie_6_2pin);
      
      const totalClassicPcie = psu8Pin + psu62Pin;

      let powerCompatible = true;
      let reason = '';

      if (required12Vhpwr) {
        if (psu12Pin > 0) {
          // Ok
        } else if (totalClassicPcie >= 3) {
          warnings.push({
            slot: 'psu',
            text: `Для подключения видеокарты 16-pin (12VHPWR) потребуется переходник. У выбранного БП достаточно классических кабелей PCIe.`
          });
        } else {
          powerCompatible = false;
          reason = `Карте нужен разъем 16-pin (12VHPWR).`;
        }
      } else {
        if (totalClassicPcie < required8Pin) {
          powerCompatible = false;
          reason = `Разъемов PCIe на БП доступно только ${totalClassicPcie} шт., а требуется ${required8Pin}.`;
        }
      }

      if (!powerCompatible) {
        errors.push({
          slot: 'psu',
          text: `КРИТИЧЕСКАЯ ОШИБКА: Блок питания не может подключить видеокарту! ${reason}`
        });
      }
    }

    // 7. ОБЩАЯ МОЩНОСТЬ БП
    if (psu && psuWattage > 0) {
      if (psuWattage < totalTdp) {
        errors.push({
          slot: 'psu',
          text: `КРИТИЧЕСКАЯ ОШИБКА: Нехватка общей мощности БП! Потребление системы ~${totalTdp} Вт, а номинал БП — ${psuWattage} Вт.`
        });
      }
    }

    return { errors, warnings };
  };

  const { errors, warnings } = getValidationMessages();
  const isBuildEmpty = !build.cpu && !build.motherboard && !build.gpu && build.ram.length === 0 && build.storage.length === 0 && !build.psu && !build.cooling;

  // --- ОТПРАВКА СБОРКИ НА API СЕРВЕРА ---
  const handleSaveConfiguration = () => {
    const token = localStorage.getItem('accessToken'); 

    if (!token) {
      openAuthModal(); // Вызываем глобальное окно входа из App.jsx
      return;
    }

    const buildData = {
      cpu_id: build.cpu?.id || null,
      motherboard_id: build.motherboard?.id || null,
      gpu_id: build.gpu?.id || null,
      psu_id: build.psu?.id || null,
      cooling_id: build.cooling?.id || null,
      ram_ids: build.ram.map(r => r.id),
      storage_ids: build.storage.map(s => s.id),
    };

    fetch('/api/builds/save/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(buildData)
    })
    .then(res => {
      if (!res.ok) throw new Error('Ошибка при записи на бэкенд');
      return res.json();
    })
    .then(() => alert('Конфигурация успешно сохранена в вашем аккаунте!'))
    .catch(() => alert('Ошибка соединения. Не удалось синхронизировать сборку с базой данных.'));
  };

  const slotsConfig = [
    { id: 'cpu', name: 'Процессор', icon: <Cpu size={20} />, category: 'cpus', isArray: false },
    { id: 'motherboard', name: 'Материнская плата', icon: <Layers size={20} />, category: 'motherboards', isArray: false },
    { id: 'gpu', name: 'Видеокарта', icon: <Gamepad2 size={20} />, category: 'videocards', isArray: false },
    { id: 'ram', name: 'Оперативная память', icon: <Box size={20} />, category: 'memory', isArray: true },
    { id: 'storage', name: 'Накопители (SSD/HDD)', icon: <HardDrive size={20} />, category: 'storages', isArray: true },
    { id: 'psu', name: 'Блок питания', icon: <Plug size={20} />, category: 'power-supplies', isArray: false },
    { id: 'cooling', name: 'Охлаждение CPU', icon: <Wind size={20} />, category: 'coolers', isArray: false },
  ];

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Конфигуратор системного блока</h1>
        <p style={subtitleStyle}>Интеллектуальная проверка линий питания, сокетов и лимитов нагрузки</p>
      </header>

      <div style={workspaceStyle}>
        <div style={slotsContainerStyle}>
          {slotsConfig.map((slot) => {
            const hasSlotError = errors.some(e => e.slot === slot.id);
            const hasSlotWarning = warnings.some(w => w.slot === slot.id);
            const borderColor = hasSlotError ? '#ef4444' : hasSlotWarning ? '#f59e0b' : '#2c2c44';

            if (slot.isArray) {
              const itemsArray = build[slot.id] || [];
              return (
                <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                    <span style={slotLabelStyle}>{slot.name}</span>
                    <button onClick={() => handleSelectComponent(slot.category)} style={addMoreButtonStyle}>
                      <Plus size={14} style={{ marginRight: '4px' }} /> Добавить устройство
                    </button>
                  </div>

                  {itemsArray.length === 0 ? (
                    <div style={{ ...slotCardStyle, borderColor, padding: '14px 20px' }}>
                      <div style={slotLeftStyle}>
                        <div style={{ ...iconWrapperStyle, color: '#a1a1aa', backgroundColor: '#12121e' }}>{slot.icon}</div>
                        <span style={{ color: '#a1a1aa', fontSize: '14px' }}>Устройства не добавлены</span>
                      </div>
                    </div>
                  ) : (
                    itemsArray.map((item) => (
                      <div key={item.uniqueId} style={{ ...slotCardStyle, borderColor }}>
                        <div style={slotLeftStyle}>
                          <div style={{ ...iconWrapperStyle, color: '#0071e3', backgroundColor: 'rgba(0, 113, 227, 0.1)' }}>{slot.icon}</div>
                          <span style={slotItemNameStyle}>{item.name || 'Устройство'}</span>
                        </div>
                        <button onClick={() => handleRemoveComponent(slot.id, item.uniqueId)} style={removeButtonStyle}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              );
            }

            const addedItem = build[slot.id];
            return (
              <div key={slot.id} style={{ ...slotCardStyle, borderColor }}>
                <div style={slotLeftStyle}>
                  <div style={{
                    ...iconWrapperStyle,
                    color: addedItem ? '#0071e3' : '#a1a1aa',
                    backgroundColor: addedItem ? 'rgba(0, 113, 227, 0.1)' : '#12121e'
                  }}>
                    {slot.icon}
                  </div>
                  <div style={slotMetaStyle}>
                    <span style={slotLabelStyle}>{slot.name}</span>
                    <span style={slotItemNameStyle}>{addedItem ? addedItem.name : 'Компонент не выбран'}</span>
                  </div>
                </div>

                <div style={slotRightStyle}>
                  {addedItem ? (
                    <button onClick={() => handleRemoveComponent(slot.id)} style={removeButtonStyle}>
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button onClick={() => handleSelectComponent(slot.category)} style={addButtonStyle}>
                      <Plus size={16} style={{ marginRight: '6px' }} /> Выбрать
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={stickyPanelStyle}>
          <div style={panelCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={panelTitleStyle}>Статус сборки</h3>
              {!isBuildEmpty && <button onClick={handleClearBuild} style={clearBuildButtonStyle}>Очистить всё</button>}
            </div>

            {!isBuildEmpty && (
              <div style={rgbCheckboxContainerStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={hasRgb} 
                    onChange={(e) => setHasRgb(e.target.checked)}
                    style={checkboxStyle}
                  />
                  Будет RGB подсветка (+15 Вт)
                </label>
              </div>
            )}

            {!isBuildEmpty && (
              <div style={tdpPanelStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#a1a1aa', fontWeight: '500' }}>Потребление (+10% запаса):</span>
                  <strong style={{ color: '#ffffff' }}>~{totalTdp} Вт</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#a1a1aa', fontWeight: '500' }}>Мощность БП:</span>
                  <strong style={{ color: psuWattage > 0 ? '#0071e3' : '#ef4444' }}>
                    {psuWattage > 0 ? `${psuWattage} Вт` : 'Не выбран'}
                  </strong>
                </div>
              </div>
            )}
            
            {isBuildEmpty ? (
              <div style={emptyPanelState}>
                <CheckCircle size={36} color="#a1a1aa" style={{ marginBottom: '10px' }} />
                <span>Добавьте устройства, чтобы запустить проверку.</span>
              </div>
            ) : (
              <div style={reportsContainerStyle}>
                {errors.map((err, idx) => (
                  <div key={`err-${idx}`} style={errorReportStyle}>
                    <ShieldAlert size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={reportTextStyle}>{err.text}</span>
                  </div>
                ))}

                {warnings.map((warn, idx) => (
                  <div key={`warn-${idx}`} style={warningReportStyle}>
                    <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={reportTextStyle}>{warn.text}</span>
                  </div>
                ))}

                {errors.length === 0 && (
                  <div style={successReportStyle}>
                    <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ display: 'block', color: '#10b981', fontSize: '14px' }}>Все узлы согласованы</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- ВЫВОД ДАННЫХ ВЫБРАННОГО БП ДЛЯ ТЕСТА --- */}
            {build.psu && (
              <div style={{ 
                backgroundColor: '#12121e', 
                border: '1px solid #3b82f6', 
                borderRadius: '8px', 
                padding: '10px', 
                fontSize: '11px', 
                color: '#3b82f6',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                marginBottom: '10px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                <strong>Данные БП из стейта:</strong> {JSON.stringify(build.psu)}
              </div>
            )}

            <div style={panelFooterStyle}>
              <button 
                onClick={handleSaveConfiguration}
                style={{
                  ...checkoutButtonStyle,
                  backgroundColor: errors.length > 0 || isBuildEmpty ? '#2c2c44' : '#0071e3',
                  color: errors.length > 0 || isBuildEmpty ? '#a1a1aa' : '#ffffff',
                  cursor: errors.length > 0 || isBuildEmpty ? 'not-allowed' : 'pointer'
                }}
                disabled={errors.length > 0 || isBuildEmpty}
              >
                Сохранить конфигурацию
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Стили
const containerStyle = { backgroundColor: '#12121e', color: '#ffffff', minHeight: '100vh', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box' };
const headerStyle = { marginBottom: '35px', textAlign: 'center' };
const titleStyle = { fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' };
const subtitleStyle = { fontSize: '14px', color: '#a1a1aa', margin: 0 };
const workspaceStyle = { display: 'flex', gap: '30px', maxWidth: '1200px', margin: '0 auto', alignItems: 'flex-start' };
const slotsContainerStyle = { flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' };
const slotCardStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '14px', padding: '14px 20px', boxSizing: 'border-box' };
const slotLeftStyle = { display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 };
const iconWrapperStyle = { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const slotMetaStyle = { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 };
const slotLabelStyle = { fontSize: '11px', color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' };
const slotItemNameStyle = { fontSize: '15px', fontWeight: '700', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const slotRightStyle = { display: 'flex', alignItems: 'center', flexShrink: 0 };
const addButtonStyle = { backgroundColor: '#12121e', color: '#ffffff', border: '1px solid #2c2c44', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const addMoreButtonStyle = { backgroundColor: 'transparent', border: 'none', color: '#0071e3', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', outline: 'none' };
const removeButtonStyle = { backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '8px' };
const clearBuildButtonStyle = { backgroundColor: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };
const stickyPanelStyle = { width: '390px', position: 'sticky', top: '40px', flexShrink: 0 };
const panelCardStyle = { backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', maxHeight: 'calc(100vh - 120px)' };
const panelTitleStyle = { fontSize: '15px', fontWeight: '700', margin: 0, textTransform: 'uppercase', color: '#0071e3', letterSpacing: '0.5px' };
const tdpPanelStyle = { backgroundColor: '#12121e', border: '1px solid #2c2c44', borderRadius: '10px', padding: '12px', marginBottom: '16px' };
const rgbCheckboxContainerStyle = { backgroundColor: 'rgba(0, 113, 227, 0.05)', border: '1px dashed rgba(0, 113, 227, 0.3)', borderRadius: '10px', padding: '12px', marginBottom: '14px' };
const checkboxStyle = { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0071e3' };
const emptyPanelState = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', color: '#a1a1aa', fontSize: '13px', padding: '40px 10px', border: '1px dashed #2c2c44', borderRadius: '12px' };
const reportsContainerStyle = { display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' };
const errorReportStyle = { display: 'flex', gap: '10px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '12px' };
const warningReportStyle = { display: 'flex', gap: '10px', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '12px' };
const successReportStyle = { display: 'flex', gap: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '14px' };
const reportTextStyle = { fontSize: '13px', color: '#e4e4e7', lineHeight: '1.4', fontWeight: '500' };
const panelFooterStyle = { borderTop: '1px solid #2c2c44', paddingTop: '20px', marginTop: 'auto' };
const checkoutButtonStyle = { width: '100%', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700' };

export default Configurator;