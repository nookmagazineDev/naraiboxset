import React, { useState, useEffect, useCallback } from 'react';
import { Wine, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw, X, Save, ChevronLeft, Clock } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzxzhnOhSPWssbEfRVG8doa4G4fQ_98B9_Kog34gguPrG7fgbY5gPnuvTIoneJcmdKgrA/exec';

const EMPTY_FORM = { customerName: '', productName: '', qty: '', note: '' };

const LiquorStorage = ({ currentUser, lang = 'th', onBack }) => {
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null); // null | 'deposit' | 'withdraw'
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState('');
  const [activeTab, setActiveTab]       = useState('stock'); // 'stock' | 'history'

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${GAS_URL}?action=getLiquorRecords`);
      const data = await res.json();
      if (data.success) setRecords(data.records || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // คำนวณสต็อกคงเหลือต่อลูกค้า/สินค้า
  const stockMap = {};
  records.forEach(r => {
    const key = `${r.customerName}||${r.productName}`;
    if (!stockMap[key]) {
      stockMap[key] = {
        customerName: r.customerName,
        productName:  r.productName,
        qty:          0,
        lastDepositAt:    null,
        lastDepositStaff: '',
        lastWithdrawAt:    null,
        lastWithdrawStaff: '',
      };
    }
    const q = Number(r.qty) || 0;
    if (r.type === 'ฝาก') {
      stockMap[key].qty += q;
      if (!stockMap[key].lastDepositAt || r.timestamp > stockMap[key].lastDepositAt) {
        stockMap[key].lastDepositAt    = r.timestamp;
        stockMap[key].lastDepositStaff = r.staff;
      }
    } else {
      stockMap[key].qty -= q;
      if (!stockMap[key].lastWithdrawAt || r.timestamp > stockMap[key].lastWithdrawAt) {
        stockMap[key].lastWithdrawAt    = r.timestamp;
        stockMap[key].lastWithdrawStaff = r.staff;
      }
    }
  });

  const stock = Object.values(stockMap)
    .filter(s => s.qty > 0)
    .sort((a, b) => a.customerName.localeCompare(b.customerName, 'th'));

  const history = [...records].reverse();

  const openModal = (type) => {
    setForm(EMPTY_FORM);
    setSaveMsg('');
    setModal(type);
  };

  const fillWithdraw = (item) => {
    setForm({ customerName: item.customerName, productName: item.productName, qty: '', note: '' });
    setSaveMsg('');
    setModal('withdraw');
  };

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.productName.trim() || !form.qty) {
      setSaveMsg('กรุณากรอกชื่อลูกค้า สินค้า และจำนวน');
      return;
    }
    const type  = modal === 'deposit' ? 'ฝาก' : 'เบิก';
    const stock_ = stockMap[`${form.customerName}||${form.productName}`];
    if (type === 'เบิก' && (!stock_ || Number(form.qty) > stock_.qty)) {
      setSaveMsg(`เบิกเกินจำนวนที่ฝากไว้ (คงเหลือ ${stock_?.qty ?? 0} ขวด)`);
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      await fetch(GAS_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify({
          action:       'saveLiquorRecord',
          type,
          customerName: form.customerName.trim(),
          productName:  form.productName.trim(),
          qty:          Number(form.qty),
          note:         form.note.trim(),
          staff:        currentUser?.username || 'ไม่ระบุ',
        }),
      });
      // optimistic update
      const newRec = {
        timestamp:    new Date().toISOString(),
        type,
        customerName: form.customerName.trim(),
        productName:  form.productName.trim(),
        qty:          Number(form.qty),
        note:         form.note.trim(),
        staff:        currentUser?.username || 'ไม่ระบุ',
      };
      setRecords(prev => [...prev, newRec]);
      setSaveMsg('✅ บันทึกสำเร็จ');
      setTimeout(() => { setModal(null); setSaveMsg(''); }, 1200);
    } catch (e) {
      setSaveMsg('❌ บันทึกไม่สำเร็จ ตรวจสอบการเชื่อมต่อ');
    }
    setSaving(false);
  };

  const fmtDate = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.25rem' };
  const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'white', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginBottom: '0.4rem' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #0f0f0f)', color: 'white', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', padding: 0 }}>
          <ChevronLeft size={20} /> {lang === 'th' ? 'กลับ' : 'Back'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
          <Wine size={24} color="#a78bfa" />
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            {lang === 'th' ? 'ฝากเหล้า / เบิกเหล้า' : 'Liquor Storage'}
          </h1>
        </div>
        <button onClick={fetchRecords} disabled={loading} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {lang === 'th' ? 'รีเฟรช' : 'Refresh'}
        </button>
        <button onClick={() => openModal('deposit')} style={{ background: '#7c3aed', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
          <ArrowDownCircle size={17} /> {lang === 'th' ? 'ฝากใหม่' : 'Deposit'}
        </button>
        <button onClick={() => openModal('withdraw')} style={{ background: 'rgba(249,115,22,0.85)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
          <ArrowUpCircle size={17} /> {lang === 'th' ? 'เบิก' : 'Withdraw'}
        </button>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[['stock', `🍾 ${lang === 'th' ? 'สต็อกคงเหลือ' : 'Current Stock'} (${stock.length})`], ['history', `📋 ${lang === 'th' ? 'ประวัติ' : 'History'} (${records.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '0.45rem 1.1rem', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: '0.88rem', fontWeight: activeTab === key ? 700 : 400, background: activeTab === key ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', borderColor: activeTab === key ? '#7c3aed' : 'rgba(255,255,255,0.12)', color: activeTab === key ? '#a78bfa' : 'rgba(255,255,255,0.6)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Stock Tab */}
        {activeTab === 'stock' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
              <p>กำลังโหลด...</p>
            </div>
          ) : stock.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
              <Wine size={52} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>ยังไม่มีเหล้าฝากอยู่</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stock.map((item, i) => (
                <div key={i} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, padding: '0.6rem 1rem', textAlign: 'center', minWidth: 70 }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa', lineHeight: 1 }}>{item.qty}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>ขวด</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>{item.customerName}</div>
                    <div style={{ color: '#a78bfa', fontWeight: 600, fontSize: '0.9rem', marginTop: 2 }}>{item.productName}</div>
                    {item.lastDepositAt && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ArrowDownCircle size={11} /> ฝากล่าสุด {fmtDate(item.lastDepositAt)}
                        {item.lastDepositStaff && <span style={{ color: '#22c55e' }}>โดย {item.lastDepositStaff}</span>}
                      </div>
                    )}
                    {item.lastWithdrawAt && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ArrowUpCircle size={11} /> เบิกล่าสุด {fmtDate(item.lastWithdrawAt)}
                        {item.lastWithdrawStaff && <span style={{ color: '#f97316' }}>โดย {item.lastWithdrawStaff}</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => fillWithdraw(item)} style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.35)', borderRadius: 8, color: '#f97316', cursor: 'pointer', padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <ArrowUpCircle size={15} /> เบิก
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                <Clock size={40} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0 }}>ยังไม่มีประวัติ</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {['วันเวลา', 'ประเภท', 'ชื่อลูกค้า', 'สินค้า', 'จำนวน', 'หมายเหตุ', 'พนักงาน'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(r.timestamp)}</td>
                      <td style={{ padding: '0.7rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, background: r.type === 'ฝาก' ? 'rgba(124,58,237,0.15)' : 'rgba(249,115,22,0.15)', color: r.type === 'ฝาก' ? '#a78bfa' : '#f97316', border: `1px solid ${r.type === 'ฝาก' ? 'rgba(124,58,237,0.3)' : 'rgba(249,115,22,0.3)'}` }}>
                          {r.type === 'ฝาก' ? '⬇ ฝาก' : '⬆ เบิก'}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 600 }}>{r.customerName}</td>
                      <td style={{ padding: '0.7rem 1rem', color: '#a78bfa' }}>{r.productName}</td>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 700, textAlign: 'center' }}>{r.qty}</td>
                      <td style={{ padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>{r.note || '—'}</td>
                      <td style={{ padding: '0.7rem 1rem' }}>
                        <span style={{ color: r.type === 'ฝาก' ? '#22c55e' : '#f97316', fontWeight: 600, fontSize: '0.82rem' }}>{r.staff || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal ฝาก / เบิก */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setModal(null)}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '1.75rem', width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                {modal === 'deposit'
                  ? <><ArrowDownCircle size={20} color="#a78bfa" /> ฝากเหล้า</>
                  : <><ArrowUpCircle size={20} color="#f97316" /> เบิกเหล้า</>}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>ชื่อลูกค้า *</label>
                {modal === 'withdraw' && stock.length > 0 ? (
                  <select value={form.customerName} onChange={e => { const c = e.target.value; setForm(f => ({ ...f, customerName: c, productName: '' })); }} style={{ ...inputStyle }}>
                    <option value="">— เลือกลูกค้า —</option>
                    {[...new Set(stock.map(s => s.customerName))].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} placeholder="ชื่อลูกค้า" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
                )}
              </div>

              <div>
                <label style={labelStyle}>ชื่อสินค้า / ยี่ห้อ *</label>
                {modal === 'withdraw' && form.customerName ? (
                  <select value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} style={{ ...inputStyle }}>
                    <option value="">— เลือกสินค้า —</option>
                    {stock.filter(s => s.customerName === form.customerName).map(s => (
                      <option key={s.productName} value={s.productName}>{s.productName} (คงเหลือ {s.qty} ขวด)</option>
                    ))}
                  </select>
                ) : (
                  <input style={inputStyle} placeholder="เช่น Johnnie Walker Black" value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} />
                )}
              </div>

              <div>
                <label style={labelStyle}>จำนวน (ขวด) *</label>
                <input type="number" min="1" style={{ ...inputStyle }} placeholder="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
              </div>

              <div>
                <label style={labelStyle}>หมายเหตุ</label>
                <input style={inputStyle} placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                พนักงาน: <strong style={{ color: '#22c55e' }}>{currentUser?.username || 'ไม่ระบุ'}</strong>
              </div>
            </div>

            {saveMsg && (
              <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', borderRadius: 8, background: saveMsg.startsWith('✅') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: saveMsg.startsWith('✅') ? '#22c55e' : '#ef4444', fontSize: '0.88rem' }}>
                {saveMsg}
              </div>
            )}

            <button onClick={handleSave} disabled={saving} style={{ width: '100%', marginTop: '1.25rem', padding: '0.85rem', border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: saving ? '#444' : modal === 'deposit' ? '#7c3aed' : '#ea580c', color: 'white' }}>
              <Save size={18} /> {saving ? 'กำลังบันทึก...' : modal === 'deposit' ? 'บันทึกฝากเหล้า' : 'บันทึกเบิกเหล้า'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LiquorStorage;
