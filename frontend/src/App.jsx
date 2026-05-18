import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Settings, X, User } from 'lucide-react';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Configurator from './pages/Configurator'; // ИМПОРТИРУЕМ НАШ КУРТЫЙ КОНФИГУРАТОР

// Временные заглушки
const Profile = () => <div style={{color: '#f5f5f7', padding: '40px', textAlign: 'center'}}>Личный кабинет в разработке</div>;

function AppContent() {
  const navigate = useNavigate();
  const [showModeModal, setShowModeModal] = useState(false);

  // --- ГЛОБАЛЬНЫЕ СТЕЙТЫ АВТОРИЗАЦИИ ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' или 'register'
  const [authFormData, setAuthFormData] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Проверяем авторизацию по наличию токена в localStorage
  const isAuthenticated = !!localStorage.getItem('accessToken');

  const handleScrollToBuilds = (e) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      const element = document.getElementById('ready-builds-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // ОБРАБОТКА КЛИКА ПО НАВИГАЦИИ "ЛИЧНЫЙ КАБИНЕТ"
  const handleProfileClick = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      // Если не авторизован — сбрасываем форму и открываем модалку входа
      setAuthFormData({ username: '', email: '', password: '' });
      setAuthError('');
      setAuthMode('login');
      setIsAuthModalOpen(true);
    } else {
      // Если авторизован — пускаем на страницу личного кабинета
      navigate('/profile');
    }
  };

  // ОТПРАВКА ДАННЫХ ВХОДА / РЕГИСТРАЦИИ НА БЭКЕНД
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');

    const endpoint = authMode === 'login' ? '/api/auth/login/' : '/api/auth/register/';
    const payload = authMode === 'login' 
      ? { username: authFormData.username, password: authFormData.password }
      : { username: authFormData.username, email: authFormData.email, password: authFormData.password };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Что-то пошло не так');
      return data;
    })
    .then((data) => {
      // Сохраняем полученный access-токен
      localStorage.setItem('accessToken', data.access || data.token);
      setIsAuthModalOpen(false);
      
      // Генерируем глобальное событие, чтобы страница конфигуратора узнала о входе
      window.dispatchEvent(new Event('auth_success'));
      
      alert('Вы успешно вошли в систему!');
    })
    .catch((err) => {
      setAuthError(err.message || 'Ошибка аутентификации');
    });
  };

  const handleAuthInputChange = (e) => {
    setAuthFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Функция принудительного вызова модалки (передадим её в Configurator через пропсы)
  const triggerAuthModal = () => {
    setAuthFormData({ username: '', email: '', password: '' });
    setAuthError('');
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  return (
    <div style={{ backgroundColor: '#12121e', minHeight: '100vh' }}>
      
      {/* Глобальные стили для красивого темного скроллбара */}
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #12121e; }
        ::-webkit-scrollbar-thumb { background: #3a3a52; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #4f4f6f; }
        * { scrollbar-width: thin; scrollbar-color: #3a3a52 #12121e; }
      `}</style>

      {/* --- ШАПКА САЙТА --- */}
      <header style={headerStyle}>
        <div style={{ fontWeight: 'bold', fontSize: '22px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#f5f5f7', letterSpacing: '0.5px' }}>КОНФИГУРАТОР ПК</Link>
        </div>
        <nav style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <Link to="/" style={navLinkStyle}>Главная</Link>
          <Link to="/#ready-builds" onClick={handleScrollToBuilds} style={navLinkStyle}>Готовые сборки</Link>
          <Link to="/catalog" style={navLinkStyle}>Комплектующие</Link>
          
          {/* Умная ссылка Личного кабинета */}
          <a href="/profile" onClick={handleProfileClick} style={navLinkStyle}>
            {isAuthenticated ? 'Личный кабинет' : 'Войти'}
          </a>

          <button onClick={() => setShowModeModal(true)} style={navButtonStyle}>
            Собрать ПК
          </button>
        </nav>
      </header>

      {/* --- КОНТЕНТ СТРАНИЦ --- */}
      <main>
        <Routes>
          <Route path="/" element={<Home openModeModal={() => setShowModeModal(true)} />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/profile" element={<Profile />} />
          
          {/* СВЯЗЫВАЕМ КОНФИГУРАТОР И ПЕРЕДАЕМ ФУНКЦИЮ ОТКРЫТИЯ МОДАЛКИ ИЗ PROPS */}
          <Route path="/configurator" element={<Configurator openAuthModal={triggerAuthModal} />} />
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
              {/* Пошаговый */}
              <div style={modeCardStyle} onClick={() => { setShowModeModal(false); navigate('/configurator?mode=step'); }}>
                <Settings size={40} color="#0071e3" style={modeIconStyle} />
                <h3 style={modeCardTitleStyle}>Пошаговый мастер</h3>
                <p style={modeCardDescStyle}>Система будет вести вас по шагам и автоматически скрывать неподходящие детали.</p>
              </div>

              {/* Свободный */}
              <div 
                style={modeCardStyle} 
                onClick={() => { 
                  setShowModeModal(false); 
                  navigate('/configurator?mode=free');
                }}
              >
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
              
              {authMode === 'register' && (
                <input
                  type="email"
                  name="email"
                  placeholder="Электронная почта"
                  required
                  value={authFormData.email}
                  onChange={handleAuthInputChange}
                  style={authInputStyle}
                />
              )}

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

// Обертка для корректной работы useNavigate внутри Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Стили для App.jsx
const headerStyle = {
  backgroundColor: '#1c1c2e', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  borderBottom: '1px solid #2c2c44', position: 'sticky', top: 0, zIndex: 100
};
const navLinkStyle = { textDecoration: 'none', color: '#b0b0bc', fontSize: '15px', cursor: 'pointer' };
const navButtonStyle = {
  backgroundColor: '#0071e3', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '20px',
  fontWeight: '600', fontSize: '14px', cursor: 'pointer'
};
const modalOverlayStyle = { 
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
  backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', 
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 
};
const modalContentStyle = { 
  backgroundColor: '#1c1c2e', padding: '45px', borderRadius: '24px', width: '100%', 
  maxWidth: '650px', boxSizing: 'border-box', position: 'relative', border: '1px solid #3a3a52', margin: '20px' 
};
const modalCloseButtonStyle = { position: 'absolute', top: '25px', right: '25px', backgroundColor: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer' };
const modalTitleStyle = { fontSize: '30px', fontWeight: '700', textAlign: 'center', marginBottom: '12px', color: '#ffffff' };
const modalDescStyle = { color: '#e4e4e7', textAlign: 'center', marginBottom: '35px', fontSize: '15px' };
const modalGridStyle = { display: 'flex', gap: '25px' };
const modeCardStyle = { backgroundColor: '#2c2c44', padding: '30px 20px', borderRadius: '18px', flex: 1, cursor: 'pointer', textAlign: 'center', border: '1px solid #3a3a52', transition: 'all 0.2s ease' };
const modeIconStyle = { marginBottom: '15px', marginLeft: 'auto', marginRight: 'auto' };
const modeCardTitleStyle = { fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#ffffff' };
const modeCardDescStyle = { color: '#d4d4d8', fontSize: '13px', lineHeight: '1.5' };

// Стили модального окна авторизации
const authModalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
const authModalContentStyle = { backgroundColor: '#1c1c2e', padding: '35px', borderRadius: '24px', width: '400px', maxWidth: '90%', position: 'relative', border: '1px solid #3a3a52', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
const authModalCloseStyle = { position: 'absolute', top: '20px', right: '20px', backgroundColor: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer', padding: '4px' };
const authModalTitleStyle = { fontSize: '22px', fontWeight: '800', marginBottom: '15px', color: '#ffffff', textAlign: 'center' };
const authInputStyle = { backgroundColor: '#12121e', border: '1px solid #2c2c44', borderRadius: '8px', color: '#ffffff', padding: '12px 14px', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box' };
const authSubmitButtonStyle = { backgroundColor: '#0071e3', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '5px', transition: 'background-color 0.2s' };
const authToggleLinkStyle = { color: '#0071e3', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' };
const authErrorStyle = { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '15px', textAlign: 'center' };

export default App;