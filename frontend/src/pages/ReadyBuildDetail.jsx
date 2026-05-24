import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Loader2, Zap, X } from 'lucide-react';
import {
  getBuildPurposeText,
  getComponentIdsFromConfiguration,
  formatReadyBuildComponentRow,
  sortPublicBuildItems,
} from '../utils/readyBuilds.js';

function ReadyBuildDetail({ openAuthModal }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [copyError, setCopyError] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const pendingCopyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/public-configurations/${id}/`);
        if (!res.ok) throw new Error('Сборка не найдена или недоступна.');
        const data = await res.json();
        if (!cancelled) {
          setBuild(data);
          setCopyName(`Копия — ${data.name || 'Сборка'}`);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Ошибка загрузки.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const onAuth = () => {
      if (pendingCopyRef.current && localStorage.getItem('accessToken')) {
        pendingCopyRef.current = false;
        setIsCopyModalOpen(true);
      }
    };
    window.addEventListener('auth_success', onAuth);
    return () => window.removeEventListener('auth_success', onAuth);
  }, []);

  const performCopy = async () => {
    const trimmed = copyName.trim();
    if (!trimmed) {
      setCopyError('Введите название сборки.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      pendingCopyRef.current = true;
      openAuthModal();
      return;
    }

    setIsCopying(true);
    setCopyError('');

    try {
      const checkRes = await fetch('/api/configurations/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (checkRes.status === 401) {
        pendingCopyRef.current = true;
        openAuthModal();
        return;
      }
      if (checkRes.ok && localStorage.getItem('userRole') !== 'admin') {
        const userBuilds = await checkRes.json();
        if (userBuilds?.length >= 5) {
          setCopyError('Лимит 5 сборок. Удалите одну из старых в личном кабинете.');
          return;
        }
      }

      const res = await fetch('/api/configurations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmed,
          description: build.description || '',
          total_power: build.total_power || 0,
          component_ids: getComponentIdsFromConfiguration(build),
          has_rgb: Boolean(build.has_rgb),
          cooler_count: build.cooler_count || 0,
        }),
      });

      if (res.status === 401) {
        pendingCopyRef.current = true;
        openAuthModal();
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Не удалось создать копию.');
      }

      const created = await res.json();
      const newId = created.id;
      if (!newId) {
        throw new Error('Сервер не вернул id новой сборки.');
      }

      sessionStorage.setItem('pc_edit_id', String(newId));
      sessionStorage.setItem('pc_edit_name', trimmed);
      sessionStorage.setItem('pc_edit_force_reload', '1');
      sessionStorage.removeItem('pc_build_edit_id');

      setIsCopyModalOpen(false);
      navigate(`/configurator?mode=free&id=${newId}`);
    } catch (err) {
      setCopyError(err.message || 'Ошибка копирования.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleOpenCopy = () => {
    setCopyError('');
    const token = localStorage.getItem('accessToken');
    if (!token) {
      pendingCopyRef.current = true;
      openAuthModal();
      return;
    }
    setIsCopyModalOpen(true);
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={centerBoxStyle}>
          <Loader2 size={32} color="#0071e3" className="spin" />
          <span style={{ color: '#a1a1aa', marginTop: 12 }}>Загрузка сборки...</span>
        </div>
      </div>
    );
  }

  if (error || !build) {
    return (
      <div style={pageStyle}>
        <div style={centerBoxStyle}>
          <p style={{ color: '#ef4444' }}>{error || 'Сборка не найдена'}</p>
          <button type="button" onClick={() => navigate('/#ready-builds-section')} style={backBtnStyle}>
            <ArrowLeft size={16} /> На главную
          </button>
        </div>
      </div>
    );
  }

  const sortedItems = sortPublicBuildItems(build.items);

  return (
    <div style={pageStyle}>
      <div style={wrapStyle}>
        <button type="button" onClick={() => navigate('/#ready-builds-section')} style={backLinkStyle}>
          <ArrowLeft size={18} /> Назад к готовым сборкам
        </button>

        <header style={headerStyle}>
          <span style={badgeStyle}>Официальная сборка</span>
          <h1 style={titleStyle}>{build.name}</h1>
          <p style={purposeStyle}>{getBuildPurposeText(build)}</p>
          <div style={metaRowStyle}>
            <span style={metaChipStyle}>
              <Zap size={14} /> Рек. БП ~{build.total_power || 0} Вт
            </span>
            <span style={metaChipStyle}>{build.components_count ?? sortedItems.length} компонентов</span>
            {build.has_rgb && <span style={metaChipStyle}>RGB</span>}
            {build.cooler_count > 0 && (
              <span style={metaChipStyle}>{build.cooler_count} корп. вент.</span>
            )}
          </div>
        </header>

        <section style={listSectionStyle}>
          <h2 style={sectionTitleStyle}>Состав сборки</h2>
          {sortedItems.map((item, idx) => {
            const row = formatReadyBuildComponentRow(item);
            return (
              <article key={`${row.id}-${idx}`} style={componentCardStyle}>
                <div style={componentHeadStyle}>
                  <span style={catLabelStyle}>{row.categoryLabel}</span>
                  <strong style={compNameStyle}>{row.name}</strong>
                </div>
                {row.specs.length > 0 ? (
                  <div style={specsGridStyle}>
                    {row.specs.map(spec => (
                      <div key={spec.label} style={specRowStyle}>
                        <span style={specKeyStyle}>{spec.label}</span>
                        <span style={specValStyle}>{spec.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#71717a', fontSize: 13, margin: 0 }}>{row.brief || '—'}</p>
                )}
              </article>
            );
          })}
        </section>

        <div style={actionsBarStyle}>
          <button type="button" onClick={() => navigate('/#ready-builds-section')} style={secondaryBtnStyle}>
            Назад
          </button>
          <button type="button" onClick={handleOpenCopy} style={primaryBtnStyle}>
            <Copy size={18} /> Копировать в мои сборки
          </button>
        </div>
      </div>

      {isCopyModalOpen && (
        <div style={overlayStyle} onClick={() => !isCopying && setIsCopyModalOpen(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              style={modalCloseStyle}
              onClick={() => !isCopying && setIsCopyModalOpen(false)}
            >
              <X size={18} />
            </button>
            <h2 style={modalTitleStyle}>Копирование сборки</h2>
            <p style={modalDescStyle}>
              Будет создана ваша копия в личном кабинете. После этого откроется свободный режим конфигуратора.
            </p>
            {copyError && <div style={errorBoxStyle}>{copyError}</div>}
            <label style={labelStyle}>Имя элемента (название сборки)</label>
            <input
              type="text"
              value={copyName}
              onChange={e => setCopyName(e.target.value)}
              disabled={isCopying}
              style={inputStyle}
              placeholder="Название вашей копии"
            />
            <div style={modalActionsStyle}>
              <button
                type="button"
                disabled={isCopying}
                onClick={() => setIsCopyModalOpen(false)}
                style={secondaryBtnStyle}
              >
                Отмена
              </button>
              <button type="button" disabled={isCopying} onClick={performCopy} style={primaryBtnStyle}>
                {isCopying ? 'Создание...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  backgroundColor: '#12121e',
  color: '#fff',
  minHeight: '100vh',
  padding: '32px 16px 48px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  width: '100%',
  maxWidth: '100vw',
  overflowX: 'hidden',
  boxSizing: 'border-box',
};
const wrapStyle = { maxWidth: '820px', margin: '0 auto' };
const centerBoxStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 };
const backLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: 'none',
  border: 'none',
  color: '#a1a1aa',
  cursor: 'pointer',
  fontSize: 14,
  marginBottom: 24,
  padding: 0,
};
const backBtnStyle = {
  ...backLinkStyle,
  marginTop: 16,
  padding: '10px 16px',
  backgroundColor: '#2c2c44',
  borderRadius: 10,
};
const headerStyle = {
  backgroundColor: '#1c1c2e',
  border: '1px solid #2c2c44',
  borderRadius: 16,
  padding: '28px 32px',
  marginBottom: 28,
};
const badgeStyle = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: '#60a5fa',
  backgroundColor: 'rgba(0, 113, 227, 0.12)',
  padding: '4px 10px',
  borderRadius: 6,
  marginBottom: 12,
};
const titleStyle = { fontSize: 28, fontWeight: 800, margin: '0 0 12px' };
const purposeStyle = { color: '#c4c4cc', fontSize: 15, lineHeight: 1.55, margin: '0 0 20px' };
const metaRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 10 };
const metaChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: '#e4e4e7',
  backgroundColor: '#12121e',
  border: '1px solid #2c2c44',
  borderRadius: 8,
  padding: '6px 12px',
};
const listSectionStyle = { marginBottom: 28 };
const sectionTitleStyle = { fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#0071e3' };
const componentCardStyle = {
  backgroundColor: '#1c1c2e',
  border: '1px solid #2c2c44',
  borderRadius: 12,
  padding: '16px 20px',
  marginBottom: 12,
};
const componentHeadStyle = { marginBottom: 12 };
const catLabelStyle = { fontSize: 11, fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.5px' };
const compNameStyle = { display: 'block', fontSize: 16, marginTop: 4 };
const specsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 16px' };
const specRowStyle = { display: 'flex', flexDirection: 'column', gap: 2 };
const specKeyStyle = { fontSize: 11, color: '#71717a' };
const specValStyle = { fontSize: 13, fontWeight: 600, color: '#e4e4e7' };
const actionsBarStyle = { display: 'flex', gap: 12, flexWrap: 'wrap' };
const primaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  backgroundColor: '#0071e3',
  color: '#fff',
  border: 'none',
  padding: '12px 22px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};
const secondaryBtnStyle = {
  backgroundColor: '#2c2c44',
  color: '#fff',
  border: 'none',
  padding: '12px 22px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(10, 10, 16, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20,
};
const modalStyle = {
  backgroundColor: '#1c1c2e',
  border: '1px solid #2c2c44',
  borderRadius: 16,
  padding: 32,
  width: '100%',
  maxWidth: 440,
  position: 'relative',
};
const modalCloseStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: 'none',
  border: 'none',
  color: '#a1a1aa',
  cursor: 'pointer',
};
const modalTitleStyle = { fontSize: 20, fontWeight: 700, margin: '0 0 8px' };
const modalDescStyle = { fontSize: 13, color: '#a1a1aa', margin: '0 0 20px', lineHeight: 1.45 };
const labelStyle = { fontSize: 12, color: '#a1a1aa', fontWeight: 600, display: 'block', marginBottom: 8 };
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #2c2c44',
  backgroundColor: '#12121e',
  color: '#fff',
  fontSize: 14,
  marginBottom: 20,
};
const modalActionsStyle = { display: 'flex', gap: 12 };
const errorBoxStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid #ef4444',
  color: '#ef4444',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 13,
  marginBottom: 16,
};

export default ReadyBuildDetail;
