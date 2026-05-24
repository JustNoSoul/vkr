import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  calculateBuildPower,
  calculateBuildPowerRaw,
  countPhysicalRamModules as countRamModules,
} from '../utils/buildPower.js';
import { fetchAppRequirements } from '../utils/appRequirements.js';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Cpu, Layers, Gamepad2, Box, HardDrive, Plug, Wind, 
  Trash2, Plus, AlertTriangle, CheckCircle, ShieldAlert, X,
  ArrowLeft, ArrowRight, Check, Minus
} from 'lucide-react';
import { BuildContext } from '../BuildContext.jsx';

// Пошаговая конфигурация мастера с точными подсказками по КИПам
const STEPS = [
  {
    id: 'gpu',
    name: 'Видеокарта',
    icon: <Gamepad2 size={16} />,
    category: 'videocards',
    hint: 'Видеокарта — графическое сердце ПК. Для Full HD (1080p) сегодня комфортным минимумом является 8 ГБ памяти. Для 2K гейминга строго рекомендуется от 12 ГБ до 16 ГБ, а для ультимативного 4K разрешения выбирайте флагманы с 16 ГБ – 24 ГБ видеопамяти.',
    isArray: false
  },
  {
    id: 'motherboard',
    name: 'Мат. плата',
    icon: <Layers size={16} />,
    category: 'motherboards',
    hint: 'Материнская плата объединяет все компоненты. Автофильтрация предложит вам платы, которые аппаратно совместимы с ранее выбранной видеокартой.',
    isArray: false
  },
  {
    id: 'cpu',
    name: 'Процессор',
    icon: <Cpu size={16} />,
    category: 'cpus',
    hint: 'Процессор — мозг вашего компьютера. Отображаются только те процессоры, сокет которых совпадает с выбранной материнской платой.',
    isArray: false
  },
  {
    id: 'cooling',
    name: 'Охлаждение',
    icon: <Wind size={16} />,
    category: 'coolers',
    hint: 'Система охлаждения CPU. Автофильтрация отображает кулеры, подходящие для охлаждения процессора по сокету.',
    isArray: false
  },
  {
    id: 'ram',
    name: 'Память',
    icon: <Box size={16} />,
    category: 'memory',
    hint: 'Оперативная память. Вы можете выбрать сразу несколько одинаковых или разных моделей. Обратите внимание на КИТы (Kit) — это комплекты из 2 или 4 модулей, продающиеся в одной коробке. Они протестированы на заводе на совместную идеальную работу, что сразу запускает самый быстрый "двухканальный режим" работы ПК.',
    isArray: true
  },
  {
    id: 'storage',
    name: 'Накопитель',
    icon: <HardDrive size={16} />,
    category: 'storages',
    hint: 'Вы можете выбрать один или несколько накопителей. Быстрые SSD (M.2/SATA) подойдут под операционную систему и тяжелые игры, а емкие HDD — под хранение долгосрочных медиафайлов.',
    isArray: true
  },
  {
    id: 'psu',
    name: 'Блок питания',
    icon: <Plug size={16} />,
    category: 'power-supplies',
    hint: 'Блок питания снабжает систему энергией. Доступны только блоки, мощность которых покрывает расчетное TDP всей конфигурации с учетом запаса и коннекторов питания.',
    isArray: false
  }
];

/** Раскладывает items конфигурации с API по слотам сборки */
function mapConfigurationItemsToBuild(items) {
  const restoredBuild = {
    cpu: null,
    motherboard: null,
    gpu: null,
    ram: [],
    storage: [],
    psu: null,
    cooling: null,
  };
  const itemsForContext = [];

  (items || []).forEach(item => {
    const fullComponent = item.component_details;
    if (!fullComponent) return;

    itemsForContext.push({ id: fullComponent.id, name: fullComponent.name });

    switch (fullComponent.category) {
      case 'cpus':
        restoredBuild.cpu = fullComponent;
        break;
      case 'motherboards':
        restoredBuild.motherboard = fullComponent;
        break;
      case 'videocards':
      case 'gpus':
        restoredBuild.gpu = fullComponent;
        break;
      case 'coolers':
      case 'coolings':
        restoredBuild.cooling = fullComponent;
        break;
      case 'power-supplies':
      case 'psus':
        restoredBuild.psu = fullComponent;
        break;
      case 'memory':
      case 'rams':
        restoredBuild.ram.push({
          ...fullComponent,
          uniqueId: `${fullComponent.id}_${Date.now()}_${Math.random()}`
        });
        break;
      case 'storages':
        restoredBuild.storage.push({
          ...fullComponent,
          uniqueId: `${fullComponent.id}_${Date.now()}_${Math.random()}`
        });
        break;
      default:
        console.warn(`Неизвестная категория: ${fullComponent.category}`);
    }
  });

  return { restoredBuild, itemsForContext };
}

const EDIT_DRAFT_ID_KEY = 'pc_build_edit_id';
const EDIT_FORCE_RELOAD_KEY = 'pc_edit_force_reload';

function parseBuildFromLocalStorage(emptyBuild) {
  const saved = localStorage.getItem('pc_build');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    return {
      ...emptyBuild,
      ...parsed,
      ram: Array.isArray(parsed.ram) ? parsed.ram : [],
      storage: Array.isArray(parsed.storage) ? parsed.storage : [],
    };
  } catch {
    return null;
  }
}

function buildItemsForContextFromSlots(build) {
  const items = [];
  const push = (comp) => {
    if (comp?.id) items.push({ id: comp.id, name: comp.name || '' });
  };
  push(build.cpu);
  push(build.motherboard);
  push(build.gpu);
  push(build.psu);
  push(build.cooling);
  (build.ram || []).forEach(push);
  (build.storage || []).forEach(push);
  return items;
}

