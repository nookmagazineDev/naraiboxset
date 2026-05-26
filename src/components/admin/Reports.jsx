import React, { useState, useCallback } from 'react';
import { BarChart2, TrendingUp, Receipt, XCircle, Clock, RefreshCw, Download } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzxzhnOhSPWssbEfRVG8doa4G4fQ_98B9_Kog34gguPrG7fgbY5gPnuvTIoneJcmdKgrA/exec';

const TABS = [
  { key: 'income',  label: 'รายรับ-รายจ่าย',   icon: <TrendingUp size={15} /> },
  { key: 'menu',    label: 'ยอดขายตามเมนู',      icon: <BarChart2  size={15} /> },
  { key: 'history', label: 'ประวัติการขาย',       icon: <Receipt   size={15} /> },
  { key: 'cancel',  label: 'ประวัติการยกเลิก',    icon: <XCircle   size={15} /> },
  { key: 'shift',   label: 'รายงานปิดกะ',         icon: <Clock     size={15} /> },
];

const TODAY = new Date().toISOString().slice(0, 10);
const D7    = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

const PRESETS = [
  { label: 'วันนี้',  from: TODAY, to: TODAY },
  { label: '7 วัน',   from: D7,    to: TODAY },
  { label: '30 วัน',  from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), to: TODAY },
  { label: 'เดือนนี้', from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: TODAY },
];

const fmt  = (n) => (Number(n) || 0).toLocaleString('th-TH');
const fmtD = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(ts); }
};
const dayStr = (ts) => {
  if (!ts) return '';
  try { return new Date(ts).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return String(ts); }
};

