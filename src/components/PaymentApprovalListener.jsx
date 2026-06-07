import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BellRing, Check, X } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzxzhnOhSPWssbEfRVG8doa4G4fQ_98B9_Kog34gguPrG7fgbY5gPnuvTIoneJcmdKgrA/exec';

// แสดงคำขออนุมัติ QR ให้แอดมิน/แคชเชียร์กดยืนยัน (โพลข้ามเครื่อง)
const PaymentApprovalListener = ({ currentUser, lang = 'th' }) => {
  const [pending, setPending] = useState([]);
  const handledRef = useRef(new Set()); // id ที่ตอบไปแล้ว (กันโผล่ซ้ำระหว่างรอ sync)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getPaymentApprovals`);
      const data = await res.json();
      if (!data.success) return;
      const list = (data.approvals || [])
        .filter(a => a.status === 'pending' && !handledRef.current.has(String(a.id)));
      setPending(list);
    } catch (e) {}
  }, []);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [poll]);

  const respond = (id, status) => {
    handledRef.current.add(String(id));
    setPending(prev => prev.filter(a => String(a.id) !== String(id)));
    fetch(GAS_URL, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'respondPaymentApproval', id, status, approver: currentUser?.username || 'ไม่ระบุ' })
    }).catch(() => {});
  };

  if (pending.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 3000, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '360px', width: 'calc(100% - 2rem)' }}>
      {pending.map(a => (
        <div key={a.id} style={{ background: '#11182f', border: '1px solid rgba(96,165,250,0.5)', borderRadius: '14px', padding: '1rem 1.1rem', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', animation: 'spin-none 0s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', color: '#60a5fa', fontWeight: 800 }}>
            <BellRing size={18} style={{ animation: 'spin 1.2s ease-in-out infinite' }} />
            {lang === 'th' ? 'ขออนุมัติชำระด้วย QR' : 'QR Payment Approval'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.2rem' }}>
            <span>{lang === 'th' ? 'บิล' : 'Bill'} {a.orderNumber}{a.tableNo ? ` · ${lang === 'th' ? 'โต๊ะ' : 'Table'} ${a.tableNo}` : ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{lang === 'th' ? 'ผู้ขอ' : 'By'}: {a.requestedBy || '-'}</span>
            <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1.4rem' }}>฿{Number(a.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={() => respond(a.id, 'rejected')} style={{ flex: 1, padding: '0.65rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <X size={16} /> {lang === 'th' ? 'ปฏิเสธ' : 'Reject'}
            </button>
            <button onClick={() => respond(a.id, 'approved')} style={{ flex: 2, padding: '0.65rem', background: '#22c55e', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <Check size={16} /> {lang === 'th' ? 'อนุมัติ' : 'Approve'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaymentApprovalListener;
