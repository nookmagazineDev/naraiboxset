import React, { useState } from 'react';
import { Clock, X, CheckCircle } from 'lucide-react';

const ShiftModal = ({ mode, currentShift, shiftSales, currentUser, onConfirmOpen, onConfirmClose, onClose }) => {
  const [openCash, setOpenCash]   = useState('');
  const [closeCash, setCloseCash] = useState('');
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);

  const fmt  = (n) => (Number(n) || 0).toLocaleString('th-TH');
  const fmtD = (ts) => {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  const sales        = shiftSales || {};
  const openCashAmt  = Number(currentShift?.openCash) || 0;
  const cashReceived = Number(sales.totalCash) || 0;
  const closeAmt     = Number(closeCash) || 0;
  const cashDiff     = closeCash !== '' ? closeAmt - openCashAmt - cashReceived : null;

  const handleConfirm = async () => {
    setSaving(true);
    if (mode === 'open') await onConfirmOpen(Number(openCash) || 0);
    else                 await onConfirmClose(Number(closeCash) || 0, note);
    setSaving(false);
  };

  const inp = { width: '100%', padding: '0.7rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'white', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginBottom: '0.4rem' };
  const accent = mode === 'open' ? '#22c55e' : '#ef4444';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#1a1a2e', border: `1px solid ${mode === 'open' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 18, padding: '1.75rem', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: accent }}>
            <Clock size={20} /> {mode === 'open' ? 'เปิดกะ' : 'ปิดกะ'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Open shift form */}
          {mode === 'open' && (
            <>
              <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)' }}>
                พนักงาน: <strong style={{ color: '#22c55e' }}>{currentUser?.username || 'ไม่ระบุ'}</strong>
                &nbsp;•&nbsp; เวลา: <strong style={{ color: 'white' }}>{fmtD(new Date().toISOString())}</strong>
              </div>
              <div>
                <label style={lbl}>เงินสดในลิ้นชัก (บาท)</label>
                <input type="number" min="0" style={inp} placeholder="0" value={openCash} onChange={e => setOpenCash(e.target.value)} autoFocus />
              </div>
            </>
          )}

          {/* Close shift form */}
          {mode === 'close' && (
            <>
              {/* Shift info */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>
                เปิดกะ: <strong style={{ color: 'white' }}>{fmtD(currentShift?.openTime)}</strong>
                &nbsp;•&nbsp; โดย <strong style={{ color: '#22c55e' }}>{currentShift?.openStaff}</strong>
              </div>

              {/* Sales summary grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {[
                  { label: 'ยอดขายรวม', value: `฿${fmt(sales.totalSales)}`, color: '#a78bfa' },
                  { label: 'จำนวนบิล', value: `${sales.totalOrders || 0} บิล`, color: 'white' },
                  { label: 'เงินสด', value: `฿${fmt(sales.totalCash)}`, color: '#22c55e' },
                  { label: 'โอน / QR', value: `฿${fmt(sales.totalTransfer)}`, color: '#38bdf8' },
                  { label: 'บัตรเครดิต', value: `฿${fmt(sales.totalCard)}`, color: '#f97316' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.65rem 0.85rem' }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginBottom: 3 }}>{label}</div>
                    <div style={{ color, fontWeight: 700, fontSize: '1rem' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Closing cash */}
              <div>
                <label style={lbl}>เงินสดในลิ้นชักตอนปิด (บาท)</label>
                <input type="number" min="0" style={inp} placeholder="0" value={closeCash} onChange={e => setCloseCash(e.target.value)} autoFocus />
              </div>

              {/* Cash reconciliation */}
              {closeCash !== '' && (
                <div style={{ background: cashDiff !== null && Math.abs(cashDiff) < 1 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${cashDiff !== null && Math.abs(cashDiff) < 1 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 10, padding: '0.9rem 1rem' }}>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>สรุปเงินสด</div>
                  {[
                    ['เงินในลิ้นชักตอนปิด', `฿${fmt(closeCash)}`, 'white'],
                    ['หัก เงินเปิดกะ', `-฿${fmt(openCashAmt)}`, 'rgba(255,255,255,0.6)'],
                    ['หัก รับเงินสด', `-฿${fmt(cashReceived)}`, 'rgba(255,255,255,0.6)'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 4 }}>
                      <span style={{ color: 'rgba(255,255,255,0.55)' }}>{k}</span>
                      <span style={{ color: c }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 6 }}>
                    <span>ส่วนต่าง</span>
                    <span style={{ color: cashDiff !== null && Math.abs(cashDiff) < 1 ? '#22c55e' : '#ef4444' }}>
                      {cashDiff !== null && cashDiff >= 0 ? '+' : ''}{cashDiff !== null ? `฿${fmt(cashDiff)}` : '—'}
                      {cashDiff !== null && (Math.abs(cashDiff) < 1 ? ' ✓ ตรง' : cashDiff > 0 ? ' (เกิน)' : ' (ขาด)')}
                    </span>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label style={lbl}>หมายเหตุ (ถ้ามี)</label>
                <input style={inp} placeholder="หมายเหตุ..." value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            ยกเลิก
          </button>
          <button onClick={handleConfirm} disabled={saving} style={{ flex: 2, padding: '0.8rem', background: saving ? '#444' : mode === 'open' ? '#16a34a' : '#dc2626', border: 'none', color: 'white', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <CheckCircle size={17} /> {saving ? 'กำลังบันทึก...' : mode === 'open' ? 'เปิดกะ' : 'ปิดกะและบันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftModal;