function Configurator({ openAuthModal }) {
  const { components, setComponents, clearBuild } = useContext(BuildContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const processedStateRef = useRef(null);
  // Режим работы: 'free' (свободный) или 'step' (пошаговый)
  const mode = searchParams.get('mode') || 'free';
  // ID редактируемой сборки: из URL или sessionStorage (сохраняется при переходе в каталог)
  const editBuildId = searchParams.get('id') || sessionStorage.getItem('pc_edit_id') || null;
  const [isEditVerified, setIsEditVerified] = useState(!editBuildId);
  const [isLoadingEditAccess, setIsLoadingEditAccess] = useState(false);
  const isEditingBuild = Boolean(editBuildId) && isEditVerified;
  const editBuildNameRef = useRef(
    location.state?.buildName ?? sessionStorage.getItem('pc_edit_name') ?? ''
  );
  const isInitialized = useRef(false);
  const verifiedBuildIdRef = useRef(null);
  const pendingSaveAfterAuthRef = useRef(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));

  const clearEditSession = () => {
    sessionStorage.removeItem('pc_edit_id');
    sessionStorage.removeItem('pc_edit_name');
    verifiedBuildIdRef.current = null;
  };

  const EMPTY_BUILD = {
    cpu: null,
    motherboard: null,
    gpu: null,
    ram: [],
    storage: [],
    psu: null,
    cooling: null,
  };

  const loadBuildFromStorage = () => {
    const savedBuild = localStorage.getItem('pc_build');
    if (!savedBuild) return { ...EMPTY_BUILD };
    try {
      const parsed = JSON.parse(savedBuild);
      return {
        ...EMPTY_BUILD,
        ...parsed,
        ram: Array.isArray(parsed.ram) ? parsed.ram : [],
        storage: Array.isArray(parsed.storage) ? parsed.storage : [],
      };
    } catch (e) {
      console.error(e);
      return { ...EMPTY_BUILD };
    }
  };

  const [build, setBuild] = useState(loadBuildFromStorage);

  const [hasRgb, setHasRgb] = useState(() => {
    return localStorage.getItem('pc_build_rgb') === 'true';
  });

  const [caseFans, setCaseFans] = useState(() => {
    const savedFans = localStorage.getItem('pc_build_fans');
    return savedFans ? parseInt(savedFans, 10) : 0;
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepComponents, setStepComponents] = useState([]);
  const [loadingComponents, setLoadingComponents] = useState(false);

  const powerOpts = useMemo(() => ({ hasRgb, caseFans }), [hasRgb, caseFans]);
  const rawPower = useMemo(
    () => calculateBuildPowerRaw(build, powerOpts),
    [build, powerOpts]
  );
  const recommendedPsu = useMemo(
    () => calculateBuildPower(build, powerOpts),
    [build, powerOpts]
  );
  const [appReq, setAppReq] = useState(null);
  const [appReqLoading, setAppReqLoading] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [buildName, setBuildName] = useState(
    () => sessionStorage.getItem('pc_edit_name') || ''
  );
  const [autoName, setAutoName] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!build.cpu || !build.gpu) {
      setAppReq(null);
      setAppReqLoading(false);
      return undefined;
    }
    const ctrl = new AbortController();
    setAppReqLoading(true);
    fetchAppRequirements(build, ctrl.signal)
      .then((data) => setAppReq(data))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setAppReq({ available: false, message: 'Не удалось проверить требования приложений.' });
        }
      })
      .finally(() => setAppReqLoading(false));
    return () => ctrl.abort();
  }, [build.cpu, build.gpu, build.ram]);

  useEffect(() => {
    if (isInitialized.current) return;

    // Редактирование: состав и права загружаются с API (см. verifyEditAccess)
    if (editBuildId) {
      isInitialized.current = true;
      return;
    }

    // РЕЖИМ ЧИСТОГО СОЗДАНИЯ С НУЛЯ
    if (!location.state?.chosenComponent && mode !== 'edit') {
      clearBuild();
      sessionStorage.removeItem('pc_edit_id');
      sessionStorage.removeItem('pc_edit_name');
      localStorage.removeItem('pc_build');
      localStorage.removeItem('pc_build_rgb');
      localStorage.removeItem('pc_build_fans');
      sessionStorage.removeItem(EDIT_DRAFT_ID_KEY);
      setBuild({ ...EMPTY_BUILD });
      setHasRgb(false);
      setCaseFans(0);
    }

    isInitialized.current = true;
  }, [location.state, setComponents, clearBuild, mode, searchParams]);

  const currentStep = STEPS[currentStepIndex];

  // Синхронизация сборки, RGB и вентиляторов с localStorage
  useEffect(() => {
    localStorage.setItem('pc_build', JSON.stringify(build));
    if (editBuildId) {
      sessionStorage.setItem(EDIT_DRAFT_ID_KEY, String(editBuildId));
    }
  }, [build, editBuildId]);

  useEffect(() => {
    localStorage.setItem('pc_build_rgb', hasRgb);
  }, [hasRgb]);

  useEffect(() => {
    localStorage.setItem('pc_build_fans', caseFans);
  }, [caseFans]);

  // Проверка владельца (один раз на id; без сброса экрана при повторных рендерах)
  useEffect(() => {
    if (!editBuildId) {
      verifiedBuildIdRef.current = null;
      setIsEditVerified(true);
      setIsLoadingEditAccess(false);
      return;
    }

    const buildIdStr = String(editBuildId);
    if (verifiedBuildIdRef.current === buildIdStr) {
      return;
    }

    let cancelled = false;

    const verifyEditAccess = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsEditVerified(false);
        setIsLoadingEditAccess(false);
        openAuthModal();
        return;
      }

      setIsLoadingEditAccess(true);

      try {
        const res = await fetch(`/api/configurations/${buildIdStr}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (cancelled) return;

        if (res.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          openAuthModal();
          return;
        }

        if (!res.ok) {
          clearEditSession();
          alert('Сборка не найдена или у вас нет прав на её редактирование.');
          navigate('/profile', { replace: true });
          return;
        }

        const data = await res.json();
        const forceReload = sessionStorage.getItem(EDIT_FORCE_RELOAD_KEY) === '1';
        sessionStorage.removeItem(EDIT_FORCE_RELOAD_KEY);

        const draftMatches = sessionStorage.getItem(EDIT_DRAFT_ID_KEY) === buildIdStr;
        const localBuild = !forceReload && draftMatches ? parseBuildFromLocalStorage(EMPTY_BUILD) : null;

        let restoredBuild;
        let itemsForContext;

        if (localBuild) {
          restoredBuild = localBuild;
          itemsForContext = buildItemsForContextFromSlots(restoredBuild);
          setHasRgb(localStorage.getItem('pc_build_rgb') === 'true');
          const fans = parseInt(localStorage.getItem('pc_build_fans'), 10) || 0;
          setCaseFans(fans);
        } else {
          const mapped = mapConfigurationItemsToBuild(data.items);
          restoredBuild = mapped.restoredBuild;
          itemsForContext = mapped.itemsForContext;
          setHasRgb(Boolean(data.has_rgb));
          localStorage.setItem('pc_build_rgb', String(data.has_rgb));
          const fans = parseInt(data.cooler_count, 10) || 0;
          setCaseFans(fans);
          localStorage.setItem('pc_build_fans', String(fans));
        }

        setComponents(itemsForContext);
        setBuild(restoredBuild);
        localStorage.setItem('pc_build', JSON.stringify(restoredBuild));
        sessionStorage.setItem(EDIT_DRAFT_ID_KEY, buildIdStr);
        editBuildNameRef.current = data.name || '';
        setBuildName(data.name || '');
        sessionStorage.setItem('pc_edit_id', buildIdStr);
        sessionStorage.setItem('pc_edit_name', data.name || '');
        verifiedBuildIdRef.current = buildIdStr;
        setIsEditVerified(true);

        if (searchParams.get('mode') !== 'edit' || searchParams.get('id') !== buildIdStr) {
          setSearchParams({ mode: 'edit', id: buildIdStr }, { replace: true });
        }
      } catch {
        if (!cancelled) {
          clearEditSession();
          alert('Не удалось загрузить сборку для редактирования.');
          navigate('/profile', { replace: true });
        }
      } finally {
        if (!cancelled) setIsLoadingEditAccess(false);
      }
    };

    verifyEditAccess();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBuildId, authToken]);

  useEffect(() => {
    const handleAuthSuccess = () => {
      setAuthToken(localStorage.getItem('accessToken'));
      if (pendingSaveAfterAuthRef.current && localStorage.getItem('accessToken')) {
        pendingSaveAfterAuthRef.current = false;
        if (!editBuildId) {
          setIsSaveModalOpen(true);
        }
      }
    };
    window.addEventListener('auth_success', handleAuthSuccess);
    return () => window.removeEventListener('auth_success', handleAuthSuccess);
  }, [editBuildId]);

  // Загрузка комплектующих для пошагового режима
  useEffect(() => {
    if (mode !== 'step') return;

    const fetchStepComponents = async () => {
      setLoadingComponents(true);
      try {
        let endpointMap = {
          cpu: '/api/cpus/',
          motherboard: '/api/motherboards/',
          gpu: '/api/videocards/',
          ram: '/api/memory/',
          storage: '/api/storages/',
          psu: '/api/power-supplies/',
          cooling: '/api/coolers/'
        };

        let url = `${endpointMap[currentStep.id]}?`;
        
        if (currentStep.id === 'motherboard' && build.gpu) {
          url += `gpu_id=${build.gpu.id}`;
        } else if (currentStep.id === 'cpu' && build.motherboard) {
          url += `socket=${encodeURIComponent(build.motherboard.socket || '')}`;
        } else if (currentStep.id === 'ram' && build.motherboard) {
          // 1. Оставляем базовый фильтр по ID материнской платы
          url += `motherboard_id=${build.motherboard.id}`;
          
          // 2. Мягко добавляем параметр типа (передаем как есть, без принудительного нижнего регистра)
          if (build.motherboard.ram_type) {
            url += `&type=${encodeURIComponent(build.motherboard.ram_type.trim())}`;
          }

        } else if (currentStep.id === 'storage' && build.motherboard) {
          url += `motherboard_id=${build.motherboard.id}`;
        } else if (currentStep.id === 'psu') {
          url += `min_power=${recommendedPsu}`;
        }
        

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          if (currentStep.id === 'cooling') {
            const activeSocket = String(build.motherboard?.socket || build.cpu?.socket || '').toLowerCase().trim();
            if (activeSocket) {
              const filteredCoolers = data.filter(cooler => {
                const coolerSockets = String(cooler.socket || '').toLowerCase();
                return coolerSockets.includes(activeSocket);
              });
              setStepComponents(filteredCoolers);
            } else {
              setStepComponents(data);
            }
          } else {
            setStepComponents(data);
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки совместимых компонентов:", err);
      } finally {
        setLoadingComponents(false);
      }
    };

    fetchStepComponents();
  }, [currentStepIndex, mode, build.motherboard, build.cpu, build.gpu, recommendedPsu]);

 // Обработка перехода обратно из каталога (для свободного режима)
  // Обработка перехода обратно из каталога (для свободного режима)
  useEffect(() => {
    if (location.state?.chosenComponent && location.state?.nodeId) {
      const { nodeId, chosenComponent } = location.state;
      
      // Защита от дублирования на одном рендере
      const stateKey = `${nodeId}_${chosenComponent.id}`;
      if (processedStateRef.current === stateKey) return;
      processedStateRef.current = stateKey;

      setBuild(prev => {
        let updatedBuild;
        if (nodeId === 'ram' || nodeId === 'storage') {
          updatedBuild = {
            ...prev,
            [nodeId]: [...(prev[nodeId] || []), { ...chosenComponent, uniqueId: chosenComponent.id + '_' + Date.now() }]
          };
        } else {
          updatedBuild = { ...prev, [nodeId]: chosenComponent };
        }
        // Принудительно дублируем запись в localStorage в этот же момент
        localStorage.setItem('pc_build', JSON.stringify(updatedBuild));
        if (editBuildId) {
          sessionStorage.setItem(EDIT_DRAFT_ID_KEY, String(editBuildId));
        }
        return updatedBuild;
      });

      // Очищаем state навигации, сохраняя текущие query-параметры (?mode=free)
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    } else {
      // Сбрасываем реф, когда state уже пуст
      processedStateRef.current = null;
    }
  }, [location.state, location.pathname, location.search, navigate]);

  const handleSelectComponent = (category) => {
    const configMode = editBuildId ? 'edit' : mode;
    const idParam = editBuildId ? `&originId=${editBuildId}` : '';
    navigate(`/catalog?mode=configurator&category=${category}&originMode=${configMode}${idParam}`);
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

  // Метод удаления одной (последней добавленной) плашки конкретного ID для шага мастера
  const handleRemoveOneInstanceInStep = (stepId, itemId) => {
    setBuild(prev => {
      const currentList = prev[stepId] || [];
      // Находим индекс последнего добавленного элемента с таким id
      const targetIndex = [...currentList].reverse().findIndex(x => x.id === itemId);
      if (targetIndex === -1) return prev;
      
      const actualIndex = currentList.length - 1 - targetIndex;
      return {
        ...prev,
        [stepId]: currentList.filter((_, idx) => idx !== actualIndex)
      };
    });
  };

  const handleClearBuild = () => {
    setBuild({ ...EMPTY_BUILD });
    setHasRgb(false);
    setCaseFans(0);
    localStorage.removeItem('pc_build');
    localStorage.removeItem('pc_build_rgb');
    localStorage.removeItem('pc_build_fans');
    setCurrentStepIndex(0);
    if (!editBuildId) {
      sessionStorage.removeItem('pc_edit_id');
      sessionStorage.removeItem('pc_edit_name');
    }
  };

  const parseToNumber = (val) => {
    if (val === undefined || val === null) return 0;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const countPhysicalRamModules = () => countRamModules(build.ram);

  const getItemPhysicalModulesCount = (item) => {
    const nameLower = String(item.name || '').toLowerCase();
    const kitMatch = nameLower.match(/(\d+)x/);
    if (kitMatch) return parseInt(kitMatch[1], 10);
    if (nameLower.includes('kit') || nameLower.includes('комплект')) return 2;
    return 1;
  };

  const psuWattage = build.psu ? parseToNumber(build.psu.wattage) : 0;
  const totalPhysicalModules = countPhysicalRamModules();
  const getValidationMessages = () => {
    const errors = [];
    const warnings = [];
    const { cpu, motherboard, gpu, ram, psu, cooling } = build;

    if (ram && ram.length > 0) {
      let hasDifferentModels = false;
      const firstRamId = ram[0].id;
      let totalRamCapacity = 0;

      ram.forEach(item => {
        if (item.id !== firstRamId) hasDifferentModels = true; 
        totalRamCapacity += parseToNumber(item.capacity);
      });

      if (hasDifferentModels) {
        warnings.push({
          slot: 'ram',
          text: 'Внимание: Вы выбрали разные устройства ОЗУ. Память может сбросить частоты до минимальных.'
        });
      }

      if (totalPhysicalModules === 1 && !hasDifferentModels) {
        warnings.push({
          slot: 'ram',
          text: 'В сборке всего один модуль памяти. Для активации двухканального режима добавьте второй идентичный модуль или выберите Kit-комплект.'
        });
      }
      if (motherboard) {
        // === НАЧАЛО НОВОГО БЛОКА: ПРОВЕРКА ТИПА ПАМЯТИ DDR ===
        const mbRamType = String(motherboard.ram_type || '').toLowerCase().trim();
        
        ram.forEach(item => {
          const ramType = String(item.type || '').toLowerCase().trim();
          // Если у платы и оперативки указаны типы, и они не совпадают (например, ddr4 и ddr5)
          if (mbRamType && ramType && mbRamType !== ramType) {
            errors.push({ 
              slot: 'ram', 
              text: `КРИТИЧЕСКАЯ ОШИБКА: Несовместимость поколений ОЗУ! Материнская плата поддерживает стандарт ${mbRamType.toUpperCase()}, а выбранная планка памяти является ${ramType.toUpperCase()}. Они физически не вставятся в слот.` 
            });
          }
          const ramSpeed = parseToNumber(item.speed_mhz);
          const mbMaxSpeed = parseToNumber(motherboard.ram_speed);
          if (ramSpeed > 0 && mbMaxSpeed > 0 && ramSpeed > mbMaxSpeed) {
            warnings.push({
              slot: 'ram',
              text: `Частота ОЗУ ${ramSpeed} МГц выше заявленного максимума платы (${mbMaxSpeed} МГц). Память будет работать на пониженной частоте.`
            });
          }
        });
      }
      if (motherboard) {
        if (motherboard.ram_slots) {
          const maxSlots = parseToNumber(motherboard.ram_slots);
          if (totalPhysicalModules > maxSlots) {
            errors.push({
              slot: 'ram',
              text: `КРИТИЧЕСКАЯ ОШИБКА: Превышено количество слотов ОЗУ! Плата имеет разъемов: ${maxSlots}.`
            });
          }
        }

        if (motherboard.ram_max) {
          const maxCapacity = parseToNumber(motherboard.ram_max);
          if (totalRamCapacity > maxCapacity) {
            errors.push({
              slot: 'ram',
              text: `КРИТИЧЕСКАЯ ОШИБКА: Превышен макс. объем памяти! Максимум платы: ${maxCapacity} ГБ.`
            });
          }
        }
      }
    }

    if (cpu && motherboard) {
      const cpuSocket = String(cpu.socket || '').toLowerCase().trim();
      const mbSocket = String(motherboard.socket || '').toLowerCase().trim();
      if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
        errors.push({
          slot: 'motherboard',
          text: `КРИТИЧЕСКАЯ ОШИБКА: Несовпадение сокетов! Процессор (${cpu.socket.toUpperCase()}) и плата (${motherboard.socket.toUpperCase()}) несовместимы.`
        });
      }
    }

    if (cooling && motherboard) {
      const mbSocket = String(motherboard.socket || '').toLowerCase().trim();
      const rawSockets = cooling.socket || ''; 
      if (mbSocket && rawSockets) {
        const coolingSockets = String(rawSockets).toLowerCase().split(',').map(s => s.trim());
        const isCoolerCompatible = coolingSockets.some(s => s.includes(mbSocket) || mbSocket.includes(s));
        if (!isCoolerCompatible) {
          errors.push({
            slot: 'cooling',
            text: `КРИТИЧЕСКАЯ ОШИБКА: Кулер несовместим с платой под сокет ${motherboard.socket.toUpperCase()}.`
          });
        }
      }
    }

    if (psu) {
      const rec = calculateBuildPower(build, { hasRgb, caseFans });
      if (psuWattage > 0 && psuWattage < rec) {
        errors.push({
          slot: 'psu',
          text: `КРИТИЧЕСКАЯ ОШИБКА: БП недостаточен! Рекомендуется от ${rec} Вт (с запасом 25%), выбрано ${psuWattage} Вт.`
        });
      }
    }

    if (gpu && psu) {
      const gpuConn = String(gpu.power_connectors || '').toLowerCase();
      const pcie12 = parseToNumber(psu.connectors_pcie_12pin);
      const pcie8 = parseToNumber(psu.connectors_pcie_8pin) + parseToNumber(psu.connectors_pcie_6_2pin);
      if ((gpuConn.includes('16-pin') || gpuConn.includes('12vhpwr')) && pcie12 < 1) {
        warnings.push({
          slot: 'psu',
          text: 'Видеокарта рассчитана на разъём 12VHPWR (16-pin), у выбранного БП его нет — может понадобиться переходник.'
        });
      }
      const need8pin = (gpuConn.match(/8-pin/g) || []).length + (gpuConn.includes('6-pin') ? 1 : 0);
      if (need8pin >= 2 && pcie8 < 2) {
        warnings.push({
          slot: 'psu',
          text: `У GPU указано питание «${gpu.power_connectors}», а у БП недостаточно PCIe-разъёмов (8-pin/6+2-pin: ${pcie8}).`
        });
      }
    }

    if (motherboard && build.storage?.length > 0) {
      const m2Slots = parseToNumber(motherboard.m2_slots);
      const sataPorts = parseToNumber(motherboard.sata_ports);
      let m2Used = 0;
      let sataUsed = 0;
      build.storage.forEach(disk => {
        const ff = String(disk.form_factor || '').toLowerCase();
        const iface = String(disk.interface || '').toLowerCase();
        if (ff.includes('m.2') || iface.includes('nvme') || iface.includes('pcie')) m2Used += 1;
        else sataUsed += 1;
      });
      if (m2Slots > 0 && m2Used > m2Slots) {
        errors.push({
          slot: 'storage',
          text: `КРИТИЧЕСКАЯ ОШИБКА: M.2 накопителей (${m2Used}) больше, чем слотов на плате (${m2Slots}).`
        });
      }
      if (sataPorts > 0 && sataUsed > sataPorts) {
        warnings.push({
          slot: 'storage',
          text: `SATA-накопителей (${sataUsed}) больше портов платы (${sataPorts}). Потребуется PCIe-адаптер или хаб.`
        });
      }
    }

    if (cpu && !motherboard) {
      warnings.push({
        slot: 'motherboard',
        text: `Выбран процессор ${cpu.socket}. Добавьте материнскую плату с тем же сокетом.`
      });
    }

    return { errors, warnings };
  };

  const { errors, warnings } = getValidationMessages();
  const isBuildEmpty = !build.cpu && !build.motherboard && !build.gpu && build.ram.length === 0 && build.storage.length === 0 && !build.psu && !build.cooling;
  const isBuildComplete = build.cpu && build.motherboard && build.gpu && build.ram.length > 0 && build.storage.length > 0 && build.psu && build.cooling;

  // Логика добавления / мульти-добавления (включая поддержку идентичных плашек)
  const handleToggleComponentInStep = (item) => {
    setBuild(prev => {
      if (currentStep.isArray) {
        const currentList = prev[currentStep.id] || [];

        // Если добавляем ОЗУ, проверяем лимит слотов материнской платы
        if (currentStep.id === 'ram' && prev.motherboard?.ram_slots) {
          const maxSlots = parseToNumber(prev.motherboard.ram_slots);
          const currentSlotsUsed = countPhysicalRamModules();
          const prospectiveSlots = getItemPhysicalModulesCount(item);

          if (currentSlotsUsed + prospectiveSlots > maxSlots) {
            return prev; // Превышение лимита физических слотов
          }
        }

        // Если добавляем Накопитель типа M.2, проверяем лимит разъемов M.2 платы
        if (currentStep.id === 'storage' && prev.motherboard && String(item.type).toLowerCase().includes('m.2')) {
          const maxM2 = parseToNumber(prev.motherboard.m2_slots);
          const currentM2Used = currentList.filter(x => String(x.type).toLowerCase().includes('m.2')).length;
          if (currentM2Used >= maxM2) {
            return prev; 
          }
        }

        // Позволяем добавлять одинаковые плашки: просто пушим новый объект с уникальным uniqueId
        return {
          ...prev,
          [currentStep.id]: [...currentList, { ...item, uniqueId: item.id + '_' + Date.now() }]
        };
      } else {
        // Для одиночных объектов клик просто заменяет/выбирает элемент
        return {
          ...prev,
          [currentStep.id]: item
        };
      }
    });
  };

  const handleNextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const getComponentIds = () => [
    build.cpu?.id,
    build.motherboard?.id,
    build.gpu?.id,
    build.psu?.id,
    build.cooling?.id,
    ...build.ram.map(r => r.id),
    ...build.storage.map(s => s.id)
  ].filter(id => id !== undefined && id !== null);

  const buildPayload = (name) => ({
    name,
    total_power: recommendedPsu,
    component_ids: getComponentIds(),
    has_rgb: hasRgb,
    cooler_count: caseFans
  });

  const handleAuthExpired = () => {
    alert('Сессия истекла. Пожалуйста, войдите заново.');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const updateExistingBuild = async (token, name) => {
    const res = await fetch(`/api/configurations/${editBuildId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(buildPayload(name))
    });

    if (res.status === 401) {
      handleAuthExpired();
      return false;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.detail || data.name?.[0] || 'Не удалось обновить сборку.';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }

    return true;
  };

  const handleFinishEditSuccess = () => {
    setSuccessMessage('Сборка успешно сохранена!');
    setIsSuccessModalOpen(true);
  };

  const handleSuccessModalClose = () => {
    setIsSuccessModalOpen(false);
    setSuccessMessage('');
    clearEditSession();
    handleClearBuild();
    clearBuild();
    navigate('/profile');
  };

  const handleOpenSaveModal = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      pendingSaveAfterAuthRef.current = true;
      openAuthModal();
      return;
    }

    // ── РЕДАКТИРОВАНИЕ: PUT без модалки создания ──
    if (isEditingBuild) {
      setIsSaving(true);
      try {
        const name = buildName.trim() || editBuildNameRef.current || 'Моя сборка';
        const ok = await updateExistingBuild(token, name);
        if (ok) handleFinishEditSuccess();
      } catch (err) {
        alert(err.message || 'Ошибка при обновлении сборки.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // ── НОВАЯ СБОРКА: модалка с именем ──
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // На случай, если модалка создания открылась при редактировании — обновляем, не создаём
    if (isEditingBuild) {
      setIsSaveModalOpen(false);
      setIsSaving(true);
      try {
        const name = buildName.trim() || editBuildNameRef.current || 'Моя сборка';
        const ok = await updateExistingBuild(token, name);
        if (ok) handleFinishEditSuccess();
      } catch (err) {
        alert(err.message || 'Ошибка при обновлении сборки.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!autoName && !buildName.trim()) return;

    setSaveError('');
    setIsSaving(true);

    try {
      // === ПРОВЕРКА ЛИМИТА В 5 СБОРОК (только при создании новой) ===
      {
        const checkRes = await fetch('/api/configurations/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (checkRes.status === 401) {
          alert('Сессия вашей авторизации истекла. Пожалуйста, войдите в аккаунт заново.');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.reload();
          return;
        }

        if (checkRes.ok && localStorage.getItem('userRole') !== 'admin') {
          const userBuilds = await checkRes.json();
          if (userBuilds && userBuilds.length >= 5) {
            setSaveError('Лимит исчерпан! Вы можете сохранить не более 5 конфигураций ПК. Пожалуйста, перейдите в личный кабинет и удалите одну из старых сборок, чтобы освободить место.');
            setIsSaving(false);
            return;
          }
        }
      }

      const finalName = autoName ? "Моя сборка ПК " + new Date().toLocaleDateString() : buildName.trim();

      const res = await fetch('/api/configurations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(buildPayload(finalName))
      });

      if (res.status === 401) {
        alert('Сессия вашей авторизации истекла. Пожалуйста, войдите в аккаунт заново.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.reload();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Не удалось сохранить сборку. Попробуйте позже.');
      }

      setIsSaveModalOpen(false);
      setBuildName('');
      handleClearBuild();
      clearBuild();
      navigate('/profile');

    } catch (err) {
      setSaveError(err.message || 'Ошибка соединения с сервером.');
    } finally {
      setIsSaving(false);
    }
  };

  // Вывод характеристик строго по Django-моделям
  const renderComponentSpecs = (item, stepId) => {
    switch (stepId) {
      case 'gpu':
        return `Чипсет: ${item.chipset || 'Н/Д'} | Объем памяти: ${item.capacity || '0'} ГБ | TDP: ${item.tdp || '0'} Вт`;
      case 'motherboard':
        return `Сокет: ${item.socket || 'Н/Д'} | Чипсет: ${item.chipset || 'Н/Д'} | Форм-фактор: ${item.form_factor || 'Н/Д'} | Слотов ОЗУ: ${item.ram_slots || '0'}`;
      case 'cpu':
        return `Сокет: ${item.socket || 'Н/Д'} | Ядер/Потоков: ${item.cores || '0'}/${item.threads || '0'} | Частота: ${item.base_clock_ghz || '0'} ГГц (Boost: ${item.boost_clock_ghz || '0'} ГГц) | TDP: ${item.tdp || '0'} Вт`;
      case 'cooling':
        return `Рассеиваемая мощность (TDP): ${item.tdp || '0'} Вт | Высота: ${item.height || '0'} мм | Шум: ${item.noise_level || '0'} дБ`;
      case 'ram':
        return `Тип: ${item.type || 'Н/Д'} | Объем: ${item.capacity || '0'} ГБ | Частота: ${item.speed_mhz || '0'} МГц | Тайминги: ${item.timings || 'Н/Д'}`;
      case 'storage':
        return `Тип: ${item.type || 'Н/Д'} | Объем: ${item.capacity || '0'} ГБ | Интерфейс: ${item.interface || 'Н/Д'} | Скорость (Чт/Зп): ${item.read_speed || '0'}/${item.write_speed || '0'} МБ/с`;
      case 'psu':
        return `Мощность: ${item.wattage || '0'} Вт | Сертификат: ${item.efficiency_rating || 'Н/Д'}`;
      default:
        return '';
    }
  };

  const slotsConfig = [
    { id: 'gpu', name: 'Видеокарта', icon: <Gamepad2 size={20} />, category: 'videocards', isArray: false },
    { id: 'motherboard', name: 'Материнская плата', icon: <Layers size={20} />, category: 'motherboards', isArray: false },
    { id: 'cpu', name: 'Процессор', icon: <Cpu size={20} />, category: 'cpus', isArray: false },
    { id: 'cooling', name: 'Охлаждение CPU', icon: <Wind size={20} />, category: 'coolers', isArray: false },
    { id: 'ram', name: 'Оперативная память', icon: <Box size={20} />, category: 'memory', isArray: true },
    { id: 'storage', name: 'Накопители (SSD/HDD)', icon: <HardDrive size={20} />, category: 'storages', isArray: true },
    { id: 'psu', name: 'Блок питания', icon: <Plug size={20} />, category: 'power-supplies', isArray: false },
  ];

  // Проверка валидности сохранения для кнопки
  const isSaveDisabled = !autoName && !buildName.trim();

  const stepPanelCardStyle = {
    ...panelCardStyle,
    maxHeight: 'calc(100vh - 100px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const stepPanelMiddleStyle = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingRight: '2px',
  };

  const stepPanelFooterStyle = {
    flexShrink: 0,
    borderTop: '1px solid #2c2c44',
    paddingTop: '14px',
    marginTop: '12px',
    backgroundColor: '#1c1c2e',
  };

  const stepCompositionBlockStyle = {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '12px',
    borderBottom: '1px solid #2c2c44',
  };

  const validationSectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flexShrink: 0,
    marginBottom: '14px',
    padding: '12px',
    backgroundColor: '#12121e',
    border: '1px solid #2c2c44',
    borderRadius: '10px',
  };

  const compatibilityReports = !isBuildEmpty ? (
    <>
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
    </>
  ) : null;

  return (
    <div style={containerStyle}>
      {isLoadingEditAccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          backgroundColor: 'rgba(9, 9, 15, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#e4e4e7', fontSize: '15px', fontWeight: '600'
        }}>
          Проверка доступа к сборке...
        </div>
      )}
      <header style={headerStyle}>
        <h1 style={titleStyle}>Конфигуратор системного блока</h1>
        {isEditingBuild && (
          <p style={{ color: '#60a5fa', fontSize: '13px', marginTop: '8px' }}>
            Режим редактирования: {buildName || editBuildNameRef.current}
          </p>
        )}
        <p style={subtitleStyle}>Интеллектуальная проверка линий питания, сокетов и лимитов нагрузки</p>
      </header>

      {/* СТЕППЕР */}
      {mode === 'step' && (
        <div style={stepperContainerStyle}>
          {STEPS.map((step, index) => {
            const isCompleted = build[step.id] && (!step.isArray || build[step.id].length > 0);
            const isActive = index === currentStepIndex;

            return (
              <div key={step.id} style={stepItemStyle}>
                {index > 0 && (
                  <div style={{
                    ...stepLineStyle,
                    backgroundColor: index <= currentStepIndex ? '#0071e3' : '#2c2c44'
                  }} />
                )}

                <div style={stepInnerWrapper}>
                  <span style={stepNameStyle(isActive)}>{step.name}</span>
                  <div style={{
                    ...stepCircleBaseStyle,
                    background: isCompleted ? '#10b981' : isActive ? '#0071e3' : '#1c1c2e',
                    border: isActive ? '2px solid #60a5fa' : '1px solid #2c2c44',
                    color: isCompleted || isActive ? '#fff' : '#a1a1aa'
                  }}>
                    {isCompleted ? <Check size={14} /> : step.icon}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={workspaceStyle}>
        <div style={slotsContainerStyle}>
          {mode === 'step' ? (
            <div style={wizardCardStyle}>
              <div style={wizardHeaderStyle}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Шаг {currentStepIndex + 1}: {currentStep.name}</h2>
                <p style={hintTextStyle}>{currentStep.hint}</p>
              </div>

              <div style={tableContainerStyle}>
                {loadingComponents ? (
                  <p style={loadingTextStyle}>Поиск аппаратно совместимых моделей...</p>
                ) : stepComponents.length === 0 ? (
                  <p style={loadingTextStyle}>В каталоге не найдено совместимых моделей для данного сокета / параметров.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stepComponents.map((item) => {
                      let isSelected = false;
                      let selectedCount = 0;
                      
                      if (currentStep.isArray) {
                        const instances = (build[currentStep.id] || []).filter(x => x.id === item.id);
                        isSelected = instances.length > 0;
                        selectedCount = instances.length;
                      } else {
                        isSelected = build[currentStep.id]?.id === item.id;
                      }

                      // Логика блокировки выбора ОЗУ при достижении лимита слотов материнской платы
                      let isMaxSlotsReached = false;
                      if (currentStep.id === 'ram' && build.motherboard?.ram_slots) {
                        const maxSlots = parseToNumber(build.motherboard.ram_slots);
                        const currentSlotsUsed = countPhysicalRamModules();
                        const prospectiveSlots = getItemPhysicalModulesCount(item);
                        if (currentSlotsUsed + prospectiveSlots > maxSlots) {
                          isMaxSlotsReached = true;
                        }
                      }

                      return (
                        <div 
                          key={item.id} 
                          style={{
                            ...stepTableRowStyle(isSelected),
                            opacity: isMaxSlotsReached && !isSelected ? 0.4 : 1,
                            cursor: isMaxSlotsReached && !isSelected ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => {
                            if (!isMaxSlotsReached || isSelected) {
                              handleToggleComponentInStep(item);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            <strong style={{ color: '#fff', fontSize: '14px' }}>
                              {item.name} {selectedCount > 1 && <span style={{color: '#10b981', marginLeft: '6px'}}>({selectedCount} шт.)</span>}
                            </strong>
                            <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '600' }}>
                              {renderComponentSpecs(item, currentStep.id)}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            {currentStep.isArray && isSelected && (
                              <button 
                                style={{ ...rowButtonStyle, backgroundColor: '#ef4444', border: 'none', padding: '6px 10px' }}
                                onClick={() => handleRemoveOneInstanceInStep(currentStep.id, item.id)}
                              >
                                <Minus size={12} />
                              </button>
                            )}
                            
                            <button 
                              style={isSelected ? activeRowButtonStyle : rowButtonStyle} 
                              disabled={isMaxSlotsReached && !isSelected}
                              onClick={() => {
                                if (!isMaxSlotsReached || isSelected) handleToggleComponentInStep(item);
                              }}
                            >
                              {isSelected ? (currentStep.isArray ? 'Добавить еще' : 'Выбрано') : isMaxSlotsReached ? 'Мест нет' : 'Выбрать'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={wizardFooterActionsStyle}>
                <button 
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  style={{ ...modalCancelButtonStyle, padding: '10px 20px', opacity: currentStepIndex === 0 ? 0.4 : 1, cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer', width: 'auto', flex: 'none' }}
                >
                  <ArrowLeft size={16} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} /> Назад
                </button>

                {currentStepIndex < STEPS.length - 1 ? (
            <button
              /* Условие блокировки кнопок: 
                Если для текущего шага это массив (ram, storage) — проверяем, чтобы длина массива была > 0.
                Если это одиночный компонент (cpu, gpu и т.д.) — проверяем, чтобы он физически существовал.
              */
              disabled={
                STEPS[currentStepIndex].isArray
                  ? (!build[STEPS[currentStepIndex].id] || build[STEPS[currentStepIndex].id].length === 0)
                  : !build[STEPS[currentStepIndex].id]
              }
              onClick={handleNextStep}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: (
                  STEPS[currentStepIndex].isArray
                    ? (!build[STEPS[currentStepIndex].id] || build[STEPS[currentStepIndex].id].length === 0)
                    : !build[STEPS[currentStepIndex].id]
                ) ? '#1c1c2e' : '#0071e3', // Красим в темный цвет при блокировке, в синий — когда деталь выбрана
                color: (
                  STEPS[currentStepIndex].isArray
                    ? (!build[STEPS[currentStepIndex].id] || build[STEPS[currentStepIndex].id].length === 0)
                    : !build[STEPS[currentStepIndex].id]
                ) ? '#45455c' : '#ffffff',
                border: '1px solid ' + ((
                  STEPS[currentStepIndex].isArray
                    ? (!build[STEPS[currentStepIndex].id] || build[STEPS[currentStepIndex].id].length === 0)
                    : !build[STEPS[currentStepIndex].id]
                ) ? '#2c2c44' : '#0071e3'),
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: (
                  STEPS[currentStepIndex].isArray
                    ? (!build[STEPS[currentStepIndex].id] || build[STEPS[currentStepIndex].id].length === 0)
                    : !build[STEPS[currentStepIndex].id]
                ) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                outline: 'none'
              }}
            >
              Далее
              <ArrowRight size={16} />
            </button>
          ) : (
            // На самом последнем шаге вместо кнопки "Далее" ничего не выводим
            null
          )}
        </div>
            </div>
          ) : (
            slotsConfig.map((slot) => {
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
            })
          )}
        </div>

        <div style={stickyPanelStyle}>
          <div style={mode === 'step' ? stepPanelCardStyle : panelCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
              <h3 style={panelTitleStyle}>Текущий состав</h3>
              {!isBuildEmpty && <button onClick={handleClearBuild} style={clearBuildButtonStyle}>Очистить всё</button>}
            </div>

            {compatibilityReports && (
              <div style={validationSectionStyle}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Проверка совместимости
                </div>
                {compatibilityReports}
              </div>
            )}

            {mode === 'step' && (
            <div style={stepCompositionBlockStyle}>
  {STEPS.map(st => {
    const comp = build[st.id];
    const isArr = st.isArray;
    return (
      <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <span style={{ color: '#a1a1aa' }}>{st.name}:</span>
        <span style={{ 
          color: comp && (!isArr || comp.length > 0) ? '#10b981' : '#71717a', 
          fontWeight: '500', 
          maxWidth: '200px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }}>
          {isArr ? (
            comp?.length > 0 ? (
              // Если шаг оперативной памяти — выводим подсчитанные плашки, иначе — длину массива
              st.category === 'memory' ? `${totalPhysicalModules} устр.` : `${comp.length} устр.`
            ) : (
              'Ожидание...'
            )
          ) : (
            comp ? comp.name : 'Ожидание...'
          )}
        </span>
      </div>
    );
  })}
</div>
            )}

            <div style={stepPanelMiddleStyle}>
            {mode !== 'step' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #2c2c44', paddingBottom: '12px', flexShrink: 0 }}>
  {STEPS.map(st => {
    const comp = build[st.id];
    const isArr = st.isArray;
    return (
      <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <span style={{ color: '#a1a1aa' }}>{st.name}:</span>
        <span style={{ 
          color: comp && (!isArr || comp.length > 0) ? '#10b981' : '#71717a', 
          fontWeight: '500', 
          maxWidth: '200px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }}>
          {isArr ? (
            comp?.length > 0 ? (
              st.category === 'memory' ? `${totalPhysicalModules} устр.` : `${comp.length} устр.`
            ) : (
              'Ожидание...'
            )
          ) : (
            comp ? comp.name : 'Ожидание...'
          )}
        </span>
      </div>
    );
  })}
</div>
            )}

            {!isBuildEmpty && (
              <div style={rgbCheckboxContainerStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                  <input 
                    type="checkbox" 
                    checked={hasRgb} 
                    onChange={(e) => setHasRgb(e.target.checked)}
                    style={checkboxStyle}
                  />
                  Будет RGB подсветка
                </label>
                
                {/* Ввод количества корпусных вентиляторов */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Корпусные кулеры (до 20 шт):</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="20" 
                    value={caseFans} 
                    onChange={(e) => {
                      let val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < 0) val = 0;
                      if (val > 20) val = 20;
                      setCaseFans(val);
                    }}
                    style={{
                      width: '55px',
                      backgroundColor: '#12121e',
                      border: '1px solid #2c2c44',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '13px',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {!isBuildEmpty && (
              <div style={tdpPanelStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#a1a1aa', fontWeight: '500' }}>Пиковое потребление:</span>
                  <strong style={{ color: '#ffffff' }}>~{rawPower} Вт</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#a1a1aa', fontWeight: '500' }}>Реком. БП (+25%):</span>
                  <strong style={{ color: '#f59e0b' }}>от {recommendedPsu} Вт</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#a1a1aa', fontWeight: '500' }}>Выбранный БП:</span>
                  <strong style={{ color: psuWattage > 0 && psuWattage >= recommendedPsu ? '#0071e3' : '#ef4444' }}>
                    {psuWattage > 0 ? `${psuWattage} Вт` : 'Не выбран'}
                  </strong>
                </div>
                {build.cpu && build.gpu && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #2c2c44', fontSize: '12px' }}>
                    <div style={{ color: '#0071e3', fontWeight: '700', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Требования приложений
                    </div>
                    {appReqLoading && (
                      <p style={{ color: '#71717a', margin: 0 }}>Проверка требований…</p>
                    )}
                    {!appReqLoading && appReq?.available && (
                      <>
                        <p style={{ color: '#a1a1aa', margin: '0 0 8px', lineHeight: 1.4 }}>
                          Видеокарта: <strong style={{ color: '#fff' }}>{appReq.matched_gpu}</strong>
                          {' · '}индекс <strong style={{ color: '#fff' }}>{appReq.g3d_mark}</strong>
                          {appReq.benchmark_percentile != null && (
                            <span> (уровень выше {appReq.benchmark_percentile}% моделей в базе)</span>
                          )}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                          {(appReq.applications || []).map((app) => {
                            const color = app.status === 'ok' ? '#10b981' : app.status === 'warning' ? '#f59e0b' : '#ef4444';
                            return (
                              <div
                                key={app.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${color}33`,
                                }}
                              >
                                <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{app.name}</span>
                                <span style={{ color, fontSize: '11px', textAlign: 'right' }}>{app.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p style={{ color: '#71717a', margin: '8px 0 0', fontSize: '10px', lineHeight: 1.35 }}>
                          {appReq.disclaimer}
                        </p>
                      </>
                    )}
                    {!appReqLoading && appReq && !appReq.available && (
                      <p style={{ color: '#f59e0b', margin: 0, lineHeight: 1.4 }}>{appReq.message}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {isBuildEmpty && (
              <div style={emptyPanelState}>
                <CheckCircle size={36} color="#a1a1aa" style={{ marginBottom: '10px' }} />
                <span>Добавьте устройства, чтобы запустить проверку.</span>
              </div>
            )}
            </div>

            <div style={mode === 'step' ? stepPanelFooterStyle : { ...panelFooterStyle, flexShrink: 0 }}>
              {mode === 'step' && !isBuildComplete && (
                <p style={{
                  color: '#f59e0b',
                  fontSize: '12px',
                  margin: '0 0 10px',
                  textAlign: 'center',
                  lineHeight: 1.45,
                  fontWeight: '600',
                }}>
                  Пройдите все шаги мастера и заполните каждый слот — тогда станет доступно сохранение.
                </p>
              )}
              <button 
                onClick={handleOpenSaveModal}
                disabled={
                  isSaving
                  || (editBuildId && !isEditVerified)
                  || errors.length > 0
                  || (mode === 'step' ? !isBuildComplete : isBuildEmpty)
                }
                style={{
                  ...checkoutButtonStyle,
                  backgroundColor: isSaving || (editBuildId && !isEditVerified) || errors.length > 0 || (mode === 'step' ? !isBuildComplete : isBuildEmpty) ? '#2c2c44' : '#0071e3',
                  color: isSaving || (editBuildId && !isEditVerified) || errors.length > 0 || (mode === 'step' ? !isBuildComplete : isBuildEmpty) ? '#a1a1aa' : '#ffffff',
                  cursor: isSaving || (editBuildId && !isEditVerified) || errors.length > 0 || (mode === 'step' ? !isBuildComplete : isBuildEmpty) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? 'Сохранение...' : isEditingBuild ? 'Сохранить изменения' : 'Сохранить конфигурацию'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО УСПЕШНОГО СОХРАНЕНИЯ (режим редактирования) */}
      {isSuccessModalOpen && (
        <div style={modalOverlayStyle} onClick={() => !isSaving && handleSuccessModalClose()}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <CheckCircle size={48} color="#10b981" />
            </div>
            <h2 style={{ ...modalTitleStyle, color: '#10b981' }}>Готово</h2>
            <p style={{ ...modalSubtitleStyle, marginBottom: '28px' }}>{successMessage}</p>
            <button
              onClick={handleSuccessModalClose}
              style={{ ...modalSubmitButtonStyle, width: '100%', flex: 'none' }}
            >
              Вернуться в личный кабинет
            </button>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО СОХРАНЕНИЯ НОВОЙ СБОРКИ */}
      {isSaveModalOpen && !isEditingBuild && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button onClick={() => { if(!isSaving) setIsSaveModalOpen(false); }} style={modalCloseButtonStyle}>
              <X size={18} />
            </button>

            <h2 style={modalTitleStyle}>{'Сохранение конфигурации'}</h2>
            <p style={modalSubtitleStyle}>{'Введите данные для сохранения проекта в личном кабинете'}</p>

            {saveError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontWeight: '500' }}>
                {saveError}
              </div>
            )}

            <div style={modalFormGroupStyle}>
              <label style={modalInputLabelStyle}>Имя элемента (название сборки)</label>
              <input 
                type="text" 
                placeholder="Например: Мой мощный ПК 2026"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                disabled={autoName || isSaving}
                style={{
                  ...modalInputStyle,
                  backgroundColor: (autoName || isSaving) ? '#232336' : '#12121e',
                  color: (autoName || isSaving) ? '#71717a' : '#ffffff',
                  cursor: (autoName || isSaving) ? 'not-allowed' : 'text'
                }}
              />
            </div>

            {(
              <div style={modalCheckboxContainerStyle}>
                <label style={modalCheckboxLabelStyle}>
                  <input 
                    type="checkbox" 
                    checked={autoName}
                    onChange={(e) => setAutoName(e.target.checked)}
                    disabled={isSaving}
                    style={checkboxStyle}
                  />
                  Не задавать имя (назначить автоматически)
                </label>
              </div>
            )}

            <div style={modalActionsStyle}>
              <button onClick={() => setIsSaveModalOpen(false)} disabled={isSaving} style={{...modalCancelButtonStyle, opacity: isSaving ? 0.5 : 1, cursor: isSaving ? 'not-allowed' : 'pointer'}}>Отмена</button>
              <button 
                onClick={handleConfirmSave} 
                disabled={isSaveDisabled || isSaving} 
                style={{
                  ...modalSubmitButtonStyle, 
                  backgroundColor: (isSaveDisabled || isSaving) ? '#2c2c44' : '#0071e3',
                  color: (isSaveDisabled || isSaving) ? '#71717a' : '#ffffff',
                  cursor: (isSaveDisabled || isSaving) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// СТИЛИ КОМПОНЕНТА
const stepperContainerStyle = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', maxWidth: '1200px', margin: '0 auto 40px auto', padding: '10px 0', boxSizing: 'border-box' };
const stepItemStyle = { display: 'flex', alignItems: 'center', flex: 1, position: 'relative' };
const stepLineStyle = { height: '2px', flexGrow: 1, position: 'absolute', left: '-50%', right: '50%', bottom: '16px', zIndex: 1, transition: 'background-color 0.3s' };
const stepInnerWrapper = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', zIndex: 2, margin: '0 auto', width: '90px', textAlign: 'center' };
const stepCircleBaseStyle = { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', boxSizing: 'border-box' };
const stepNameStyle = (isActive) => ({ fontSize: '11px', color: isActive ? '#fff' : '#71717a', fontWeight: isActive ? '700' : '500', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.2s' });

const wizardCardStyle = { backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '14px', padding: '24px' };
const wizardHeaderStyle = { borderBottom: '1px solid #2c2c44', paddingBottom: '14px', marginBottom: '16px' };
const hintTextStyle = { color: '#a1a1aa', fontSize: '13px', marginTop: '6px', lineHeight: '1.5' };
const tableContainerStyle = { maxHeight: '380px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' };
const loadingTextStyle = { color: '#a1a1aa', textAlign: 'center', padding: '40px', fontSize: '13px' };
const stepTableRowStyle = (isSelected) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: isSelected ? 'rgba(0, 113, 227, 0.15)' : '#12121e', border: isSelected ? '1px solid #0071e3' : '1px solid #2c2c44', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' });
const rowButtonStyle = { backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', color: '#fff', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' };
const activeRowButtonStyle = { backgroundColor: '#10b981', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' };
const wizardFooterActionsStyle = { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2c2c44', paddingTop: '16px' };

const containerStyle = { backgroundColor: '#12121e', color: '#ffffff', minHeight: '100vh', padding: '40px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', width: '100%', maxWidth: '100vw', overflowX: 'hidden' };
const headerStyle = { marginBottom: '35px', textAlign: 'center' };
const titleStyle = { fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' };
const subtitleStyle = { fontSize: '14px', color: '#a1a1aa', margin: 0 };
const workspaceStyle = { display: 'flex', gap: '24px', maxWidth: '1200px', width: '100%', margin: '0 auto', alignItems: 'flex-start', boxSizing: 'border-box', overflowX: 'hidden' };
const slotsContainerStyle = { flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 };
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
const stickyPanelStyle = { width: 'min(390px, 100%)', maxWidth: '100%', position: 'sticky', top: '40px', flexShrink: 0, minWidth: 0 };
const panelCardStyle = { backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', maxHeight: 'calc(100vh - 120px)', minWidth: 0, overflow: 'hidden' };
const panelTitleStyle = { fontSize: '15px', fontWeight: '700', margin: 0, textTransform: 'uppercase', color: '#0071e3', letterSpacing: '0.5px' };
const tdpPanelStyle = { backgroundColor: '#12121e', border: '1px solid #2c2c44', borderRadius: '10px', padding: '12px', marginBottom: '16px' };
const rgbCheckboxContainerStyle = { backgroundColor: 'rgba(0, 113, 227, 0.05)', border: '1px dashed rgba(0, 113, 227, 0.3)', borderRadius: '10px', padding: '12px', marginBottom: '14px' };
const checkboxStyle = { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0071e3' };
const emptyPanelState = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', color: '#a1a1aa', fontSize: '13px', padding: '40px 10px', border: '1px dashed #2c2c44', borderRadius: '12px' };
const reportsContainerStyle = { display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px', marginBottom: '20px', minWidth: 0, maxWidth: '100%' };
const errorReportStyle = { display: 'flex', gap: '10px', alignItems: 'flex-start', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '12px' };
const warningReportStyle = { display: 'flex', gap: '10px', alignItems: 'flex-start', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '12px' };
const successReportStyle = { display: 'flex', gap: '12px', alignItems: 'flex-start', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '14px' };
const reportTextStyle = { flex: 1, minWidth: 0, fontSize: '13px', color: '#e4e4e7', lineHeight: '1.45', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' };
const panelFooterStyle = { borderTop: '1px solid #2c2c44', paddingTop: '20px', marginTop: 'auto' };
const checkoutButtonStyle = { width: '100%', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 10, 16, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '460px', boxSizing: 'border-box', position: 'relative', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' };
const modalCloseButtonStyle = { position: 'absolute', top: '20px', right: '20px', backgroundColor: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' };
const modalTitleStyle = { fontSize: '20px', fontWeight: '700', color: '#ffffff', margin: '0 0 6px 0', textAlign: 'center' };
const modalSubtitleStyle = { fontSize: '13px', color: '#a1a1aa', margin: '0 0 24px 0', textAlign: 'center', lineHeight: '1.4' };
const modalFormGroupStyle = { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' };
const modalInputLabelStyle = { fontSize: '12px', color: '#a1a1aa', fontWeight: '600' };
const modalInputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #2c2c44', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const modalCheckboxContainerStyle = { marginBottom: '28px' };
const modalCheckboxLabelStyle = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#a1a1aa', fontWeight: '500' };
const modalActionsStyle = { display: 'flex', gap: '12px' };
const modalCancelButtonStyle = { flex: 1, backgroundColor: 'transparent', border: '1px solid #2c2c44', color: '#ffffff', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const modalSubmitButtonStyle = { flex: 1, backgroundColor: '#0071e3', border: 'none', color: '#ffffff', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' };

export default Configurator;