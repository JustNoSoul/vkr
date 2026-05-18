import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Monitor, Zap, Palette, ShieldCheck, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

function Home({ openModeModal }) {
  const navigate = useNavigate();
  
  // Базовый массив сборок
  const baseBuilds = [
    { id: 1, name: 'Офисный Стандарт', desc: 'Надежное и тихое решение для работы с документами, учебы и веб-серфинга.', icon: <Monitor />, badge: 'Бюджет', color: '#0071e3' },
    { id: 2, name: 'Gaming Extreme', desc: 'Бескомпромиссная мощность для игр в 4K разрешении на ультра-настройках.', icon: <LayoutGrid />, badge: 'Гейминг', color: '#ffcc00' },
    { id: 3, name: 'Workstation Pro', desc: 'Профессиональная станция, оптимизированная для 3D-рендеринга и видеомонтажа.', icon: <Palette />, badge: 'Работа', color: '#34c759' },
    { id: 4, name: 'Баланс Плюс', desc: 'Оптимальное соотношение цены, качества и производительности для любых задач.', icon: <Zap />, badge: 'Популярное', color: '#ff3b30' },
    { id: 5, name: 'Медиа Центр', desc: 'Компактный ПК для домашнего кинотеатра, стриминга контента и хранения файлов.', icon: <Monitor />, badge: 'Мультимедиа', color: '#a259ff' },
    { id: 6, name: 'Киберспортсмен', desc: 'Максимальный FPS в соревновательных онлайн-шутерах при минимальной задержке.', icon: <LayoutGrid />, badge: 'E-Sports', color: '#00f0ff' },
  ];

  // Создаем тройной массив для бесконечного скролла: [копия1, копия2(оригинал), копия3]
  const readyBuilds = [...baseBuilds, ...baseBuilds, ...baseBuilds];
  
  // Стартуем строго с начала второй (центральной) копии
  const [currentIndex, setCurrentIndex] = useState(baseBuilds.length);
  const [cardsToShow, setCardsToShow] = useState(3);
  const [withTransition, setWithTransition] = useState(true);
  const isTransitioning = useRef(false);

  // Динамический расчет количества карточек на экране
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 740) setCardsToShow(1);
      else if (width < 1080) setCardsToShow(2);
      else setCardsToShow(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Кнопка ВПРАВО (Контент едет влево)
  const nextSlide = () => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    setWithTransition(true);
    setCurrentIndex((prev) => prev + 1);
  };

  // Кнопка ВЛЕВО (Контент едет вправо)
  const prevSlide = () => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    setWithTransition(true);
    setCurrentIndex((prev) => prev - 1);
  };

  // Хитрый сброс индекса в центр без анимации, когда доходим до виртуальных краев
  const handleTransitionEnd = () => {
    isTransitioning.current = false;
    
    // Если ушли в правый дубль
    if (currentIndex >= baseBuilds.length * 2) {
      setWithTransition(false);
      setCurrentIndex(currentIndex - baseBuilds.length);
    }
    // Если ушли в левый дубль
    if (currentIndex < baseBuilds.length) {
      setWithTransition(false);
      setCurrentIndex(currentIndex + baseBuilds.length);
    }
  };

  const gap = 24; // Отступ между карточками в px
  // Высчитываем ширину карточки так, чтобы их помещалось ровно cardsToShow штук в контейнере
  const cardWidth = `calc((100% - ${(cardsToShow - 1) * gap}px) / ${cardsToShow})`;

  return (
    <div style={containerStyle}>
      {/* --- ГЛАВНЫЙ БАННЕР --- */}
      <div style={heroCardStyle}>
        <h1 style={heroTitleStyle}>Создайте свой идеальный компьютер</h1>
        <p style={heroDescStyle}>
          Умный онлайн-конструктор поможет подобрать комплектующие и автоматически проверит их на стопроцентную совместимость перед покупкой.
        </p>
        <button onClick={openModeModal} style={primaryButtonStyle}>
          Создать новую сборку
        </button>
      </div>

      {/* --- БЛОК БЕСКОНЕЧНОЙ КАРУСЕЛИ --- */}
      <div id="ready-builds-section" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Популярные готовые конфигурации</h2>
          <span style={sectionSubtitleStyle}>Используйте как готовую основу или измените под себя</span>
        </div>

        <div style={carouselContainerStyle}>
          <button onClick={prevSlide} style={arrowButtonStyle}>
            <ChevronLeft size={24} />
          </button>

          {/* Окно просмотра */}
          <div style={sliderViewportStyle}>
            {/* Движущаяся дорожка */}
            <div 
              onTransitionEnd={handleTransitionEnd}
              style={{
                ...sliderTrackStyle,
                gap: `${gap}px`,
                // Сдвигаем дорожку строго пропорционально текущему индексу карточки
                transform: `translateX(calc(-${currentIndex} * (${100 / cardsToShow}% + ${gap / cardsToShow}px)))`,
                transition: withTransition ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
              }}
            >
              {readyBuilds.map((build, index) => (
                <div 
                  key={`${build.id}-${index}`} 
                  style={{ 
                    ...buildCardStyle, 
                    width: cardWidth,
                    minWidth: cardWidth
                  }}
                >
                  <div style={{ ...buildIconStyle, color: build.color }}>{build.icon}</div>
                  <span style={{ ...badgeStyle, backgroundColor: `${build.color}20`, color: build.color }}>{build.badge}</span>
                  <h3 style={buildNameStyle}>{build.name}</h3>
                  <p style={buildDescStyle}>{build.desc}</p>
                  <button onClick={() => navigate(`/configurator?copy=${build.id}`)} style={secondaryButtonStyle}>
                    Открыть сборку
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={nextSlide} style={arrowButtonStyle}>
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* --- ПРЕИМУЩЕСТВА СЕРВИСА --- */}
      <div style={techSpecsStyle}>
        <div style={techItemStyle}>
          <ShieldCheck size={22} color="#34c759" />
          <span style={techTextStyle}>Автоматический контроль совместимости разъемов и сокетов</span>
        </div>
        <div style={techItemStyle}>
          <CheckCircle2 size={22} color="#34c759" />
          <span style={techTextStyle}>Точный расчет необходимой мощности блока питания</span>
        </div>
      </div>
    </div>
  );
}

// --- СТИЛИ ---
const containerStyle = { backgroundColor: '#12121e', color: '#ffffff', minHeight: '100vh', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', width: '100%' };
const heroCardStyle = { backgroundColor: '#1c1c2e', padding: '60px 40px', borderRadius: '24px', textAlign: 'center', marginBottom: '60px', border: '1px solid #2c2c44' };
const heroTitleStyle = { fontSize: '44px', fontWeight: '800', marginBottom: '20px' };
const heroDescStyle = { fontSize: '18px', color: '#e4e4e7', maxWidth: '650px', margin: '0 auto 35px auto', lineHeight: '1.6' };
const primaryButtonStyle = { backgroundColor: '#0071e3', color: '#ffffff', border: 'none', padding: '16px 40px', borderRadius: '980px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' };
const sectionStyle = { marginBottom: '60px', paddingTop: '20px', width: '100%' };
const sectionHeaderStyle = { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '35px', textAlign: 'center' };
const sectionTitleStyle = { fontSize: '32px', fontWeight: '700' };
const sectionSubtitleStyle = { color: '#a1a1aa', fontSize: '16px' };

const carouselContainerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', maxWidth: '1120px', margin: '0 auto', width: '100%' };
const sliderViewportStyle = { overflow: 'hidden', width: '100%', padding: '10px 0' };
const sliderTrackStyle = { display: 'flex', width: '100%' };
const arrowButtonStyle = { backgroundColor: '#1c1c2e', color: '#ffffff', border: '1px solid #2c2c44', borderRadius: '50%', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background-color 0.2s' };

const buildCardStyle = { backgroundColor: '#1c1c2e', padding: '30px 25px', borderRadius: '20px', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid #2c2c44', height: '380px' };
const buildIconStyle = { marginBottom: '20px', display: 'flex' };
const buildNameStyle = { fontSize: '22px', fontWeight: '700', marginBottom: '12px' };
const buildDescStyle = { color: '#e4e4e7', fontSize: '14px', marginBottom: '25px', flexGrow: 1, lineHeight: '1.5' };
const badgeStyle = { position: 'absolute', top: '25px', right: '25px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' };
const secondaryButtonStyle = { backgroundColor: '#2c2c44', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' };

const techSpecsStyle = { borderTop: '1px solid #2c2c44', paddingTop: '40px', display: 'flex', justifyContent: 'center', gap: '50px', flexWrap: 'wrap', marginTop: '40px' };
const techItemStyle = { display: 'flex', alignItems: 'center', gap: '12px' };
const techTextStyle = { color: '#a1a1aa', fontSize: '15px' };

export default Home;