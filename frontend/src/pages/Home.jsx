import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Monitor, Zap, Palette, ShieldCheck, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getBuildAccentColor, getBuildBadge, getBuildPurposeText } from '../utils/readyBuilds.js';

const BUILD_ICONS = [Monitor, LayoutGrid, Palette, Zap];

function Home({ openModeModal }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [publicBuilds, setPublicBuilds] = useState([]);
  const [loadingBuilds, setLoadingBuilds] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState(3);
  const [withTransition, setWithTransition] = useState(true);
  const isTransitioning = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingBuilds(true);
      setLoadError('');
      try {
        const res = await fetch('/api/public-configurations/');
        if (!res.ok) throw new Error('Не удалось загрузить готовые сборки.');
        const data = await res.json();
        if (!cancelled) {
          const list = Array.isArray(data) ? data : (data?.results || []);
          setPublicBuilds(list);
        }
      } catch (err) {
        if (!cancelled) {
          setPublicBuilds([]);
          setLoadError(err.message || 'Ошибка загрузки.');
        }
      } finally {
        if (!cancelled) setLoadingBuilds(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!location.state?.scrollToBuilds) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById('ready-builds-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, loadingBuilds ? 250 : 80);
    return () => clearTimeout(timer);
  }, [location.state?.scrollToBuilds, loadingBuilds]);

  const baseBuilds = publicBuilds.length > 0 ? publicBuilds : [];
  const readyBuilds = baseBuilds.length > 0
    ? [...baseBuilds, ...baseBuilds, ...baseBuilds]
    : [];
  const carouselEnabled = baseBuilds.length > 0;

  useEffect(() => {
    if (carouselEnabled && currentIndex < baseBuilds.length) {
      setCurrentIndex(baseBuilds.length);
    }
  }, [carouselEnabled, baseBuilds.length]);

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

  const nextSlide = () => {
    if (!carouselEnabled || isTransitioning.current) return;
    isTransitioning.current = true;
    setWithTransition(true);
    setCurrentIndex(prev => prev + 1);
  };

  const prevSlide = () => {
    if (!carouselEnabled || isTransitioning.current) return;
    isTransitioning.current = true;
    setWithTransition(true);
    setCurrentIndex(prev => prev - 1);
  };

  const handleTransitionEnd = () => {
    if (!carouselEnabled) return;
    isTransitioning.current = false;
    if (currentIndex >= baseBuilds.length * 2) {
      setWithTransition(false);
      setCurrentIndex(currentIndex - baseBuilds.length);
    }
    if (currentIndex < baseBuilds.length) {
      setWithTransition(false);
      setCurrentIndex(currentIndex + baseBuilds.length);
    }
  };

  const gap = 24;
  const cardWidth = `calc((100% - ${(cardsToShow - 1) * gap}px) / ${cardsToShow})`;

  const openBuild = (buildId) => {
    navigate(`/ready-builds/${buildId}`);
  };

  return (
    <div style={containerStyle}>
      <div style={heroCardStyle}>
        <h1 style={heroTitleStyle}>Создайте свой идеальный компьютер</h1>
        <p style={heroDescStyle}>
          Умный онлайн-конструктор поможет подобрать комплектующие и автоматически проверит их на стопроцентную совместимость перед покупкой.
        </p>
        <button onClick={openModeModal} style={primaryButtonStyle}>
          Создать новую сборку
        </button>
      </div>

      <div id="ready-builds-section" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Готовые сборки</h2>
          <span style={sectionSubtitleStyle}>
            Официальные конфигурации администратора — откройте, изучите и скопируйте к себе
          </span>
        </div>

        {loadingBuilds && (
          <div style={emptyCarouselStyle}>
            <Loader2 size={28} color="#0071e3" />
            <span style={{ color: '#a1a1aa', marginTop: 12 }}>Загрузка готовых сборок...</span>
          </div>
        )}

        {!loadingBuilds && loadError && (
          <div style={emptyCarouselStyle}>
            <p style={{ color: '#ef4444', margin: 0 }}>{loadError}</p>
          </div>
        )}

        {!loadingBuilds && !loadError && baseBuilds.length === 0 && (
          <div style={emptyCarouselStyle}>
            <p style={{ color: '#a1a1aa', margin: 0, maxWidth: 480, textAlign: 'center', lineHeight: 1.5 }}>
              Публичные сборки пока не опубликованы. Администратор может отметить сборку как публичную в панели управления.
            </p>
          </div>
        )}

        {carouselEnabled && (
          <div style={carouselContainerStyle}>
            <button type="button" onClick={prevSlide} style={arrowButtonStyle} aria-label="Назад">
              <ChevronLeft size={24} />
            </button>

            <div style={sliderViewportStyle}>
              <div
                onTransitionEnd={handleTransitionEnd}
                style={{
                  ...sliderTrackStyle,
                  gap: `${gap}px`,
                  transform: `translateX(calc(-${currentIndex} * (${100 / cardsToShow}% + ${gap / cardsToShow}px)))`,
                  transition: withTransition ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                }}
              >
                {readyBuilds.map((build, index) => {
                  const color = getBuildAccentColor(index % baseBuilds.length);
                  const Icon = BUILD_ICONS[index % BUILD_ICONS.length];
                  const purpose = getBuildPurposeText(build);
                  const shortDesc = purpose.length > 120 ? `${purpose.slice(0, 117)}…` : purpose;

                  return (
                    <div
                      key={`${build.id}-${index}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openBuild(build.id)}
                      onKeyDown={e => e.key === 'Enter' && openBuild(build.id)}
                      style={{
                        ...buildCardStyle,
                        width: cardWidth,
                        minWidth: cardWidth,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ ...buildIconStyle, color }}><Icon size={32} /></div>
                      <span style={{ ...badgeStyle, backgroundColor: `${color}20`, color }}>
                        {getBuildBadge(build)}
                      </span>
                      <h3 style={buildNameStyle}>{build.name}</h3>
                      <p style={buildDescStyle}>{shortDesc}</p>
                      <div style={cardMetaStyle}>
                        <span>Рек. БП ~{build.total_power || 0} Вт</span>
                        <span>•</span>
                        <span>{build.components_count ?? build.items?.length ?? 0} компонентов</span>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); openBuild(build.id); }}
                        style={secondaryButtonStyle}
                      >
                        Подробнее
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={nextSlide} style={arrowButtonStyle} aria-label="Вперёд">
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>

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

const containerStyle = { backgroundColor: '#12121e', color: '#ffffff', minHeight: '100vh', padding: '40px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' };
const heroCardStyle = { backgroundColor: '#1c1c2e', padding: '60px 40px', borderRadius: '24px', textAlign: 'center', marginBottom: '60px', border: '1px solid #2c2c44' };
const heroTitleStyle = { fontSize: '44px', fontWeight: '800', marginBottom: '20px' };
const heroDescStyle = { fontSize: '18px', color: '#e4e4e7', maxWidth: '650px', margin: '0 auto 35px auto', lineHeight: '1.6' };
const primaryButtonStyle = { backgroundColor: '#0071e3', color: '#ffffff', border: 'none', padding: '16px 40px', borderRadius: '980px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' };
const sectionStyle = { marginBottom: '60px', paddingTop: '20px', width: '100%' };
const sectionHeaderStyle = { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '35px', textAlign: 'center' };
const sectionTitleStyle = { fontSize: '32px', fontWeight: '700' };
const sectionSubtitleStyle = { color: '#a1a1aa', fontSize: '16px' };
const emptyCarouselStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, padding: 24 };

const carouselContainerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', maxWidth: '1120px', margin: '0 auto', width: '100%' };
const sliderViewportStyle = { overflow: 'hidden', width: '100%', padding: '10px 0' };
const sliderTrackStyle = { display: 'flex', width: '100%' };
const arrowButtonStyle = { backgroundColor: '#1c1c2e', color: '#ffffff', border: '1px solid #2c2c44', borderRadius: '50%', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

const buildCardStyle = { backgroundColor: '#1c1c2e', padding: '30px 25px', borderRadius: '20px', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid #2c2c44', height: '400px' };
const buildIconStyle = { marginBottom: '20px', display: 'flex' };
const buildNameStyle = { fontSize: '22px', fontWeight: '700', marginBottom: '12px' };
const buildDescStyle = { color: '#e4e4e7', fontSize: '14px', marginBottom: '12px', flexGrow: 1, lineHeight: '1.5' };
const cardMetaStyle = { display: 'flex', gap: 8, fontSize: 12, color: '#71717a', marginBottom: 16, flexWrap: 'wrap' };
const badgeStyle = { position: 'absolute', top: '25px', right: '25px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' };
const secondaryButtonStyle = { backgroundColor: '#2c2c44', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' };

const techSpecsStyle = { borderTop: '1px solid #2c2c44', paddingTop: '40px', display: 'flex', justifyContent: 'center', gap: '50px', flexWrap: 'wrap', marginTop: '40px' };
const techItemStyle = { display: 'flex', alignItems: 'center', gap: '12px' };
const techTextStyle = { color: '#a1a1aa', fontSize: '15px' };

export default Home;
