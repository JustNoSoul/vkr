import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getAdminFieldSchema, getDefaultComponentDraft } from '../utils/componentSpecs.js';

function fieldInputType(key) {
  if (['integrated_graphics', 'wifi', 'bluetooth'].includes(key)) return 'checkbox';
  if (['base_clock_ghz', 'boost_clock_ghz', 'noise_level', 'voltage'].includes(key)) return 'number-step';
  if (['cores', 'threads', 'capacity', 'tdp', 'wattage', 'length', 'boost_clock', 'read_speed', 'write_speed', 'height', 'ram_slots', 'ram_max', 'ram_speed', 'pcie_slots', 'm2_slots', 'sata_ports', 'l3_cache_mb', 'memory_channels', 'connectors_24pin', 'connectors_cpu4_4pin', 'connectors_cpu_8pin', 'connectors_pcie_6_2pin', 'connectors_pcie_8pin', 'connectors_pcie_12pin', 'connectors_sata'].includes(key)) {
    return 'number';
  }
  return 'text';
}

export default function AdminComponentModal({
  open,
  mode,
  apiCategory,
  initialData,
  onClose,
  onSave,
  saving,
}) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialData) {
      setDraft({ ...initialData, category: apiCategory });
    } else {
      setDraft(getDefaultComponentDraft(apiCategory));
    }
  }, [open, mode, apiCategory, initialData]);

  if (!open) return null;

  const fields = getAdminFieldSchema(apiCategory);

  const setField = (key, value) => setDraft(p => ({ ...p, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(draft);
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <button type="button" style={closeBtn} onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </button>
        <h2 style={title}>{mode === 'edit' ? 'Редактирование комплектующего' : 'Новое комплектующее'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={grid}>
            {fields.map(([key, label]) => {
              const type = fieldInputType(key);
              if (type === 'checkbox') {
                return (
                  <label key={key} style={checkLabel}>
                    <input
                      type="checkbox"
                      checked={Boolean(draft[key])}
                      onChange={e => setField(key, e.target.checked)}
                    />
                    {label}
                  </label>
                );
              }
              return (
                <label key={key} style={labelStyle}>
                  {label}
                  <input
                    type={type === 'number-step' ? 'number' : type}
                    step={type === 'number-step' ? '0.1' : '1'}
                    value={draft[key] ?? ''}
                    onChange={e => {
                      const v = type.startsWith('number')
                        ? (e.target.value === '' ? '' : Number(e.target.value))
                        : e.target.value;
                      setField(key, v);
                    }}
                    style={input}
                    required={key === 'name' || key === 'manufacturer'}
                  />
                </label>
              );
            })}
          </div>
          <div style={footer}>
            <button type="button" style={btnSec} onClick={onClose}>Отмена</button>
            <button type="submit" style={btnPri} disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 16 };
const modal = { background: '#1c1c2e', border: '1px solid #2c2c44', borderRadius: 16, padding: 24, width: 'min(720px, 100%)', maxHeight: '90vh', overflow: 'auto', position: 'relative' };
const closeBtn = { position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' };
const title = { margin: '0 0 20px', fontSize: 20 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#a1a1aa' };
const checkLabel = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e4e4e7', gridColumn: '1 / -1' };
const input = { background: '#12121e', border: '1px solid #2c2c44', color: '#fff', padding: '8px 10px', borderRadius: 8, fontSize: 14 };
const footer = { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid #2c2c44' };
const btnPri = { background: '#0071e3', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' };
const btnSec = { background: '#2c2c44', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' };
