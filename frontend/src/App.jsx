import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Settings, X, LogOut } from 'lucide-react';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Configurator from './pages/Configurator';
import Profile from './pages/Profile';
import ReadyBuildDetail from './pages/ReadyBuildDetail.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import { useContext } from 'react';
import { BuildContext } from './BuildContext.jsx';
function AppContent() {
  const { clearBuild } = useContext(BuildContext);
  const navigate = useNavigate();
  const [showModeModal, setShowModeModal] = useState(false);
  const startNewBuild = () => {
    clearBuild();
    sessionStorage.removeItem('pc_edit_id');
    sessionStorage.removeItem('pc_edit_name');
    localStorage.removeItem('pc_build');
    localStorage.removeItem('pc_build_rgb');
    localStorage.removeItem('pc_build_fans');
    sessionStorage.removeItem('pc_build_edit_id');
    sessionStorage.removeItem('pc_edit_force_reload');
    setShowModeModal(false);
  };
  // --- ГЛОБАЛЬНЫЕ СТЕЙТЫ АВТОРИЗАЦИИ ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' или 'register'
  const [authFormData, setAuthFormData] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  
  // Переводим проверку токена в состояние, чтобы React реагировал на его изменения
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');

  // СИНХРОНИЗАЦИЯ СОСТОЯНИЯ АВТОРИЗАЦИИ МЕЖДУ КОМПОНЕНТАМИ
  useEffect(() => {
    const fetchRole = async () => {
      const t = localStorage.getItem('accessToken');
      if (!t) {
        setUserRole('');
        localStorage.removeItem('userRole');
        return;
      }
      try {
        const res = await fetch('/api/accounts/me/', { headers: { Authorization: `Bearer ${t}` } });
        if (res.ok) {
          const data = await res.json();
          const effectiveRole =
            data.role === 'admin' || data.is_superuser || data.is_staff ? 'admin' : (data.role || 'user');
          setUserRole(effectiveRole);
          localStorage.setItem('userRole', effectiveRole);
        }
      } catch {
        setUserRole('');
      }
    };

    const handleAuthUpdate = () => {
      setIsAuthenticated(!!localStorage.getItem('accessToken'));
      fetchRole();
    };

    // Слушаем кастомное событие успешного входа
    window.addEventListener('auth_success', handleAuthUpdate);
    window.addEventListener('storage', handleAuthUpdate);
    if (localStorage.getItem('accessToken')) fetchRole();

    return () => {
      window.removeEventListener('auth_success', handleAuthUpdate);
      window.removeEventListener('storage', handleAuthUpdate);
    };
  }, []);

  const scrollToReadyBuilds = () => {
    window.setTimeout(() => {
      document.getElementById('ready-builds-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const handleReadyBuildsNav = (e) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      scrollToReadyBuilds();
    }
  };

  // ОБРАБОТКА КЛИКА ПО НАВИГАЦИИ "ЛИЧНЫЙ КАБИНЕТ"
  const handleProfileClick = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthFormData({ username: '', password: '' });
      setAuthError('');
      setAuthMode('login');
      setIsAuthModalOpen(true);
    } else {
      navigate('/profile');
    }
  };

  // ФУНКЦИЯ ВЫХОДА ИЗ СИСТЕМЫ
  const handleLogout = () => {
    // Исправлено: Очищаем токены, ключ 'user' больше удалять не нужно (его нет)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setUserRole('');
    navigate('/');
  };

  // ОТПРАВКА ДАННЫХ ВХОДА / РЕГИСТРАЦИИ НА БЭКЕНД
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');

    const endpoint = authMode === 'login' ? '/api/accounts/token/' : '/api/accounts/register/';
    
    const payload = { 
      username: authFormData.username, 
      password: authFormData.password 
    };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.detail || (typeof data === 'object' ? Object.values(data).flat().join(', ') : '') || 'Не удалось выполнить вход. Проверьте данные.';
        throw new Error(errorMsg);
      }
      return data;
    })
    .then((data) => {
      if (authMode === 'register') {
        setAuthMode('login');
        setAuthFormData({ username: '', password: '' });
      } else {
        localStorage.setItem('accessToken', data.access);
        if (data.refresh) {
          localStorage.setItem('refreshToken', data.refresh);
        }
        
        // ИСПРАВЛЕНО: Строчка localStorage.setItem('user', ...) удалена!
        // Теперь данные пользователя не хранятся мертвым грузом на клиенте.
        
        setIsAuthenticated(true); // Обновляем стейт авторизации
        setIsAuthModalOpen(false);
        window.dispatchEvent(new Event('auth_success'));
      }
    })
    .catch((err) => {
      setAuthError(err.message || 'Ошибка авторизации');
    });
  };

  const handleAuthInputChange = (e) => {
    setAuthFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const triggerAuthModal = () => {
    setAuthFormData({ username: '', password: '' });
    setAuthError('');
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  return (
    <div style={{ backgroundColor: '#12121e', minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #12121e; }
        ::-webkit-scrollbar-thumb { background: #3a3a52; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #4f4f6f; }
        * { scrollbar-width: thin; scrollbar-color: #3a3a52 #12121e; }

        .custom-nav-link { transition: color 0.2s ease; }
        .custom-nav-link:hover { color: #ffffff !important; }

        .logout-btn { transition: color 0.2s ease; }
        .logout-btn:hover { color: #ef4444 !important; }

        .nav-build-btn { transition: opacity 0.2s ease, transform 0.1s ease; }
        .nav-build-btn:hover { opacity: 0.9; }
        .nav-build-btn:active { transform: scale(0.98); }
      `}</style>

      {/* --- ШАПКА САЙТА --- */}
      <header style={headerStyle}>
        <div style={{ fontWeight: 'bold', fontSize: '22px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#f5f5f7', letterSpacing: '0.5px' }}>КОНФИГУРАТОР ПК</Link>
        </div>
        <nav style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <Link to="/" className="custom-nav-link" style={navLinkStyle}>Главная</Link>
          <Link
            to="/"
            state={{ scrollToBuilds: true }}
            onClick={handleReadyBuildsNav}
            className="custom-nav-link"
            style={navLinkStyle}
          >
            Готовые сборки
          </Link>
          <Link to="/catalog" className="custom-nav-link" style={navLinkStyle}>Комплектующие</Link>
          
          <a href="/profile" onClick={handleProfileClick} className="custom-nav-link" style={navLinkStyle}>
            {isAuthenticated ? 'Личный кабинет' : 'Войти'}
          </a>

          {userRole === 'admin' && (
            <Link to="/admin" className="custom-nav-link" style={{ ...navLinkStyle, color: '#60a5fa' }}>
              Админ-панель
            </Link>
          )}

          {isAuthenticated && (
            <button onClick={handleLogout} className="logout-btn" style={logoutButtonStyle}>
              <LogOut size={16} />
              Выйти
            </button>
          )}

          <button onClick={() => setShowModeModal(true)} className="nav-build-btn" style={navButtonStyle}>
            Собрать ПК
          </button>
        </nav>
      </header>

      {/* --- КОНТЕНТ СТРАНИЦ --- */}
      <main style={{ backgroundColor: '#12121e', width: '100%', overflowX: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Home openModeModal={() => setShowModeModal(true)} />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/configurator" element={<Configurator openAuthModal={triggerAuthModal} />} />
          <Route path="/ready-builds/:id" element={<ReadyBuildDetail openAuthModal={triggerAuthModal} />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>

      {/* --- СКВОЗНОЕ МОДАЛЬНОЕ ОКНО ВЫБОРА РЕЖИМА --- */}
      {showModeModal && (
        <div style={modalOverlayStyle} onClick={() => setShowModeModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button style={modalCloseButtonStyle} onClick={() => setShowModeModal(false)}>
              <X size={20} />
            </button>
            <h2 style={modalTitleStyle}>Выберите режим сборки</h2>
            <p style={modalDescStyle}>Определите, как вам удобнее подбирать комплектующие</p>

            <div style={modalGridStyle}>
              <div style={modeCardStyle} onClick={() => {startNewBuild(); navigate('/configurator?mode=step'); }}>
                <Settings size={40} color="#0071e3" style={modeIconStyle} />
                <h3 style={modeCardTitleStyle}>Пошаговый мастер</h3>
                <p style={modeCardDescStyle}>Система будет вести вас по шагам и автоматически скрывать неподходящие детали.</p>
              </div>

              <div style={modeCardStyle} onClick={() => {startNewBuild(); navigate('/configurator?mode=free'); }}>
                <LayoutGrid size={40} color="#34c759" style={modeIconStyle} />
                <h3 style={modeCardTitleStyle}>Свободный режим</h3>
                <p style={modeCardDescStyle}>Выбирайте любые элементы в удобном порядке. Ошибки подсветятся автоматически.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ГЛОБАЛЬНОЕ МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ / РЕГИСТРАЦИИ --- */}
      {isAuthModalOpen && (
        <div style={authModalOverlayStyle} onClick={() => setIsAuthModalOpen(false)}>
          <div style={authModalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button style={authModalCloseStyle} onClick={() => setIsAuthModalOpen(false)}>
              <X size={20} />
            </button>
            
            <h2 style={authModalTitleStyle}>
              {authMode === 'login' ? 'Войти в аккаунт' : 'Регистрация'}
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '13px', marginTop: '-10px', marginBottom: '20px', textAlign: 'center' }}>
              Авторизуйтесь для синхронизации и сохранения конфигураций ПК
            </p>

            {authError && <div style={authErrorStyle}>{authError}</div>}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                name="username"
                placeholder="Имя пользователя (Логин)"
                required
                value={authFormData.username}
                onChange={handleAuthInputChange}
                style={authInputStyle}
              />
              
              <input
                type="password"
                name="password"
                placeholder="Пароль"
                required
                value={authFormData.password}
                onChange={handleAuthInputChange}
                style={authInputStyle}
              />

              <button type="submit" style={authSubmitButtonStyle}>
                {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#a1a1aa' }}>
              {authMode === 'login' ? (
                <>
                  Нет аккаунта?{' '}
                  <span onClick={() => { setAuthMode('register'); setAuthError(''); }} style={authToggleLinkStyle}>
                    Создать профиль
                  </span>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{' '}
                  <span onClick={() => { setAuthMode('login'); setAuthError(''); }} style={authToggleLinkStyle}>
                    Войти
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Стили
const headerStyle = {
  backgroundColor: '#1c1c2e', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box',
  borderBottom: '1px solid #2c2c44', position: 'sticky', top: 0, zIndex: 100
};
const navLinkStyle = { textDecoration: 'none', color: '#b0b0bc', fontSize: '15px', cursor: 'pointer' };
const navButtonStyle = {
  backgroundColor: '#0071e3', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '20px',
  fontWeight: '600', fontSize: '14px', cursor: 'pointer'
};

const logoutButtonStyle = {
  backgroundColor: 'transparent', border: 'none', color: '#b0b0bc', fontSize: '15px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '6px', padding: 0, fontFamily: 'inherit'
};

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#1c1c2e', padding: '45px', borderRadius: '24px', width: '100%', maxWidth: '650px', boxSizing: 'border-box', position: 'relative', border: '1px solid #3a3a52', margin: '20px' };
const modalCloseButtonStyle = { position: 'absolute', top: '25px', right: '25px', backgroundColor: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer' };
const modalTitleStyle = { fontSize: '30px', fontWeight: '700', textAlign: 'center', marginBottom: '12px', color: '#ffffff' };
const modalDescStyle = { color: '#e4e4e7', textAlign: 'center', marginBottom: '35px', fontSize: '15px' };
const modalGridStyle = { display: 'flex', gap: '25px' };
const modeCardStyle = { backgroundColor: '#2c2c44', padding: '30px 20px', borderRadius: '18px', flex: 1, cursor: 'pointer', textAlign: 'center', border: '1px solid #3a3a52', transition: 'all 0.2s ease' };
const modeIconStyle = { marginBottom: '15px', marginLeft: 'auto', marginRight: 'auto' };
const modeCardTitleStyle = { fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#ffffff' };
const modeCardDescStyle = { color: '#d4d4d8', fontSize: '13px', lineHeight: '1.5' };

const authModalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
const authModalContentStyle = { backgroundColor: '#1c1c2e', padding: '35px', borderRadius: '24px', width: '400px', maxWidth: '90%', position: 'relative', border: '1px solid #3a3a52', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
const authModalCloseStyle = { position: 'absolute', top: '20px', right: '20px', backgroundColor: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer', padding: '4px' };
const authModalTitleStyle = { fontSize: '22px', fontWeight: '800', marginBottom: '15px', color: '#ffffff', textAlign: 'center' };
const authInputStyle = { backgroundColor: '#12121e', border: '1px solid #2c2c44', borderRadius: '8px', color: '#ffffff', padding: '12px 14px', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box' };
const authSubmitButtonStyle = { backgroundColor: '#0071e3', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '5px', transition: 'background-color 0.2s' };
const authToggleLinkStyle = { color: '#0071e3', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' };
const authErrorStyle = { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '15px', textAlign: 'center' };

export default App;