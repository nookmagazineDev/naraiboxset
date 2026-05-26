import React, { useState, useCallback } from 'react';
import { BarChart2, TrendingUp, Receipt, XCircle, Clock, RefreshCw, ChevronDown } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzxzhnOhSPWssbEfRVG8doa4G4fQ_98B9_Kog34gguPrG7fgbY5gPnuvTIoneJcmdKgrA/exec';

const TABS = [
  { key: 'income',   label: 'รายรับ-รายจ่าย',    icon: <TrendingUp size={16} /> },
  { key: 'menu',     label: 'ยอดขายตามเมนู',       icon: <BarChart2  size={16} /> },
  { key: 'history',  label: 'ประวัติการขาย',        icon: <Receipt    size={16} /> },
  { key: 'cancel',   label: 'ประวัติการยกเลิก',     icon: <XCircle   size={16} /> },
  { key: 'shift',    label: 'รายงานปิดกะ',          icon: <Clock     size={16} /> },
];

const TODAY = new Date().toISOString().slice(0, 10);
const D7    = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

const fmt  = (n) => (Number(n) || 0).toLocaleString('th-TH');
const fmtD = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return ts; }
};
const dayStr = (ts) => {
  if (!ts) return '';
  try { return new Date(ts).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return ts; }
};

const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.25rem' };
const thStyle   = { padding: '0.65rem 0.9rem', textAlign: 'left', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' };
const tdStyle   = { padding: '0.65rem 0.9rem', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.04)' };

const PRESET_RANGES = [
  { label: 'วันนี้', from: TODAY, to: TODAY },
  { label: '7 วัน',  from: D7,    to: TODAY },
  { label: '30 วัน', from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), to: TODAY },
  { label: 'เดือนนี้', from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: TODAY },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('income');
  const [from, setFrom]           = useState(D7);
  const [to, setTo]               = useState(TODAY);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState(null); // { orders, payments, shifts }
  const [error, setError]         = useState('');

  const loadData = useCallback(async (f, t) => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${GAS_URL}?action=getReportData&from=${f}&to=${t}`);
      const json = await res.json();
      if (json.success) setData(json);
      else setError('โหลดข้อมูลไม่สำเร็จ');
    } catch (e) {
      setError('เชื่อมต่อ GAS ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ');
    }
    setLoading(false);
  }, []);

  const handleLoad = () => loadData(from, to);

  // ─── Derived data ───────────────────────────────────────────

  // Payment method map (orderNumber → method)
  const payMap = {};
  (data?.payments || []).forEach(p => { payMap[p.orderNumber] = p; });

  // Unique completed orders (by orderNumber, using TotalAmount from first occurrence)
  const orderMap = {};
  (data?.orders || []).forEach(r => {
    if (!r.OrderNumber || r.Status === 'cancelled') return;
    if (!orderMap[r.OrderNumber]) {
      orderMap[r.OrderNumber] = {
        orderNumber: r.OrderNumber,
        customerName: r.CustomerName,
        tableNo:  r.Address || '',
        total:    Number(r.TotalAmount) || 0,
        timestamp: r.Timestamp,
        status:   r.Status,
        items:    [],
        paymentMethod: payMap[r.OrderNumber]?.paymentMethod || '—',
        staff: r.RecordedBy || '',
      };
    }
    if (!String(r.ItemDetail || '').startsWith('↳')) {
      orderMap[r.OrderNumber].items.push({ name: r.ItemDetail, price: Number(r.Price) || 0 });
    }
  });
  const completedOrders = Object.values(orderMap).filter(o => o.status === 'Completed' || o.status === 'completed');
  const cancelledOrders = (data?.orders || []).filter(r => r.Status === 'cancelled' && r.OrderNumber && !String(r.ItemDetail || '').startsWith('↳'))
    .reduce((acc, r) => {
      if (!acc.find(x => x.OrderNumber === r.OrderNumber))
        acc.push({ ...r, paymentMethod: payMap[r.OrderNumber]?.paymentMethod || '—' });
      return acc;
    }, []);

  // ── Tab: income — group by day ──────────────────────────────
  const incomeByDay = {};
  completedOrders.forEach(o => {
    const day = dayStr(o.timestamp);
    if (!incomeByDay[day]) incomeByDay[day] = { day, total: 0, cash: 0, transfer: 0, card: 0, other: 0, count: 0 };
    incomeByDay[day].total += o.total;
    incomeByDay[day].count += 1;
    const m = (o.paymentMethod || '').toLowerCase();
    if (m.includes('สด') || m === 'cash')                         incomeByDay[day].cash     += o.total;
    else if (m.includes('โอน') || m.includes('qr') || m === 'transfer') incomeByDay[day].transfer += o.total;
    else if (m.includes('บัตร') || m === 'card')                  incomeByDay[day].card     += o.total;
    else                                                            incomeByDay[day].other    += o.total;
  });
  const incomeRows = Object.values(incomeByDay).sort((a, b) => b.day.localeCompare(a.day));
  const totalIncome    = incomeRows.reduce((s, r) => s + r.total, 0);
  const totalCash      = incomeRows.reduce((s, r) => s + r.cash, 0);
  const totalTransfer  = incomeRows.reduce((s, r) => s + r.transfer, 0);
  const totalCard      = incomeRows.reduce((s, r) => s + r.card, 0);
  const totalBillCount = incomeRows.reduce((s, r) => s + r.count, 0);

  // ── Tab: menu — top items ───────────────────────────────────
  const menuMap = {};
  (data?.orders || []).forEach(r => {
    if (!r.ItemDetail || String(r.ItemDetail).startsWith('↳') || r.Status === 'cancelled') return;
    const key = String(r.ItemDetail).replace(/\s*\(x\d+\)$/, '').trim();
    if (!menuMap[key]) menuMap[key] = { name: key, qty: 0, revenue: 0 };
    menuMap[key].qty     += 1;
    menuMap[key].revenue += Number(r.Price) || 0;
  });
  const menuRows = Object.values(menuMap).sort((a, b) => b.revenue - a.revenue);

  return (
    <div style={{ color: 'white', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={26} color="#a78bfa" /> รายงาน
        </h1>
        <p style={{ margin: '0.3rem 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>วิเคราะห์ยอดขายและกิจกรรมร้าน</p>
      </div>

      {/* Date filter */}
      <div style={{ ...cardStyle, marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {PRESET_RANGES.map(p => (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }} style={{ padding: '0.35rem 0.8rem', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', background: from === p.from && to === p.to ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', borderColor: from === p.from && to === p.to ? '#7c3aed' : 'rgba(255,255,255,0.12)', color: from === p.from && to === p.to ? '#a78bfa' : 'rgba(255,255,255,0.6)', fontFamily: 'inherit' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'white', padding: '0.4rem 0.65rem', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'white', padding: '0.4rem 0.65rem', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none' }} />
          <button onClick={handleLoad} disabled={loading} style={{ background: '#7c3aed', border: 'none', borderRadius: 8, color: 'white', cursor: loading ? 'not-allowed' : 'pointer', padding: '0.45rem 1rem', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'กำลังโหลด...' : 'โหลดข้อมูล'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '0.45rem 1rem', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: '0.85rem', fontWeight: activeTab === t.key ? 700 : 400, background: activeTab === t.key ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', borderColor: activeTab === t.key ? '#7c3aed' : 'rgba(255,255,255,0.12)', color: activeTab === t.key ? '#a78bfa' : 'rgba(255,255,255,0.6)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {!data && !loading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.35)' }}>
          <BarChart2 size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p style={{ margin: 0 }}>กด <strong style={{ color: '#a78bfa' }}>โหลดข้อมูล</strong> เพื่อดูรายงาน</p>
        </div>
      )}

      {data && (
        <>
          {/* ─── Tab: รายรับ-รายจ่าย ─── */}
          {activeTab === 'income' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'รายรับรวม',   value: `฿${fmt(totalIncome)}`,   color: '#a78bfa' },
                  { label: 'เงินสด',       value: `฿${fmt(totalCash)}`,     color: '#22c55e' },
                  { label: 'โอน / QR',     value: `฿${fmt(totalTransfer)}`, color: '#38bdf8' },
                  { label: 'บัตรเครดิต',  value: `฿${fmt(totalCard)}`,     color: '#f97316' },
                  { label: 'จำนวนบิล',    value: `${totalBillCount} บิล`,   color: 'white' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ ...cardStyle, textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginBottom: 6 }}>{label}</div>
                    <div style={{ color, fontWeight: 800, fontSize: '1.3rem' }}>{value}</div>
                  </div>
                ))}
              </div>
              {incomeRows.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)' }}>ไม่มีข้อมูลในช่วงเวลานี้</div>
              ) : (
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['วันที่', 'รายรับรวม', 'เงินสด', 'โอน/QR', 'บัตร', 'อื่นๆ', 'จำนวนบิล'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {incomeRows.map((r, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{r.day}</td>
                          <td style={{ ...tdStyle, color: '#a78bfa', fontWeight: 700 }}>฿{fmt(r.total)}</td>
                          <td style={{ ...tdStyle, color: '#22c55e' }}>฿{fmt(r.cash)}</td>
                          <td style={{ ...tdStyle, color: '#38bdf8' }}>฿{fmt(r.transfer)}</td>
                          <td style={{ ...tdStyle, color: '#f97316' }}>฿{fmt(r.card)}</td>
                          <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)' }}>{r.other > 0 ? `฿${fmt(r.other)}` : '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: ยอดขายตามเมนู ─── */}
          {activeTab === 'menu' && (
            <div>
              {menuRows.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)' }}>ไม่มีข้อมูลในช่วงเวลานี้</div>
              ) : (
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['อันดับ', 'ชื่อเมนู', 'จำนวน (ครั้ง)', 'รายได้รวม'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {menuRows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ ...tdStyle, color: i < 3 ? '#f97316' : 'rgba(255,255,255,0.4)', fontWeight: 700, width: 60, textAlign: 'center' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{r.name}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{r.qty}</td>
                          <td style={{ ...tdStyle, color: '#a78bfa', fontWeight: 700 }}>฿{fmt(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: ประวัติการขาย ─── */}
          {activeTab === 'history' && (
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                พบ {completedOrders.length} รายการ
              </div>
              {completedOrders.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)' }}>ไม่มีข้อมูลในช่วงเวลานี้</div>
              ) : (
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['วันเวลา', 'เลขบิล', 'โต๊ะ', 'ยอดรวม', 'ชำระด้วย', 'พนักงาน'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[...completedOrders].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((o, i) => (
                        <tr key={i}>
                          <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{fmtD(o.timestamp)}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#a78bfa' }}>{o.orderNumber}</td>
                          <td style={tdStyle}>{o.customerName}</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>฿{fmt(o.total)}</td>
                          <td style={tdStyle}>
                            <PayMethodBadge method={o.paymentMethod} />
                          </td>
                          <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)' }}>{o.staff || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: ประวัติการยกเลิก ─── */}
          {activeTab === 'cancel' && (
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                พบ {cancelledOrders.length} รายการ
              </div>
              {cancelledOrders.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)' }}>ไม่มีรายการยกเลิกในช่วงเวลานี้</div>
              ) : (
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['วันเวลา', 'เลขบิล', 'โต๊ะ', 'ยอดรวม', 'พนักงาน'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {cancelledOrders.map((o, i) => (
                        <tr key={i}>
                          <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{fmtD(o.Timestamp)}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#ef4444' }}>{o.OrderNumber}</td>
                          <td style={tdStyle}>{o.CustomerName}</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>฿{fmt(o.TotalAmount)}</td>
                          <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)' }}>{o.RecordedBy || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: รายงานปิดกะ ─── */}
          {activeTab === 'shift' && (
            <div>
              {(data.shifts || []).length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)' }}>ยังไม่มีประวัติการเปิด-ปิดกะ</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[...data.shifts].reverse().map((s, i) => {
                    const openCash    = Number(s.openCash)    || 0;
                    const closeCash   = Number(s.closeCash)   || 0;
                    const totalCash_  = Number(s.totalCash)   || 0;
                    const cashDiff    = s.status === 'closed' ? closeCash - openCash - totalCash_ : null;
                    return (
                      <div key={i} style={{ ...cardStyle }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.9rem' }}>
                          <div>
                            <span style={{ background: s.status === 'open' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', color: s.status === 'open' ? '#22c55e' : 'rgba(255,255,255,0.5)', border: `1px solid ${s.status === 'open' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, marginRight: '0.6rem' }}>
                              {s.status === 'open' ? '🟢 เปิดอยู่' : '⚫ ปิดแล้ว'}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>{s.id}</span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
                            เปิด {fmtD(s.openTime)} โดย <strong style={{ color: '#22c55e' }}>{s.openStaff}</strong>
                            {s.closeTime && <> &nbsp;•&nbsp; ปิด {fmtD(s.closeTime)} โดย <strong style={{ color: '#ef4444' }}>{s.closeStaff}</strong></>}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                          {[
                            { label: 'ยอดขายรวม',   value: `฿${fmt(s.totalSales)}`,   color: '#a78bfa' },
                            { label: 'จำนวนบิล',    value: `${s.totalOrders || 0} บิล`, color: 'white' },
                            { label: 'เงินสด',       value: `฿${fmt(s.totalCash)}`,    color: '#22c55e' },
                            { label: 'โอน / QR',     value: `฿${fmt(s.totalTransfer)}`,color: '#38bdf8' },
                            { label: 'บัตรเครดิต',  value: `฿${fmt(s.totalCard)}`,    color: '#f97316' },
                            { label: 'เงินเปิดกะ',  value: `฿${fmt(s.openCash)}`,     color: 'rgba(255,255,255,0.6)' },
                            ...(s.status === 'closed' ? [
                              { label: 'เงินปิดกะ',  value: `฿${fmt(s.closeCash)}`,  color: 'rgba(255,255,255,0.6)' },
                              { label: 'ส่วนต่างเงินสด', value: `${cashDiff >= 0 ? '+' : ''}฿${fmt(cashDiff)}${Math.abs(cashDiff) < 1 ? ' ✓' : cashDiff > 0 ? ' เกิน' : ' ขาด'}`, color: Math.abs(cashDiff) < 1 ? '#22c55e' : '#ef4444' },
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
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PayMethodBadge({ method }) {
  if (!method || method === '—') return <span style={{ color: 'rgba(255,255,255,0.35)' }}>—</span>;
  const m = method.toLowerCase();
  let color = '#a78bfa', bg = 'rgba(167,139,250,0.12)', border = 'rgba(167,139,250,0.3)';
  if (m.includes('สด') || m === 'cash') { color = '#22c55e'; bg = 'rgba(34,197,94,0.12)'; border = 'rgba(34,197,94,0.3)'; }
  else if (m.includes('โอน') || m.includes('qr')) { color = '#38bdf8'; bg = 'rgba(56,189,248,0.12)'; border = 'rgba(56,189,248,0.3)'; }
  else if (m.includes('บัตร') || m === 'card') { color = '#f97316'; bg = 'rgba(249,115,22,0.12)'; border = 'rgba(249,115,22,0.3)'; }
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, background: bg, color, border: `1px solid ${border}` }}>
      {method}
    </span>
  );
}
