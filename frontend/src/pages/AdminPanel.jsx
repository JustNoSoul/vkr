import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, Trash2, Loader2, Users, Database, Download, Pencil, Plus } from 'lucide-react';
import AdminComponentModal from '../components/AdminComponentModal.jsx';
import { readApiError } from '../utils/apiError.js';

const CATEGORIES = [
  { id: 'cpus', label: 'Процессоры' },
  { id: 'motherboards', label: 'Материнские платы' },
  { id: 'gpus', label: 'Видеокарты' },
  { id: 'rams', label: 'ОЗУ' },
  { id: 'coolings', label: 'Кулеры' },
  { id: 'psus', label: 'Блоки питания' },
  { id: 'storages', label: 'Накопители' },
];

function AdminPanel() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('configs');
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [configs, setConfigs] = useState([]);
  const [components, setComponents] = useState([]);
  const [category, setCategory] = useState('cpus');
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [adminUsers, setAdminUsers] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });

  const [tpuQuery, setTpuQuery] = useState('');
  const [tpuResults, setTpuResults] = useState([]);
  const [tpuDraft, setTpuDraft] = useState(null);

  const [compModal, setCompModal] = useState({ open: false, mode: 'create', item: null });
  const [configModal, setConfigModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const token = () => localStorage.getItem('accessToken');
  const authHeaders = () => ({
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    const check = async () => {
      const t = token();
      if (!t) {
        navigate('/');
        return;
      }
      try {
        const res = await fetch('/api/accounts/me/', { headers: { Authorization: `Bearer ${t}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setIsAdmin(data.role === 'admin' || data.is_superuser);
        localStorage.setItem('userRole', data.role);
      } catch {
        setIsAdmin(false);
      } finally {
        setRoleChecked(true);
      }
    };
    check();
  }, [navigate]);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/configurations/', { headers: authHeaders() });
      if (!res.ok) throw new Error(await readApiError(res, 'Не удалось загрузить сборки'));
      setConfigs(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadComponents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/components/?category=${category}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await readApiError(res, 'Не удалось загрузить комплектующие'));
      setComponents(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [category]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/', { headers: authHeaders() });
      if (!res.ok) throw new Error(await readApiError(res, 'Не удалось загрузить пользователей'));
      setAdminUsers(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'configs') loadConfigs();
    if (tab === 'components') loadComponents();
    if (tab === 'users') loadUsers();
  }, [isAdmin, tab, loadConfigs, loadComponents, loadUsers]);

  const downloadTemplate = async () => {
    const res = await fetch('/api/admin/import-template/', { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) {
      setError('Не удалось скачать шаблон Excel');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'components_import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) {
      setError('Выберите файл Excel (.xlsx)');
      return;
    }
    setLoading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const res = await fetch('/api/admin/import-xlsx/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(await readApiError(res, 'Ошибка импорта'));
      setImportResult(data);
      setMessage(data.message || 'Импорт выполнен');
      loadComponents();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveComponent = async (draft) => {
    setSaving(true);
    setError('');
    const isEdit = compModal.mode === 'edit' && draft.id;
    const url = isEdit ? `/api/admin/components/${draft.id}/` : '/api/admin/components/';
    const method = isEdit ? 'PUT' : 'POST';
    const body = { ...draft, category };
    delete body.id;
    try {
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await readApiError(res, 'Не удалось сохранить'));
      setMessage(isEdit ? 'Компонент обновлён' : 'Компонент добавлен');
      setCompModal({ open: false, mode: 'create', item: null });
      loadComponents();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteComponent = async (id) => {
    if (!window.confirm('Удалить этот компонент?')) return;
    const res = await fetch(`/api/admin/components/${id}/`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) {
      setMessage('Компонент удалён');
      loadComponents();
    } else setError(await readApiError(res, 'Не удалось удалить'));
  };

  const openEditConfig = (cfg) => {
    setConfigModal({
      id: cfg.id,
      name: cfg.name,
      description: cfg.description || '',
      is_public: cfg.is_public,
      has_rgb: cfg.has_rgb,
      cooler_count: cfg.cooler_count,
      total_power: cfg.total_power,
      component_ids: (cfg.items || []).map(i => i.component),
    });
  };

  const saveConfig = async () => {
    if (!configModal) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/configurations/${configModal.id}/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: configModal.name,
          description: configModal.description,
          is_public: configModal.is_public,
          has_rgb: configModal.has_rgb,
          cooler_count: configModal.cooler_count,
          total_power: configModal.total_power,
          component_ids: configModal.component_ids,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Не удалось сохранить сборку'));
      setMessage('Сборка обновлена');
      setConfigModal(null);
      loadConfigs();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openInConfigurator = (cfg) => {
    sessionStorage.setItem('pc_edit_id', String(cfg.id));
    sessionStorage.setItem('pc_edit_name', cfg.name || '');
    sessionStorage.setItem('pc_build_edit_id', String(cfg.id));
    sessionStorage.setItem('pc_edit_force_reload', '1');
    navigate(`/configurator?mode=edit&id=${cfg.id}`);
  };

  const deleteConfig = async (id) => {
    if (!window.confirm('Удалить эту сборку?')) return;
    const res = await fetch(`/api/admin/configurations/${id}/`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) {
      setMessage('Сборка удалена');
      loadConfigs();
    } else setError(await readApiError(res, 'Не удалось удалить'));
  };

  const createAdminUser = async () => {
    setError('');
    const res = await fetch('/api/admin/users/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newAdmin),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(await readApiError(res, 'Ошибка создания администратора'));
      return;
    }
    setMessage(data.message || 'Администратор создан');
    setNewAdmin({ username: '', password: '' });
    loadUsers();
  };

  const searchExternalGpu = async () => {
    if (tpuQuery.trim().length < 2) {
      setError('Введите минимум 2 символа для поиска');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/techpowerup/search/?q=${encodeURIComponent(tpuQuery)}&type=gpu`,
        { headers: authHeaders() },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(await readApiError(res, 'Ошибка поиска'));
      setTpuResults(data.results || []);
      setMessage(data.message || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const importTpu = async () => {
    if (!tpuDraft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/techpowerup/import/', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(tpuDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(await readApiError(res, 'Ошибка импорта'));
      setMessage(data.message || 'Добавлено в каталог');
      setTpuDraft(null);
      setTab('components');
      setCategory(tpuDraft.import_kind === 'storages' ? 'storages' : tpuDraft.import_kind === 'cpus' ? 'cpus' : 'gpus');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!roleChecked) {
    return <div style={page}><Loader2 className="spin" /> Проверка доступа…</div>;
  }

  if (!isAdmin) {
    return (
      <div style={page}>
        <p style={{ color: '#ef4444' }}>Доступ запрещён. Требуется роль администратора.</p>
        <button type="button" onClick={() => navigate('/')} style={btnSecondary}>На главную</button>
      </div>
    );
  }

  const tpuFields = tpuDraft
    ? Object.keys(tpuDraft).filter(k => !['import_kind', 'source', 'source_url'].includes(k))
    : [];

  return (
    <div style={page}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={28} color="#0071e3" />
          <h1 style={{ margin: 0, fontSize: 26 }}>Панель администратора</h1>
        </div>
      </div>

      {error && <div style={errBox}>{error}</div>}
      {message && <div style={okBox}>{message}</div>}

      <div style={tabs}>
        {[
          ['configs', 'Мои сборки'],
          ['components', 'Комплектующие'],
          ['import', 'Excel'],
          ['external-gpu', 'Импорт GPU'],
          ['users', 'Пользователи'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setError(''); setMessage(''); }}
            style={{ ...tabBtn, ...(tab === id ? tabBtnActive : {}) }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#a1a1aa' }}><Loader2 size={16} className="spin" /> Загрузка…</p>}

      {tab === 'configs' && (
        <section style={card}>
          <h2 style={h2}>Мои сборки</h2>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>Отображаются только сборки вашей учётной записи.</p>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Название</th>
                <th style={th}>Публичная</th>
                <th style={th}>Рек. БП</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {configs.map(c => (
                <tr key={c.id}>
                  <td style={td}>{c.id}</td>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.is_public ? 'Да' : 'Нет'}</td>
                  <td style={td}>{c.total_power} Вт</td>
                  <td style={td}>
                    <button type="button" style={btnSmall} onClick={() => openInConfigurator(c)} title="В конфигураторе">
                      Конфигуратор
                    </button>
                    <button type="button" style={{ ...btnSmall, marginLeft: 6 }} onClick={() => openEditConfig(c)} title="Метаданные">
                      <Pencil size={14} />
                    </button>
                    <button type="button" style={{ ...btnDanger, marginLeft: 6 }} onClick={() => deleteConfig(c.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {configs.length === 0 && <p style={{ color: '#71717a' }}>Сборок пока нет. Создайте их в конфигураторе.</p>}
        </section>
      )}

      {tab === 'components' && (
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <h2 style={{ ...h2, margin: 0 }}>Комплектующие</h2>
            <button
              type="button"
              style={btnPrimary}
              onClick={() => setCompModal({ open: true, mode: 'create', item: null })}
            >
              <Plus size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Добавить
            </button>
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} style={input}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 16 }}>
            {components.map(c => (
              <div key={c.id} style={row}>
                <span>{c.manufacturer} {c.name}</span>
                <div>
                  <button type="button" style={btnSmall} onClick={() => setCompModal({ open: true, mode: 'edit', item: c })}>
                    <Pencil size={14} />
                  </button>
                  <button type="button" style={{ ...btnDanger, marginLeft: 6 }} onClick={() => deleteComponent(c.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'import' && (
        <section style={card}>
          <h2 style={h2}><Upload size={20} style={{ verticalAlign: 'middle' }} /> Импорт из Excel</h2>
          <p style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
            Файл .xlsx с листами: cpus, motherboards, gpus, rams, coolings, psus, storages.
          </p>
          <button type="button" style={{ ...btnSecondary, marginBottom: 16 }} onClick={downloadTemplate}>
            <Download size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Скачать шаблон
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={e => setImportFile(e.target.files?.[0] || null)}
          />
          <div style={filePickerRow}>
            <button type="button" style={filePickerBtn} onClick={() => fileInputRef.current?.click()}>
              Выбрать файл
            </button>
            <span style={fileName}>{importFile ? importFile.name : 'Файл не выбран'}</span>
          </div>
          <button type="button" style={{ ...btnPrimary, marginTop: 12 }} onClick={handleImport} disabled={!importFile}>
            Загрузить в каталог
          </button>
          {importResult && (
            <pre style={{ marginTop: 16, background: '#12121e', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 280 }}>
              {JSON.stringify(importResult, null, 2)}
            </pre>
          )}
        </section>
      )}

      {tab === 'external-gpu' && (
        <section style={card}>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>
            Поиск видеокарт во внешнем каталоге
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <input
              placeholder="Модель, например GeForce RTX 4070"
              value={tpuQuery}
              onChange={e => setTpuQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchExternalGpu()}
              style={{ ...input, flex: 1, minWidth: 200 }}
            />
            <button type="button" style={btnPrimary} onClick={searchExternalGpu}>Найти</button>
          </div>
          <div style={{ maxHeight: 180, overflow: 'auto', marginBottom: 16 }}>
            {tpuResults.map((item, idx) => (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                onClick={() => setTpuDraft({ ...item })}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: tpuDraft?.name === item.name ? 'rgba(0,113,227,0.2)' : '#12121e',
                  border: '1px solid #2c2c44', color: '#fff', padding: '10px 12px',
                  borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                }}
              >
                {item.manufacturer} {item.name}
              </button>
            ))}
          </div>
          {tpuDraft && (
            <div style={{ borderTop: '1px solid #2c2c44', paddingTop: 16 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Редактирование перед добавлением</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {tpuFields.map(field => (
                  <label key={field} style={{ fontSize: 12, color: '#a1a1aa' }}>
                    {field}
                    <input
                      value={tpuDraft[field] ?? ''}
                      onChange={e => setTpuDraft(p => ({ ...p, [field]: e.target.value }))}
                      style={{ ...input, width: '100%', marginTop: 4, marginRight: 0 }}
                    />
                  </label>
                ))}
              </div>
              <button type="button" style={{ ...btnPrimary, marginTop: 12 }} onClick={importTpu} disabled={saving}>
                Добавить в каталог
              </button>
            </div>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section style={card}>
          <h2 style={h2}><Users size={20} style={{ verticalAlign: 'middle' }} /> Пользователи</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <input placeholder="Логин" value={newAdmin.username} onChange={e => setNewAdmin(p => ({ ...p, username: e.target.value }))} style={input} />
            <input type="password" placeholder="Пароль" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} style={input} />
            <button type="button" style={btnPrimary} onClick={createAdminUser}>Создать админа</button>
          </div>
          <table style={table}>
            <thead>
              <tr><th style={th}>ID</th><th style={th}>Логин</th><th style={th}>Роль</th></tr>
            </thead>
            <tbody>
              {adminUsers.map(u => (
                <tr key={u.id}><td style={td}>{u.id}</td><td style={td}>{u.username}</td><td style={td}>{u.role}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <AdminComponentModal
        open={compModal.open}
        mode={compModal.mode}
        apiCategory={category}
        initialData={compModal.item}
        onClose={() => setCompModal({ open: false, mode: 'create', item: null })}
        onSave={saveComponent}
        saving={saving}
      />

      {configModal && (
        <div style={modalOverlay} onClick={() => !saving && setConfigModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Редактирование сборки</h2>
            <label style={labelBlock}>Название
              <input style={inputFull} value={configModal.name} onChange={e => setConfigModal(p => ({ ...p, name: e.target.value }))} />
            </label>
            <label style={labelBlock}>Описание
              <textarea
                style={{ ...inputFull, minHeight: 100, resize: 'vertical' }}
                value={configModal.description}
                onChange={e => setConfigModal(p => ({ ...p, description: e.target.value }))}
                placeholder="Текст для карточки готовой сборки…"
              />
            </label>
            <label style={{ ...labelBlock, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={configModal.is_public} onChange={e => setConfigModal(p => ({ ...p, is_public: e.target.checked }))} />
              Публичная сборка (карусель на главной)
            </label>
            <p style={{ color: '#71717a', fontSize: 13 }}>Компонентов в сборке: {configModal.component_ids.length}. Изменить состав — в конфигураторе.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="button" style={btnSecondary} onClick={() => setConfigModal(null)}>Отмена</button>
              <button type="button" style={btnPrimary} onClick={saveConfig} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const page = { backgroundColor: '#12121e', color: '#fff', minHeight: '100vh', padding: '32px 16px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' };
const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 };
const tabs = { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' };
const tabBtn = { background: '#2c2c44', border: 'none', color: '#a1a1aa', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };
const tabBtnActive = { background: '#0071e3', color: '#fff' };
const card = { background: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: 14, padding: 24 };
const h2 = { fontSize: 18, marginTop: 0, marginBottom: 16 };
const input = { background: '#12121e', border: '1px solid #2c2c44', color: '#fff', padding: '10px 12px', borderRadius: 8, marginRight: 8, marginBottom: 8 };
const inputFull = { display: 'block', width: '100%', background: '#12121e', border: '1px solid #2c2c44', color: '#fff', padding: '10px 12px', borderRadius: 8, marginTop: 6, boxSizing: 'border-box' };
const labelBlock = { display: 'block', fontSize: 13, color: '#a1a1aa', marginBottom: 14 };
const btnPrimary = { background: '#0071e3', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 };
const btnSecondary = { background: '#2c2c44', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer' };
const btnSmall = { background: '#2c2c44', color: '#10b981', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' };
const btnDanger = { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #2c2c44', color: '#a1a1aa' };
const td = { padding: '10px', borderBottom: '1px solid #2c2c44' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2c2c44' };
const errBox = { background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: 12, borderRadius: 8, marginBottom: 12 };
const okBox = { background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', padding: 12, borderRadius: 8, marginBottom: 12 };
const filePickerRow = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const filePickerBtn = { background: 'linear-gradient(180deg, #0071e3 0%, #005bb5 100%)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 14px rgba(0,113,227,0.35)' };
const fileName = { color: '#a1a1aa', fontSize: 14 };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: 16 };
const modalBox = { background: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: 16, padding: 24, width: 'min(480px, 100%)' };

export default AdminPanel;
