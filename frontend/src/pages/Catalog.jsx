import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Cpu, Layers, Gamepad2, HardDrive, Plug, Wind, Box, Search, Info, X, Loader2 
} from 'lucide-react';

function Catalog() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Читаем параметры из URL для определения режима конфигуратора
  const targetCategory = searchParams.get('category'); 
  const mode = searchParams.get('mode'); 
  const isConfiguratorMode = mode === 'configurator';

  const categories = [
    { id: 'cpus', name: 'Процессоры', icon: <Cpu size={18} /> },
    { id: 'motherboards', name: 'Материнские платы', icon: <Layers size={18} /> },
    { id: 'videocards', name: 'Видеокарты', icon: <Gamepad2 size={18} /> },
    { id: 'memory', name: 'Оперативная память', icon: <Box size={18} /> },
    { id: 'storages', name: 'Накопители', icon: <HardDrive size={18} /> },
    { id: 'power-supplies', name: 'Блоки питания', icon: <Plug size={18} /> },
    { id: 'coolers', name: 'Охлаждение', icon: <Wind size={18} /> },
  ];

  // Если зашли из конфигуратора, жестко ставим переданную категорию
  const [activeCategory, setActiveCategory] = useState(isConfiguratorMode && targetCategory ? targetCategory : 'cpus');
  const [searchQuery, setSearchQuery] = useState('');
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  // Хранилище для динамических фильтров
  const [textFilters, setTextFilters] = useState({});
  const [rangeFilters, setRangeFilters] = useState({});

  const mainSpecsToShow = ['socket', 'chipset', 'cores', 'capacity', 'wattage', 'tdp', 'type'];

  // Синхронизируем категорию при изменении параметров URL
  useEffect(() => {
    if (isConfiguratorMode && targetCategory) {
      setActiveCategory(targetCategory);
    }
  }, [targetCategory, isConfiguratorMode]);

  // Добавляем глобальные стили для красивого скроллбара при монтировании компонента
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = scrollbarCustomStyles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Сброс фильтров при смене категории
  useEffect(() => {
    setTextFilters({});
    setRangeFilters({});
  }, [activeCategory]);

  // Запрос к API
  useEffect(() => {
    setLoading(true);
    fetch(`/api/${activeCategory}/`)
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.results || []);
        setComponents(items);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка запроса комплектующих:", err);
        setComponents([]);
        setLoading(false);
      });
  }, [activeCategory]);

  // Хелперы сборки названий и брендов
  const getBrandName = (item) => {
    if (!item) return '';
    return typeof item.manufacturer === 'string' ? item.manufacturer.trim() : '';
  };

  const formatFullName = (item) => {
    if (!item) return 'Без названия';
    const brand = getBrandName(item);
    const name = (item.name || '').trim();
    if (!brand) return name || 'Без названия';
    if (!name) return brand;
    return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
  };

  const formatValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Есть' : 'Нет';
    return value !== null && value !== undefined ? value.toString() : '—';
  };

  // Автоматическая генерация схемы полей из пришедшего JSON
  const schemaFields = React.useMemo(() => {
    if (components.length === 0) return [];
    
    const excludedKeys = ['id', 'name', 'category'];
    const fieldsMap = {};

    components.forEach(item => {
      Object.entries(item).forEach(([key, value]) => {
        if (excludedKeys.includes(key) || value === null || value === undefined || value === '') return;
        
        const isNumeric = typeof value === 'number' && !isNaN(value);
        
        if (!fieldsMap[key]) {
          fieldsMap[key] = {
            key,
            isNumeric,
            uniqueValues: new Set()
          };
        }
        
        const normValue = key === 'manufacturer' ? getBrandName(item) : value;
        if (normValue !== '') {
          fieldsMap[key].uniqueValues.add(normValue);
        }
      });
    });

    return Object.values(fieldsMap).filter(f => f.uniqueValues.size > 0);
  }, [components]);

  const handleCheckboxToggle = (field, value) => {
    setTextFilters(prev => {
      const current = prev[field] || [];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      const next = { ...prev, [field]: updated };
      if (updated.length === 0) delete next[field];
      return next;
    });
  };

  const handleRangeChange = (field, type, value) => {
    setRangeFilters(prev => ({
      ...prev,
      [`${field}_${type}`]: value
    }));
  };

  const handleResetFilters = () => {
    setTextFilters({});
    setRangeFilters({});
    setSearchQuery('');
  };

  // Обработчик отправки выбранного компонента обратно в сборку конфигуратора
  const handleAddToBuild = (product) => {
    const mapping = {
      'cpus': 'cpu',
      'motherboards': 'motherboard',
      'videocards': 'gpu',
      'memory': 'ram',
      'storages': 'storage',
      'power-supplies': 'psu',
      'coolers': 'cooling'
    };

    const nodeId = mapping[activeCategory] || activeCategory;
    const powerValue = product.tdp || product.wattage || null;

    navigate('/configurator', {
      state: {
        chosenComponent: {
          ...product, // 1. Копируем абсолютно ВСЕ родные поля объекта из базы (включая ватты и пины БП)
          name: formatFullName(product), // 2. Перезаписываем красивым форматированным именем
          socket: product.socket || null,
          supported_sockets: product.supported_sockets || null,
          tdp: powerValue, // 3. Оставляем для обратной совместимости с процессорами/кулерами
          capacity: product.capacity || null,
          ram_slots: product.ram_slots || null 
        },
        nodeId: nodeId
      }
    });
  };

  // Конвейер фильтрации данных
  const filteredItems = components.filter((item) => {
    if (!formatFullName(item).toLowerCase().includes(searchQuery.toLowerCase())) return false;

    for (const [field, selectedValues] of Object.entries(textFilters)) {
      if (!selectedValues || selectedValues.length === 0) continue;
      const itemValue = field === 'manufacturer' ? getBrandName(item) : item[field];
      if (!selectedValues.includes(itemValue)) return false;
    }

    for (const fieldInfo of schemaFields) {
      if (!fieldInfo.isNumeric) continue;
      
      const itemValue = item[fieldInfo.key];
      const minVal = rangeFilters[`${fieldInfo.key}_min`];
      const maxVal = rangeFilters[`${fieldInfo.key}_max`];

      if (itemValue === undefined || itemValue === null) {
        if (minVal || maxVal) return false;
        continue;
      }

      if (minVal !== '' && minVal !== undefined && itemValue < parseFloat(minVal)) return false;
      if (maxVal !== '' && maxVal !== undefined && itemValue > parseFloat(maxVal)) return false;
    }

    return true;
  });

  const renderMiniSpecs = (item) => {
    return Object.entries(item)
      .filter(([key]) => mainSpecsToShow.includes(key) && item[key] !== null && item[key] !== undefined)
      .slice(0, 3)
      .map(([key, value]) => (
        <div key={key} style={specRowStyle}>
          <span style={specKeyStyle}>{translateField(key)}:</span>
          <span style={specValueStyle}>{formatValue(value)}</span>
        </div>
      ));
  };

  return (
    <div style={catalogContainerStyle}>
      {/* САЙДБАР С КОМПАКТНЫМ СКРОЛЛБАРОМ */}
      <aside style={sidebarStyle}>
        <div>
          <h3 style={sidebarTitleStyle}>
            {isConfiguratorMode ? 'Режим конфигуратора' : 'Категории'}
          </h3>
          <nav style={navStyle}>
            {categories
              .filter((cat) => !isConfiguratorMode || cat.id === targetCategory)
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    ...navButtonStyle,
                    backgroundColor: activeCategory === cat.id ? '#0071e3' : 'transparent',
                    color: activeCategory === cat.id ? '#ffffff' : '#a1a1aa',
                    cursor: isConfiguratorMode ? 'default' : 'pointer'
                  }}
                  disabled={isConfiguratorMode}
                >
                  {cat.icon}
                  <span style={{ marginLeft: '12px' }}>{cat.name}</span>
                </button>
              ))}
          </nav>
        </div>

        {!loading && components.length > 0 && (
          <div style={{ borderTop: '1px solid #2c2c44', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0, flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={sidebarTitleStyle}>Фильтры подбора</h3>
              <button onClick={handleResetFilters} style={resetFiltersButtonStyle}>Сбросить</button>
            </div>

            <div className="custom-scrollbar" style={filterScrollContainerStyle}>
              {schemaFields.map((fieldInfo) => {
                const uniqueValuesArray = Array.from(fieldInfo.uniqueValues);
                if (uniqueValuesArray.length <= 1 && !fieldInfo.isNumeric) return null;

                if (fieldInfo.isNumeric) {
                  return (
                    <div key={fieldInfo.key} style={filterGroupStyle}>
                      <span style={filterGroupTitleStyle}>{translateField(fieldInfo.key)}</span>
                      <div style={rangeInputContainer}>
                        <input 
                          type="number" 
                          placeholder="От" 
                          value={rangeFilters[`${fieldInfo.key}_min`] || ''} 
                          onChange={(e) => handleRangeChange(fieldInfo.key, 'min', e.target.value)} 
                          style={rangeInputStyle} 
                        />
                        <input 
                          type="number" 
                          placeholder="До" 
                          value={rangeFilters[`${fieldInfo.key}_max`] || ''} 
                          onChange={(e) => handleRangeChange(fieldInfo.key, 'max', e.target.value)} 
                          style={rangeInputStyle} 
                        />
                      </div>
                    </div>
                  );
                }

                const sortedValues = uniqueValuesArray.sort((a, b) => String(a).localeCompare(String(b)));
                return (
                  <div key={fieldInfo.key} style={filterGroupStyle}>
                    <span style={filterGroupTitleStyle}>{translateField(fieldInfo.key)}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {sortedValues.map(val => {
                        const isChecked = textFilters[fieldInfo.key]?.includes(val) || false;
                        return (
                          <label key={String(val)} style={checkboxLabelStyle}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => handleCheckboxToggle(fieldInfo.key, val)} 
                              style={checkboxStyle} 
                            />
                            {formatValue(val)}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main style={mainContentStyle}>
        <div style={filterBarStyle}>
          <div style={searchContainerStyle}>
            <Search size={18} color="#a1a1aa" style={{ marginLeft: '14px' }} />
            <input
              type="text"
              placeholder="Быстрый поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>
        </div>

        {loading ? (
          <div style={loadingContainerStyle}>
            <Loader2 size={32} style={spinnerStyle} />
            <span style={{ color: '#a1a1aa' }}>Сканирование спецификаций...</span>
          </div>
        ) : (
          <div style={gridStyle}>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div key={item.id || Math.random()} style={cardStyle}>
                  <div>
                    <h4 style={itemNameStyle}>{formatFullName(item)}</h4>
                    <div style={specsContainerStyle}>{renderMiniSpecs(item)}</div>
                  </div>

                  {/* БЛОК КНОПОК НА КАРТОЧКЕ */}
                  <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                    {isConfiguratorMode ? (
                      <>
                        {/* В режиме конфигуратора доступны обе кнопки рядом */}
                        <button 
                          onClick={() => setSelectedItem(item)} 
                          style={{ ...detailsButtonStyle, width: '45px', padding: '10px 0', flexShrink: 0 }} 
                          title="Характеристики"
                        >
                          <Info size={16} />
                        </button>
                        <button 
                          onClick={() => handleAddToBuild(item)} 
                          style={{ ...detailsButtonStyle, backgroundColor: '#0071e3', borderColor: '#0071e3', flexGrow: 1 }}
                        >
                          <span style={{ fontWeight: '700' }}>Добавить в сборку</span>
                        </button>
                      </>
                    ) : (
                      /* В обычном каталоге — только полноценная кнопка характеристик */
                      <button onClick={() => setSelectedItem(item)} style={{ ...detailsButtonStyle, width: '100%' }}>
                        <Info size={15} />
                        <span style={{ marginLeft: '6px' }}>Характеристики</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={emptyStateStyle}>Комплектующие с заданными фильтрами не найдены.</div>
            )}
          </div>
        )}
      </main>

      {/* МОДАЛКА ПОЛНЫХ ХАРАКТЕРИСТИК */}
      {selectedItem && (
        <div style={modalOverlayStyle} onClick={() => setSelectedItem(null)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button style={modalCloseStyle} onClick={() => setSelectedItem(null)}><X size={20} /></button>
            <h2 style={modalTitleStyle}>{formatFullName(selectedItem)}</h2>
            <h3 style={modalSectionTitleStyle}>Технический паспорт элемента</h3>
            <div className="custom-scrollbar" style={modalSpecsGridStyle}>
              {Object.entries(selectedItem)
                .filter(([key]) => !['id', 'name', 'manufacturer', 'category'].includes(key) && selectedItem[key] !== null && selectedItem[key] !== undefined)
                .map(([key, value]) => (
                  <div key={key} style={modalSpecRowStyle}>
                    <span style={modalSpecKeyStyle}>{translateField(key)}</span>
                    <span style={modalSpecValueStyle}>{formatValue(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function translateField(key) {
  const dict = {
    category: 'Категория', manufacturer: 'Производитель',
    socket: 'Разъем (Сокет)', supported_sockets: 'Поддерживаемые сокеты', cores: 'Количество ядер', threads: 'Количество потоков',
    base_clock_ghz: 'Базовая частота (ГГц)', boost_clock_ghz: 'Максимальная частота (ГГц)',
    l3_cache_mb: 'Объем кэша L3 (МБ)', tdp: 'Тепловыделение TDP (Вт)', integrated_graphics: 'Встроенная графика',
    memory_channels: 'Каналы памяти', chipset: 'Чипсет', form_factor: 'Форм-фактор платы',
    ram_slots: 'Слоты ОЗУ', ram_max: 'Максимальная ОЗУ (ГБ)',
    ram_type: 'Тип оперативной памяти', ram_speed: 'Максимальная частота памяти (МГц)',
    pcie_ver: 'Стандарт PCI Express', pcie_slots: 'Слоты PCI Express', m2_slots: 'Разъемы M.2',
    m2_type: 'Тип слотов M.2', sata_ports: 'Количество SATA', wifi: 'Поддержка Wi-Fi', bluetooth: 'Поддержка Bluetooth',
    gpu_chip: 'Модель графического чипа', capacity: 'Объем памяти (ГБ)', pcie: 'Шина видеокарты',
    power_connectors: 'Дополнительное питание', length: 'Длина видеокарты (мм)', outputs: 'Видеовыходы',
    boost_clock: 'Частота видеочипа (МГц)', type: 'Тип устройства', speed_mhz: 'Тактовая частота ОЗУ (МГц)',
    timings: 'Тайминги (CL)', voltage: 'Напряжение питания (В)', height: 'Высота кулера (мм)',
    fan_speed: 'Обороты вентилятора (об/мин)', noise_level: 'Уровень шума (дБ)', wattage: 'Мощность БП (Вт)',
    efficiency_rating: 'Сертификат БП', connectors_24pin: 'Разъемы 24-pin',
    connectors_cpu4_4pin: 'Разъемы CPU 4+4-pin', connectors_cpu_8pin: 'Разъемы CPU 8-pin',
    connectors_pcie_6_2pin: 'Разъемы PCIe 6+2-pin', connectors_pcie_8pin: 'Разъемы PCIe 8-pin',
    connectors_pcie_12pin: 'Разъемы PCIe 12-pin', connectors_sata: 'Питание SATA',
    interface: 'Интерфейс подключения', read_speed: 'Скорость чтения (МБ/с)', write_speed: 'Скорость записи (МБ/с)'
  };
  return dict[key] || key;
}

const scrollbarCustomStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1c1c2e;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #3a3a52;
    border-radius: 10px;
    transition: background 0.2s ease;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #0071e3;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #3a3a52 #1c1c2e;
  }
`;

const catalogContainerStyle = { display: 'flex', backgroundColor: '#12121e', color: '#ffffff', minHeight: '100vh', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', gap: '30px', width: '100%', boxSizing: 'border-box' };
const sidebarStyle = { width: '310px', backgroundColor: '#1c1c2e', borderRadius: '16px', padding: '20px', border: '1px solid #2c2c44', height: 'calc(100vh - 80px)', position: 'sticky', top: '40px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '25px', boxSizing: 'border-box' };
const sidebarTitleStyle = { fontSize: '15px', fontWeight: '700', margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#0071e3' };
const resetFiltersButtonStyle = { backgroundColor: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none' };
const navStyle = { display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 };
const navButtonStyle = { display: 'flex', alignItems: 'center', width: '100%', border: 'none', padding: '12px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' };
const filterScrollContainerStyle = { display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '6px', flexGrow: 1 };
const filterGroupStyle = { display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #232338', paddingBottom: '14px' };
const filterGroupTitleStyle = { fontSize: '13px', fontWeight: '700', color: '#a1a1aa' };
const checkboxLabelStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#e4e4e7', cursor: 'pointer', userSelect: 'none' };
const checkboxStyle = { width: '15px', height: '15px', accentColor: '#0071e3', cursor: 'pointer' };
const rangeInputContainer = { display: 'flex', gap: '10px', width: '100%' };
const rangeInputStyle = { backgroundColor: '#12121e', border: '1px solid #2c2c44', borderRadius: '6px', color: '#ffffff', padding: '8px 10px', fontSize: '13px', width: '50%', outline: 'none' };
const mainContentStyle = { flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '25px', minWidth: 0 };
const filterBarStyle = { display: 'flex', width: '100%' };
const searchContainerStyle = { display: 'flex', alignItems: 'center', backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '12px', flexGrow: 1 };
const searchInputStyle = { backgroundColor: 'transparent', border: 'none', padding: '14px', color: '#ffffff', fontSize: '14px', width: '100%', outline: 'none' };
const loadingContainerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '80px 0' };
const spinnerStyle = { animation: 'spin 1s linear infinite', color: '#0071e3' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', width: '100%' };
const cardStyle = { backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '220px', justifyContent: 'space-between', boxSizing: 'border-box' };
const itemNameStyle = { fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0, lineHeight: '1.4' };
const specsContainerStyle = { display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0', padding: '10px 0', borderTop: '1px dashed #2c2c44' };
const specRowStyle = { display: 'flex', justifyContent: 'space-between', fontSize: '13px' };
const specKeyStyle = { color: '#a1a1aa' };
const specValueStyle = { color: '#e4e4e7', fontWeight: '500' };
const detailsButtonStyle = { backgroundColor: '#2c2c44', color: '#ffffff', border: '1px solid #3a3a52', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' };
const emptyStateStyle = { gridColumn: '1 / -1', textAlign: 'center', color: '#a1a1aa', padding: '60px', fontSize: '15px' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContentStyle = { backgroundColor: '#1c1c2e', padding: '35px', borderRadius: '24px', width: '550px', maxWidth: '90%', position: 'relative', border: '1px solid #3a3a52', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
const modalCloseStyle = { position: 'absolute', top: '20px', right: '20px', backgroundColor: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer', padding: '4px' };
const modalTitleStyle = { fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#ffffff', lineHeight: '1.3', flexShrink: 0 };
const modalSectionTitleStyle = { fontSize: '14px', fontWeight: '700', color: '#a1a1aa', marginBottom: '15px', borderBottom: '1px solid #2c2c44', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 };
const modalSpecsGridStyle = { display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '8px' };
const modalSpecRowStyle = { display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #2c2c44' };
const modalSpecKeyStyle = { color: '#a1a1aa', fontSize: '14px' };
const modalSpecValueStyle = { color: '#ffffff', fontWeight: '600', fontSize: '14px' };

export default Catalog;