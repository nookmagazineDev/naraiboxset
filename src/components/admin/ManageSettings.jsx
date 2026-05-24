import React, { useState, useEffect } from 'react';
import { Settings, ToggleLeft, ToggleRight, Save, Info } from 'lucide-react';

const DEFAULT_SETTINGS = {
  serviceCharge: { enabled: false, rate: 10 },
  vat: { enabled: false, rate: 7 }
};

const ToggleBtn = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: checked ? '#22c55e' : 'rgba(255,255,255,0.25)', transition: 'color 0.2s', flexShrink: 0 }}
  >
    {checked ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
  </button>
);

const ManageSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pos_settings');
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('pos_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('pos_settings_changed'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const update = (key, field, value) => {
    setSettings(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setSaved(false);
  };

  const exampleSubtotal = 300;
  const scAmount = settings.serviceCharge.enabled ? Math.round(exampleSubtotal * settings.serviceCharge.rate) / 100 : 0;
  const vatBase = exampleSubtotal + scAmount;
  const vatAmount = settings.vat.enabled ? Math.round(vatBase * settings.vat.rate) / 100 : 0;
  const grandTotal = exampleSubtotal + scAmount + vatAmount;

  return (
    <div style={{ padding: '2rem', maxWidth: '640px' }}>
      <h2 style={{ color: 'white', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem' }}>
        <Settings size={22} /> ตั้งค่าค่าบริการ
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        เซอร์วิชชาร์จและ VAT จะแสดงในหน้าตะกร้าและหน้าชำระเงินโดยอัตโนมัติ
      </p>

      {/* Service Charge Card */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ color: 'white', margin: '0 0 0.3rem', fontSize: '1.05rem' }}>ค่าเซอร์วิชชาร์จ</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              Service Charge — คิดจากยอดอาหารก่อน VAT
            </p>
          </div>
          <ToggleBtn checked={settings.serviceCharge.enabled} onChange={(v) => update('serviceCharge', 'enabled', v)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', opacity: settings.serviceCharge.enabled ? 1 : 0.38, transition: 'opacity 0.2s' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>อัตรา</label>
          <input
            type="number" min="0" max="100" step="0.5"
            value={settings.serviceCharge.rate}
            onChange={(e) => update('serviceCharge', 'rate', parseFloat(e.target.value) || 0)}
            disabled={!settings.serviceCharge.enabled}
            style={{ width: '90px', padding: '0.55rem 0.75rem', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '1.05rem', textAlign: 'center', fontWeight: '700' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>%</span>
          {settings.serviceCharge.enabled && (
            <span style={{ color: '#fbbf24', fontSize: '0.82rem', fontWeight: '600' }}>
              ฿100 → +฿{(100 * settings.serviceCharge.rate / 100).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* VAT Card */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ color: 'white', margin: '0 0 0.3rem', fontSize: '1.05rem' }}>ภาษีมูลค่าเพิ่ม (VAT)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              VAT — คิดจากยอด (อาหาร + เซอร์วิชชาร์จ)
            </p>
          </div>
          <ToggleBtn checked={settings.vat.enabled} onChange={(v) => update('vat', 'enabled', v)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', opacity: settings.vat.enabled ? 1 : 0.38, transition: 'opacity 0.2s' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>อัตรา</label>
          <input
            type="number" min="0" max="100" step="0.5"
            value={settings.vat.rate}
            onChange={(e) => update('vat', 'rate', parseFloat(e.target.value) || 0)}
            disabled={!settings.vat.enabled}
            style={{ width: '90px', padding: '0.55rem 0.75rem', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '1.05rem', textAlign: 'center', fontWeight: '700' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>%</span>
          {settings.vat.enabled && (
            <span style={{ color: '#fbbf24', fontSize: '0.82rem', fontWeight: '600' }}>
              ฿100 → +฿{(100 * settings.vat.rate / 100).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      {(settings.serviceCharge.enabled || settings.vat.enabled) && (
        <div style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.25)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={14} /> ตัวอย่างการคำนวณ (ฐาน ฿{exampleSubtotal})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
              <span>ยอดอาหาร</span><span>฿{exampleSubtotal.toFixed(2)}</span>
            </div>
            {settings.serviceCharge.enabled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24' }}>
                <span>เซอร์วิชชาร์จ {settings.serviceCharge.rate}%</span><span>+฿{scAmount.toFixed(2)}</span>
              </div>
            )}
            {settings.vat.enabled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa' }}>
                <span>VAT {settings.vat.rate}%</span><span>+฿{vatAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: '800', fontSize: '1.05rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span>รวมทั้งสิ้น</span><span style={{ color: '#fbbf24' }}>฿{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 2rem', background: saved ? '#22c55e' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.3s', fontFamily: 'inherit' }}
      >
        <Save size={18} /> {saved ? 'บันทึกแล้ว ✓' : 'บันทึกการตั้งค่า'}
      </button>
    </div>
  );
};

export default ManageSettings;