// ─── CSV export helper (ไม่ต้องใช้ library — Excel เปิดได้) ─
const esc = (v) => {
  const s = String(v ?? '');
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCSV = (headers, rows, filename) => {
  const BOM = '﻿'; // UTF-8 BOM — ทำให้ Excel แสดงภาษาไทยถูกต้อง
  const csv = BOM + [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
};

// Export หลาย sheet → หลายไฟล์ CSV (zip ไม่ใช้ library จึง export แยกทีละไฟล์)
const exportXLSX = (sheets, filenameBase) => {
  if (sheets.length === 1) {
    downloadCSV(sheets[0].headers, sheets[0].rows, filenameBase + '_' + sheets[0].name);
    return;
  }
  // Export ทีละ sheet
  sheets.forEach(({ name, headers, rows }) => {
    downloadCSV(headers, rows, filenameBase + '_' + name);
  });
};

// ─── Styles ─────────────────────────────────────────────────
const card   = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.25rem' };
const th_    = { padding: '0.65rem 0.9rem', textAlign: 'left', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' };
const td_    = { padding: '0.65rem 0.9rem', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.04)' };

export default function Reports() {
  const [tab,     setTab]     = useState('income');
  const [from,    setFrom]    = useState(D7);
  const [to,      setTo]      = useState(TODAY);
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState('');

  const load = useCallback(async (f, t) => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${GAS_URL}?action=getReportData&from=${f}&to=${t}`);
      const json = await res.json();
      if (json.success) setData(json); else setError('โหลดข้อมูลไม่สำเร็จ');
    } catch { setError('เชื่อมต่อ GAS ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ'); }
    setLoading(false);
  }, []);

  // ─── Derived ────────────────────────────────────────────────
  const payMap = {};
  (data?.payments || []).forEach(p => { payMap[p.orderNumber] = p; });

  const orderMap = {};
  (data?.orders || []).forEach(r => {
    if (!r.OrderNumber || r.Status === 'cancelled') return;
    if (!orderMap[r.OrderNumber]) {
      orderMap[r.OrderNumber] = {
        orderNumber: r.OrderNumber, customerName: r.CustomerName,
        total: Number(r.TotalAmount) || 0, timestamp: r.Timestamp,
        status: r.Status, paymentMethod: payMap[r.OrderNumber]?.paymentMethod || '—', staff: r.RecordedBy || '',
      };
    }
  });
  const completedOrders = Object.values(orderMap).filter(o => ['completed','Completed'].includes(o.status))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const cancelledOrders = [];
  const seen = new Set();
  (data?.orders || []).forEach(r => {
    if (r.Status === 'cancelled' && r.OrderNumber && !String(r.ItemDetail || '').startsWith('↳') && !seen.has(r.OrderNumber)) {
      seen.add(r.OrderNumber);
      cancelledOrders.push({ ...r, paymentMethod: payMap[r.OrderNumber]?.paymentMethod || '—' });
    }
  });

  // Tab: income
  const incomeByDay = {};
  completedOrders.forEach(o => {
    const day = dayStr(o.timestamp);
    if (!incomeByDay[day]) incomeByDay[day] = { day, total: 0, cash: 0, transfer: 0, card: 0, other: 0, count: 0 };
    incomeByDay[day].total += o.total; incomeByDay[day].count++;
    const m = (o.paymentMethod || '').toLowerCase();
    if (m.includes('สด') || m === 'cash')                                   incomeByDay[day].cash     += o.total;
    else if (m.includes('โอน') || m.includes('qr') || m === 'transfer')     incomeByDay[day].transfer += o.total;
    else if (m.includes('บัตร') || m === 'card')                            incomeByDay[day].card     += o.total;
    else                                                                      incomeByDay[day].other    += o.total;
  });
  const incomeRows  = Object.values(incomeByDay).sort((a, b) => b.day.localeCompare(a.day));
  const totalSales  = incomeRows.reduce((s, r) => s + r.total, 0);
  const totalCash   = incomeRows.reduce((s, r) => s + r.cash, 0);
  const totalXfer   = incomeRows.reduce((s, r) => s + r.transfer, 0);
  const totalCard   = incomeRows.reduce((s, r) => s + r.card, 0);
  const totalBills  = incomeRows.reduce((s, r) => s + r.count, 0);

  // Tab: menu
  const menuMap = {};
  (data?.orders || []).forEach(r => {
    if (!r.ItemDetail || String(r.ItemDetail).startsWith('↳') || r.Status === 'cancelled') return;
    const key = String(r.ItemDetail).replace(/\s*\(x\d+\)$/, '').trim();
    if (!menuMap[key]) menuMap[key] = { name: key, qty: 0, revenue: 0 };
    menuMap[key].qty++; menuMap[key].revenue += Number(r.Price) || 0;
  });
  const menuRows = Object.values(menuMap).sort((a, b) => b.revenue - a.revenue);

  // ─── Export handlers ─────────────────────────────────────
  const exportIncome = () => {
    const rows = incomeRows.map(r => [r.day, r.total, r.cash, r.transfer, r.card, r.other, r.count]);
    exportXLSX([{ name: 'รายรับ-รายจ่าย', headers: ['วันที่','รายรับรวม','เงินสด','โอน/QR','บัตร','อื่นๆ','จำนวนบิล'], rows }], `รายรับ-รายจ่าย_${from}_${to}`);
  };
  const exportMenu = () => {
    const rows = menuRows.map((r, i) => [i + 1, r.name, r.qty, r.revenue]);
    exportXLSX([{ name: 'ยอดขายตามเมนู', headers: ['อันดับ','ชื่อเมนู','จำนวน (ครั้ง)','รายได้รวม (บาท)'], rows }], `ยอดขายตามเมนู_${from}_${to}`);
  };
  const exportHistory = () => {
    const rows = completedOrders.map(o => [fmtD(o.timestamp), o.orderNumber, o.customerName, o.total, o.paymentMethod, o.staff]);
    exportXLSX([{ name: 'ประวัติการขาย', headers: ['วันเวลา','เลขบิล','โต๊ะ','ยอดรวม','ชำระด้วย','พนักงาน'], rows }], `ประวัติการขาย_${from}_${to}`);
  };
  const exportCancel = () => {
    const rows = cancelledOrders.map(o => [fmtD(o.Timestamp), o.OrderNumber, o.CustomerName, o.TotalAmount, o.RecordedBy || '—']);
    exportXLSX([{ name: 'ประวัติยกเลิก', headers: ['วันเวลา','เลขบิล','โต๊ะ','ยอดรวม','พนักงาน'], rows }], `ประวัติยกเลิก_${from}_${to}`);
  };
  const exportShift = () => {
    const rows = (data?.shifts || []).map(s => {
      const diff = s.status === 'closed' ? (Number(s.closeCash) || 0) - (Number(s.openCash) || 0) - (Number(s.totalCash) || 0) : '';
      return [s.id, s.status === 'open' ? 'เปิดอยู่' : 'ปิดแล้ว', fmtD(s.openTime), s.openStaff, fmtD(s.closeTime), s.closeStaff, s.openCash, s.closeCash, s.totalSales, s.totalCash, s.totalTransfer, s.totalCard, s.totalOrders, diff, s.note || ''];
    });
    exportXLSX([{ name: 'รายงานปิดกะ', headers: ['รหัสกะ','สถานะ','เวลาเปิด','พนักงานเปิด','เวลาปิด','พนักงานปิด','เงินเปิดกะ','เงินปิดกะ','ยอดขายรวม','เงินสด','โอน/QR','บัตร','จำนวนบิล','ส่วนต่างเงินสด','หมายเหตุ'], rows }], `รายงานปิดกะ_${from}_${to}`);
  };

  const exportAll = () => {
    exportXLSX([
      { name: 'รายรับ-รายจ่าย',  headers: ['วันที่','รายรับรวม','เงินสด','โอน/QR','บัตร','อื่นๆ','จำนวนบิล'],            rows: incomeRows.map(r => [r.day, r.total, r.cash, r.transfer, r.card, r.other, r.count]) },
      { name: 'ยอดขายตามเมนู',    headers: ['อันดับ','ชื่อเมนู','จำนวน (ครั้ง)','รายได้รวม (บาท)'],                        rows: menuRows.map((r, i) => [i + 1, r.name, r.qty, r.revenue]) },
      { name: 'ประวัติการขาย',     headers: ['วันเวลา','เลขบิล','โต๊ะ','ยอดรวม','ชำระด้วย','พนักงาน'],                      rows: completedOrders.map(o => [fmtD(o.timestamp), o.orderNumber, o.customerName, o.total, o.paymentMethod, o.staff]) },
      { name: 'ประวัติยกเลิก',     headers: ['วันเวลา','เลขบิล','โต๊ะ','ยอดรวม','พนักงาน'],                                 rows: cancelledOrders.map(o => [fmtD(o.Timestamp), o.OrderNumber, o.CustomerName, o.TotalAmount, o.RecordedBy || '—']) },
      { name: 'รายงานปิดกะ',       headers: ['รหัสกะ','สถานะ','เวลาเปิด','พนักงานเปิด','เวลาปิด','พนักงานปิด','เงินเปิดกะ','เงินปิดกะ','ยอดขายรวม','เงินสด','โอน/QR','บัตร','จำนวนบิล','ส่วนต่างเงินสด','หมายเหตุ'],
        rows: (data?.shifts || []).map(s => { const d = s.status==='closed'?(Number(s.closeCash)||0)-(Number(s.openCash)||0)-(Number(s.totalCash)||0):''; return [s.id, s.status==='open'?'เปิดอยู่':'ปิดแล้ว', fmtD(s.openTime), s.openStaff, fmtD(s.closeTime), s.closeStaff, s.openCash, s.closeCash, s.totalSales, s.totalCash, s.totalTransfer, s.totalCard, s.totalOrders, d, s.note||'']; }) },
    ], `รายงานทั้งหมด_${from}_${to}`);
  };

  const TAB_EXPORT = { income: exportIncome, menu: exportMenu, history: exportHistory, cancel: exportCancel, shift: exportShift };

  return (
    <div style={{ color: 'white', fontFamily: 'inherit' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={26} color="#a78bfa" /> รายงาน
          </h1>
          <p style={{ margin: '0.3rem 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>วิเคราะห์ยอดขายและกิจกรรมร้าน</p>
        </div>
        {data && (
          <button onClick={exportAll} style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, color: '#22c55e', cursor: 'pointer', padding: '0.6rem 1.1rem', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export ทั้งหมด (.csv)
          </button>
        )}
      </div>

      {/* Date filter */}
      <div style={{ ...card, marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }} style={{ padding: '0.35rem 0.8rem', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', background: from === p.from && to === p.to ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', borderColor: from === p.from && to === p.to ? '#7c3aed' : 'rgba(255,255,255,0.12)', color: from === p.from && to === p.to ? '#a78bfa' : 'rgba(255,255,255,0.6)' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'white', padding: '0.4rem 0.65rem', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'white', padding: '0.4rem 0.65rem', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none' }} />
          <button onClick={() => load(from, to)} disabled={loading} style={{ background: '#7c3aed', border: 'none', borderRadius: 8, color: 'white', cursor: loading ? 'not-allowed' : 'pointer', padding: '0.45rem 1rem', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'กำลังโหลด...' : 'โหลดข้อมูล'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.45rem 1rem', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === t.key ? 700 : 400, fontFamily: 'inherit', background: tab === t.key ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', borderColor: tab === t.key ? '#7c3aed' : 'rgba(255,255,255,0.12)', color: tab === t.key ? '#a78bfa' : 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!data && !loading && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.35)' }}>
          <BarChart2 size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p style={{ margin: 0 }}>กด <strong style={{ color: '#a78bfa' }}>โหลดข้อมูล</strong> เพื่อดูรายงาน</p>
        </div>
      )}

      {data && (
        <>
          {/* Export button per tab */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <button onClick={TAB_EXPORT[tab]} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, color: '#22c55e', cursor: 'pointer', padding: '0.4rem 0.9rem', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={14} /> Export แท็บนี้ (.csv)
            </button>
          </div>

          {/* ── Tab: รายรับ-รายจ่าย ── */}
          {tab === 'income' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'รายรับรวม',  value: `฿${fmt(totalSales)}`,  color: '#a78bfa' },
                  { label: 'เงินสด',      value: `฿${fmt(totalCash)}`,   color: '#22c55e' },
                  { label: 'โอน / QR',    value: `฿${fmt(totalXfer)}`,   color: '#38bdf8' },
                  { label: 'บัตรเครดิต', value: `฿${fmt(totalCard)}`,   color: '#f97316' },
                  { label: 'จำนวนบิล',   value: `${totalBills} บิล`,    color: 'white'   },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ ...card, textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginBottom: 6 }}>{label}</div>
                    <div style={{ color, fontWeight: 800, fontSize: '1.3rem' }}>{value}</div>
                  </div>
                ))}
              </div>
              <TableWrap empty={incomeRows.length === 0} headers={['วันที่','รายรับรวม','เงินสด','โอน/QR','บัตร','อื่นๆ','จำนวนบิล']}>
                {incomeRows.map((r, i) => (
                  <tr key={i}>
                    <Td>{r.day}</Td>
                    <Td bold color="#a78bfa">฿{fmt(r.total)}</Td>
                    <Td color="#22c55e">฿{fmt(r.cash)}</Td>
                    <Td color="#38bdf8">฿{fmt(r.transfer)}</Td>
                    <Td color="#f97316">฿{fmt(r.card)}</Td>
                    <Td muted>{r.other > 0 ? `฿${fmt(r.other)}` : '—'}</Td>
                    <Td center>{r.count}</Td>
                  </tr>
                ))}
              </TableWrap>
            </div>
          )}

          {/* ── Tab: ยอดขายตามเมนู ── */}
          {tab === 'menu' && (
            <TableWrap empty={menuRows.length === 0} headers={['อันดับ','ชื่อเมนู','จำนวน (ครั้ง)','รายได้รวม']}>
              {menuRows.map((r, i) => (
                <tr key={i}>
                  <Td center color={i < 3 ? '#f97316' : undefined} bold={i < 3}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </Td>
                  <Td bold>{r.name}</Td>
                  <Td center>{r.qty}</Td>
                  <Td bold color="#a78bfa">฿{fmt(r.revenue)}</Td>
                </tr>
              ))}
            </TableWrap>
          )}

          {/* ── Tab: ประวัติการขาย ── */}
          {tab === 'history' && (
            <>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>พบ {completedOrders.length} รายการ</div>
              <TableWrap empty={completedOrders.length === 0} headers={['วันเวลา','เลขบิล','โต๊ะ','ยอดรวม','ชำระด้วย','พนักงาน']}>
                {completedOrders.map((o, i) => (
                  <tr key={i}>
                    <Td muted nowrap>{fmtD(o.timestamp)}</Td>
                    <Td bold color="#a78bfa">{o.orderNumber}</Td>
                    <Td>{o.customerName}</Td>
                    <Td bold>฿{fmt(o.total)}</Td>
                    <td style={td_}><PayBadge method={o.paymentMethod} /></td>
                    <Td muted>{o.staff || '—'}</Td>
                  </tr>
                ))}
              </TableWrap>
            </>
          )}

          {/* ── Tab: ประวัติการยกเลิก ── */}
          {tab === 'cancel' && (
            <>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>พบ {cancelledOrders.length} รายการ</div>
              <TableWrap empty={cancelledOrders.length === 0} emptyMsg="ไม่มีรายการยกเลิกในช่วงเวลานี้" headers={['วันเวลา','เลขบิล','โต๊ะ','ยอดรวม','พนักงาน']}>
                {cancelledOrders.map((o, i) => (
                  <tr key={i}>
                    <Td muted nowrap>{fmtD(o.Timestamp)}</Td>
                    <Td bold color="#ef4444">{o.OrderNumber}</Td>
                    <Td>{o.CustomerName}</Td>
                    <Td bold>฿{fmt(o.TotalAmount)}</Td>
                    <Td muted>{o.RecordedBy || '—'}</Td>
                  </tr>
                ))}
              </TableWrap>
            </>
          )}

          {/* ── Tab: รายงานปิดกะ ── */}
          {tab === 'shift' && (
            (data?.shifts || []).length === 0
              ? <div style={{ ...card, textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)' }}>ยังไม่มีประวัติการเปิด-ปิดกะ</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[...(data.shifts)].reverse().map((s, i) => {
                    const openCash_  = Number(s.openCash)  || 0;
                    const closeCash_ = Number(s.closeCash) || 0;
                    const totalCsh   = Number(s.totalCash) || 0;
                    const diff       = s.status === 'closed' ? closeCash_ - openCash_ - totalCsh : null;
                    return (
                      <div key={i} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ background: s.status === 'open' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', color: s.status === 'open' ? '#22c55e' : 'rgba(255,255,255,0.45)', border: `1px solid ${s.status === 'open' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.78rem', fontWeight: 700 }}>
                              {s.status === 'open' ? '🟢 เปิดอยู่' : '⚫ ปิดแล้ว'}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>{s.id}</span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
                            เปิด {fmtD(s.openTime)} โดย <strong style={{ color: '#22c55e' }}>{s.openStaff}</strong>
                            {s.closeTime && <> &nbsp;•&nbsp; ปิด {fmtD(s.closeTime)} โดย <strong style={{ color: '#ef4444' }}>{s.closeStaff}</strong></>}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '0.5rem' }}>
                          {[
                            { label: 'ยอดขายรวม',  value: `฿${fmt(s.totalSales)}`,   color: '#a78bfa' },
                            { label: 'จำนวนบิล',   value: `${s.totalOrders || 0} บิล`, color: 'white' },
                            { label: 'เงินสด',      value: `฿${fmt(s.totalCash)}`,    color: '#22c55e' },
                            { label: 'โอน / QR',    value: `฿${fmt(s.totalTransfer)}`,color: '#38bdf8' },
                            { label: 'บัตรเครดิต', value: `฿${fmt(s.totalCard)}`,    color: '#f97316' },
                            { label: 'เงินเปิดกะ', value: `฿${fmt(s.openCash)}`,     color: 'rgba(255,255,255,0.6)' },
                            ...(s.status === 'closed' ? [
                              { label: 'เงินปิดกะ',       value: `฿${fmt(s.closeCash)}`, color: 'rgba(255,255,255,0.6)' },
                              { label: 'ส่วนต่างเงินสด',  value: `${diff >= 0 ? '+' : ''}฿${fmt(diff)}${Math.abs(diff) < 1 ? ' ✓' : diff > 0 ? ' เกิน' : ' ขาด'}`, color: Math.abs(diff) < 1 ? '#22c55e' : '#ef4444' },
                            ] : []),
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.55rem 0.75rem' }}>
                              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginBottom: 2 }}>{label}</div>
                              <div style={{ color, fontWeight: 700, fontSize: '0.95rem' }}>{value}</div>
                            </div>
                          ))}
                        </div>
                        {s.note && <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>หมายเหตุ: {s.note}</div>}
                      </div>
                    );
                  })}
                </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Small helpers ───────────────────────────────────────────
