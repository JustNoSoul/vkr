import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, HardDrive, Trash2, Edit3, Key, 
  Cpu, Loader2, AlertTriangle, X, Pencil, FileDown, Check
} from 'lucide-react';
import { exportBuildToPdf } from '../utils/exportBuildPdf.js';
import { calculatePowerFromConfiguration, itemsToBuildSlots } from '../utils/buildPower.js';

const declOfNum = (number, titles) => {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[
    (number % 100 > 4 && number % 100 < 20) 
      ? 2 
      : cases[Math.min(number % 10, 5)]
  ];
};

function Profile() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('Загрузка...');
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('userRole') === 'admin');
  const [builds, setBuilds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [renamingBuildId, setRenamingBuildId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenamingSaving, setIsRenamingSaving] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [exportingBuildId, setExportingBuildId] = useState(null);

  // --- СОСТОЯНИЯ ДЛЯ МОДАЛЬНОГО ОКНА СМЕНЫ ПАРОЛЯ ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Функция для логаута (полная очистка)
  const handleLogout = () => {
    localStorage.clear(); // Полностью очищаем все токены и данные сессии
    window.location.reload(); // Перезагружаем приложение, чтобы сбросить стейты в App.jsx и уйти на главную
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/configurator?mode=free');
      return;
    }

    // 1. Запрашиваем актуальный логин пользователя с бэкенда
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/accounts/me/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          handleLogout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setUsername(data.username);
          const admin =
            data.role === 'admin' || data.is_superuser || data.is_staff;
          setIsAdmin(admin);
          if (admin) localStorage.setItem('userRole', 'admin');
        } else {
          setUsername('Пользователь');
        }
      } catch {
        setUsername('Пользователь');
      }
    };

    // 2. Загружаем сохраненные сборки пользователя
    const fetchUserBuilds = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/configurations/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          handleLogout();
          return;
        }

        if (!response.ok) {
          throw new Error('Не удалось загрузить ваши конфигурации.');
        }

        const data = await response.json();
        setBuilds(data);
      } catch (err) {
        setError(err.message || 'Ошибка при соединении с сервером.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchUserBuilds();
  }, [navigate]);

  // Функция удаления сборки
  const handleDeleteBuild = async (buildId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту конфигурацию? Решение необратимо.')) return;

    const token = localStorage.getItem('accessToken');
    setIsDeletingId(buildId);

    try {
      const response = await fetch(`/api/configurations/${buildId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error('Не удалось удалить сборку.');
      }

      setBuilds(prev => prev.filter(b => b.id !== buildId));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Функция отправки нового пароля
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordSaving(true);

    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch('/api/accounts/users/set_password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.old_password,
          new_password: passwordData.new_password
        })
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const errorMsg = data.new_password?.join(', ') || data.current_password?.join(', ') || data.detail || 'Не удалось сменить пароль. Проверьте старый пароль.';
        throw new Error(errorMsg);
      }

      setPasswordSuccess('Пароль успешно изменен!');
      setPasswordData({ old_password: '', new_password: '' });
      
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess('');
      }, 2000);

    } catch (err) {
      setPasswordError(err.message || 'Ошибка сервера при смене пароля.');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  // Найдите обработчик клика на кнопку редактирования в Profile.jsx и приведите его к такому виду:
  const handleEditBuild = (build) => {
    sessionStorage.setItem('pc_edit_id', String(build.id));
    sessionStorage.setItem('pc_edit_name', build.name || '');
    sessionStorage.setItem('pc_edit_force_reload', '1');
    navigate(`/configurator?mode=edit&id=${build.id}`);
  };

  const startRenameBuild = (build) => {
    setRenamingBuildId(build.id);
    setRenameValue(build.name || '');
    setRenameError('');
  };

  const cancelRenameBuild = () => {
    setRenamingBuildId(null);
    setRenameValue('');
    setRenameError('');
  };

  const handleRenameBuild = async (build) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('Введите название сборки.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    setIsRenamingSaving(true);
    setRenameError('');

    const componentIds = (build.items || [])
      .map(item => item.component ?? item.component_details?.id)
      .filter(id => id != null);

    try {
      const response = await fetch(`/api/configurations/${build.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: trimmed,
          total_power: build.total_power || 0,
          component_ids: componentIds,
          has_rgb: Boolean(build.has_rgb),
          cooler_count: build.cooler_count || 0
        })
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Не удалось переименовать сборку.');
      }

      setBuilds(prev => prev.map(b => b.id === build.id ? { ...b, name: trimmed } : b));
      cancelRenameBuild();
    } catch (err) {
      setRenameError(err.message || 'Ошибка при сохранении названия.');
    } finally {
      setIsRenamingSaving(false);
    }
  };

  const buildPdfPayload = (buildItem) => {
    const slots = itemsToBuildSlots(buildItem.items);
    return {
      name: buildItem.name,
      total_power: buildItem.total_power || calculatePowerFromConfiguration(buildItem),
      has_rgb: buildItem.has_rgb,
      cooler_count: buildItem.cooler_count,
      items: buildItem.items || [],
      motherboard: slots.motherboard,
      gpu: slots.gpu,
      cooling: slots.cooling,
    };
  };

  const handleExportPdf = async (buildItem) => {
    const token = localStorage.getItem('accessToken');
    setExportingBuildId(buildItem.id);
    try {
      const res = await fetch(`/api/configurations/${buildItem.id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : buildItem;
      await exportBuildToPdf(buildPdfPayload(data));
    } catch (err) {
      alert(err.message || 'Не удалось сформировать PDF.');
    } finally {
      setExportingBuildId(null);
    }
  };
  // Стили страницы
  const pageContainerStyle = { maxWidth: '1100px', margin: '40px auto', padding: '0 16px', color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', width: '100%', boxSizing: 'border-box', minHeight: 'calc(100vh - 80px)', backgroundColor: '#12121e' };
  const headerCardStyle = { backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' };
  const userInfoStyle = { display: 'flex', alignItems: 'center', gap: '16px' };
  const avatarStyle = { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#2c2c44', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0071e3' };
  
  const sectionTitleStyle = { fontSize: '20px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' };
  const subtitleStyle = { color: '#a1a1aa', fontSize: '14px', marginBottom: '24px' };
  
  const gridStyle = { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' };
  const buildCardStyle = { backgroundColor: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', transition: 'border-color 0.2s', flexWrap: 'wrap' };
  const buildInfoStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
  const buildNameStyle = { fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 };
  const buildMetaStyle = { display: 'flex', gap: '16px', color: '#71717a', fontSize: '13px' };
  
  const actionsContainerStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' };
  const btnTextStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 12px', borderRadius: '10px', border: '1px solid #2c2c44',
    backgroundColor: '#1c1c2e', color: '#e4e4e7', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', outline: 'none'
  };
  const modalInputStyle = { backgroundColor: '#12121e', border: '1px solid #2c2c44', borderRadius: '8px', color: '#ffffff', padding: '12px 14px', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box', marginTop: '6px' };
  const renameInputStyle = {
    ...modalInputStyle,
    marginTop: '8px',
    fontSize: '15px',
    fontWeight: '600'
  };
  const btnIconStyle = { padding: '10px', borderRadius: '10px', border: '1px solid #2c2c44', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', outline: 'none' };
  const btnPasswordStyle = { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2c2c44', color: '#ffffff', border: '1px solid #3a3a52', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'background-color 0.2s' };

  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000 };
  const modalContentStyle = { backgroundColor: '#1c1c2e', padding: '35px', borderRadius: '24px', width: '400px', maxWidth: '90%', position: 'relative', border: '1px solid #3a3a52', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
  const modalCloseStyle = { position: 'absolute', top: '20px', right: '20px', backgroundColor: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer', padding: '4px' };
  const modalSubmitButtonStyle = { backgroundColor: '#0071e3', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '10px', transition: 'background-color 0.2s' };

  return (
    <div style={pageContainerStyle}>
      
      {/* КАРТОЧКА ПОЛЬЗОВАТЕЛЯ */}
      <div style={headerCardStyle}>
        <div style={userInfoStyle}>
          <div style={avatarStyle}>
            <User size={28} />
          </div>
          <div>
            {username === 'Загрузка...' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a' }}>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '14px' }}>Синхронизация профиля...</span>
              </div>
            ) : (
              <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>{username}</h2>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => {
            setPasswordError('');
            setPasswordSuccess('');
            setPasswordData({ old_password: '', new_password: '' });
            setIsPasswordModalOpen(true);
          }}
          style={btnPasswordStyle}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3a3a52'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2c2c44'}
        >
          <Key size={16} color="#0071e3" />
          Сменить пароль
        </button>
      </div>

      {/* РАЗДЕЛ СБОРОК */}
      <div>
        <div style={sectionTitleStyle}>
          <HardDrive size={22} color="#0071e3" />
          Ваши конфигурации ПК
          <span style={{ backgroundColor: '#2c2c44', color: '#a1a1aa', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', marginLeft: '6px', fontWeight: '600' }}>
            {isAdmin ? builds.length : `${builds.length} / 5`}
          </span>
        </div>

        {isAdmin ? (
          <p style={subtitleStyle}>Администратор: лимит в 5 сборок не применяется.</p>
        ) : builds.length >= 5 ? (
          <p style={{ ...subtitleStyle, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> Достигнут максимальный лимит. Чтобы создать новую сборку, удалите одну из текущих.
          </p>
        ) : (
          <p style={subtitleStyle}>Здесь хранятся созданные вами системы. Вы можете сохранять до 5 конфигураций одновременно.</p>
        )}

        {/* Индикатор загрузки сборок */}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#71717a', gap: '10px', alignItems: 'center' }}>
            <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Загрузка ваших конфигураций...</span>
          </div>
        )}

        {/* Вывод ошибки */}
        {error && !isLoading && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px', color: '#ef4444', marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Пустое состояние */}
        {!isLoading && builds.length === 0 && !error && (
          <div style={{ padding: '60px 20px', border: '1px dashed #2c2c44', borderRadius: '16px', textAlign: 'center', backgroundColor: '#09090f' }}>
            <Cpu size={40} color="#45455c" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 6px 0' }}>У вас пока нет сохраненных сборок</h3>
            <p style={{ color: '#71717a', fontSize: '13px', margin: '0 0 16px 0' }}>Соберите свой первый ПК прямо сейчас!</p>
            <button 
              onClick={() => navigate('/configurator?mode=free')}
              style={{ backgroundColor: '#0071e3', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
            >
              Открыть конфигуратор
            </button>
          </div>
        )}

        {/* СПИСОК СБОРОК */}
        {!isLoading && builds.length > 0 && (
          <div style={gridStyle}>
            {builds.map((buildItem) => {
              const componentsArray = buildItem.items || []; 
              const componentsCount = getRealComponentsCount(buildItem.items);
              const word = declOfNum(componentsCount, ['компонент', 'компонента', 'компонентов']);
              return (
                <div 
                  key={buildItem.id} 
                  style={buildCardStyle}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#3a3a52'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#2c2c44'}
                >
                  <div style={{ ...buildInfoStyle, flex: '1 1 240px', minWidth: '200px' }}>
                    {renamingBuildId === buildItem.id ? (
                      <div>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          disabled={isRenamingSaving}
                          style={renameInputStyle}
                          autoFocus
                          maxLength={255}
                        />
                        {renameError && (
                          <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{renameError}</p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            type="button"
                            disabled={isRenamingSaving}
                            onClick={() => handleRenameBuild(buildItem)}
                            style={{ ...btnTextStyle, backgroundColor: '#0071e3', borderColor: '#0071e3', color: '#fff' }}
                          >
                            {isRenamingSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Сохранить
                          </button>
                          <button type="button" disabled={isRenamingSaving} onClick={cancelRenameBuild} style={btnTextStyle}>
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h3 style={buildNameStyle}>{buildItem.name}</h3>
                    )}
                    <div style={buildMetaStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Cpu size={14} /> {componentsCount} {word}
                      </span>
                      <span>•</span>
                      <span>Реком. БП: ~{buildItem.total_power || calculatePowerFromConfiguration(buildItem)} Вт</span>
                    </div>
                  </div>

                  <div style={actionsContainerStyle}>
                    {renamingBuildId !== buildItem.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => startRenameBuild(buildItem)}
                          title="Переименовать"
                          style={btnTextStyle}
                        >
                          <Pencil size={14} color="#a1a1aa" />
                          Имя
                        </button>
                        <button
                          type="button"
                          disabled={exportingBuildId === buildItem.id}
                          onClick={() => handleExportPdf(buildItem)}
                          title="Экспорт в PDF"
                          style={{ ...btnTextStyle, color: '#34c759', borderColor: 'rgba(52,199,89,0.35)' }}
                        >
                          {exportingBuildId === buildItem.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <FileDown size={14} />
                          )}
                          PDF
                        </button>
                        <button
                          onClick={() => handleEditBuild(buildItem)}
                          title="Редактировать конфигурацию"
                          style={{ ...btnIconStyle, backgroundColor: '#1c1c2e', color: '#0071e3' }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0071e3'; e.currentTarget.style.color = '#ffffff'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#1c1c2e'; e.currentTarget.style.color = '#0071e3'; }}
                        >
                          <Edit3 size={16} />
                        </button>
                      </>
                    )}

                    <button
                      disabled={isDeletingId === buildItem.id}
                      onClick={() => handleDeleteBuild(buildItem.id)}
                      title="Удалить сборку"
                      style={{ ...btnIconStyle, backgroundColor: '#1c1c2e', color: '#ef4444' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#1c1c2e'; e.currentTarget.style.color = '#ef4444'; }}
                    >
                      {isDeletingId === buildItem.id ? (
                        <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- МОДАЛЬНОЕ ОКНО СМЕНЫ ПАРОЛЯ --- */}
      {isPasswordModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setIsPasswordModalOpen(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button style={modalCloseStyle} onClick={() => setIsPasswordModalOpen(false)}>
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: '#ffffff', textAlign: 'center' }}>
              Смена пароля
            </h2>

            {passwordError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '15px', textAlign: 'center' }}>
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '15px', textAlign: 'center' }}>
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#a1a1aa' }}>Текущий пароль</label>
                <input
                  type="password"
                  required
                  placeholder="Введите старый пароль"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, old_password: e.target.value }))}
                  style={modalInputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#a1a1aa' }}>Новый пароль</label>
                <input
                  type="password"
                  required
                  placeholder="Минимум 8 символов"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                  style={modalInputStyle}
                />
              </div>

              <button type="submit" disabled={isPasswordSaving} style={modalSubmitButtonStyle}>
                {isPasswordSaving ? (
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                ) : (
                  'Обновить пароль'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
const getRealComponentsCount = (items) => {
  if (!items || !Array.isArray(items)) return 0;
  
  return items.reduce((total, item) => {
    const comp = item.component_details || item;
    const nameLower = String(comp.name || comp.component_name || '').toLowerCase();
    
    // Если это оперативка, проверяем наличие КИТа через регулярку
    if (comp.category === 'memory' || nameLower.includes('память') || nameLower.includes('ram') || nameLower.includes('ddr')) {
      const match = nameLower.match(/(\d+)\s*[xх]\s*\d+/);
      if (match) {
        return total + parseInt(match[1], 10); // Добавляем 2 или 4 вместо 1
      }
    }
    return total + 1;
  }, 0);
};
export default Profile;