function TableWrap({ headers, children, empty, emptyMsg = 'ไม่มีข้อมูลในช่วงเวลานี้' }) {
  if (empty) return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.35)' }}>{emptyMsg}</div>
  );
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: 'rgba(255,255,255,0.04)' }}>{headers.map(h => <th key={h} style={th_}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, color, bold, muted, center, nowrap }) {
  return (
    <td style={{ ...td_, color: color || (muted ? 'rgba(255,255,255,0.5)' : 'inherit'), fontWeight: bold ? 700 : undefined, textAlign: center ? 'center' : undefined, whiteSpace: nowrap ? 'nowrap' : undefined }}>
      {children}
    </td>
  );
}

function PayBadge({ method }) {
  if (!method || method === '—') return <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>;
  const m = method.toLowerCase();
  let c = '#a78bfa', bg = 'rgba(167,139,250,0.12)', b = 'rgba(167,139,250,0.3)';
  if (m.includes('สด') || m === 'cash')                               { c = '#22c55e'; bg = 'rgba(34,197,94,0.12)';  b = 'rgba(34,197,94,0.3)'; }
  else if (m.includes('โอน') || m.includes('qr') || m === 'transfer') { c = '#38bdf8'; bg = 'rgba(56,189,248,0.12)'; b = 'rgba(56,189,248,0.3)'; }
  else if (m.includes('บัตร') || m === 'card')                        { c = '#f97316'; bg = 'rgba(249,115,22,0.12)'; b = 'rgba(249,115,22,0.3)'; }
  return <span style={{ padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, background: bg, color: c, border: `1px solid ${b}` }}>{method}</span>;
}
