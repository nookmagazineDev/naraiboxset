import React, { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Download, Calendar, TrendingUp, BarChart2, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwEGa7KC8W8FiQutWl84FL3XyaHUni23zgFET3q7ATSpBTzftfNX7ILvbEYbG134KAl/exec';

const getThaiTodayStr = () => {
  const d = new Date();
  const options = { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
  const p = {};
  parts.forEach(part => p[part.type] = part.value);
  return `${p.year}-${p.month}-${p.day}`;
};

const SalesSummaryModal = ({ lang = 'th', onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  
  const todayStr = getThaiTodayStr();

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${GAS_URL}?action=getReportData&from=${todayStr}&to=${todayStr}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(lang === 'th' ? 'โหลดข้อมูลยอดขายล้มเหลว' : 'Failed to load report');
      }
    } catch (err) {
      setError(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : 'Connection error');
    }
    setLoading(false);
  }, [todayStr, lang]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Calculations
  const payMap = {};
  (data?.payments || []).forEach(p => { payMap[p.orderNumber] = p; });

  const orderMap = {};
  (data?.orders || []).forEach(r => {
    if (!r.OrderNumber || r.Status === 'cancelled') return;
    if (!orderMap[r.OrderNumber]) {
      orderMap[r.OrderNumber] = {
        orderNumber: r.OrderNumber,
        total: Number(r.TotalAmount) || 0,
        timestamp: r.Timestamp,
        status: r.Status,
        paymentMethod: payMap[r.OrderNumber]?.paymentMethod || '—',
        splitDetail: payMap[r.OrderNumber]?.splitDetail || null
      };
    }
  });

  const completedOrders = Object.values(orderMap).filter(o => ['completed','Completed'].includes(o.status));

  // Income summary
  let totalSales = 0;
  let totalCash = 0;
  let totalXfer = 0;
  let totalCard = 0;
  let totalBills = completedOrders.length;

  completedOrders.forEach(o => {
    totalSales += o.total;
    const sd = o.splitDetail && typeof o.splitDetail === 'object' ? o.splitDetail : null;
    if (sd) {
      totalCash += Number(sd.cash) || 0;
      totalXfer += Number(sd.transfer) || 0;
      totalCard += Number(sd.card) || 0;
    } else {
      const m = (o.paymentMethod || '').toLowerCase();
      if (m.includes('สด') || m === 'cash') totalCash += o.total;
      else if (m.includes('โอน') || m.includes('qr') || m === 'transfer') totalXfer += o.total;
      else if (m.includes('บัตร') || m === 'card') totalCard += o.total;
      else totalCash += o.total;
    }
  });

  // Menu breakdown
  const menuMap = {};
  (data?.orders || []).forEach(r => {
    if (!r.ItemDetail || String(r.ItemDetail).startsWith('↳') || r.Status === 'cancelled') return;
    const detail = String(r.ItemDetail).trim();
    let qty = 1;
    let name = detail;
    const match = detail.match(/(.*?)\s*\(x(\d+)\)$/);
    if (match) {
      name = match[1].trim();
      qty = parseInt(match[2], 10) || 1;
    }
    if (!menuMap[name]) menuMap[name] = { name, qty: 0, revenue: 0 };
    menuMap[name].qty += qty;
    menuMap[name].revenue += Number(r.Price) || 0;
  });
  const menuRows = Object.values(menuMap).sort((a, b) => b.qty - a.qty);

  const handleDownloadImage = () => {
    const element = document.getElementById('sales-report-card-capture');
    if (!element) return;
    
    // Show capture feedback
    const btn = document.getElementById('capture-btn');
    if (btn) btn.innerText = lang === 'th' ? '📸 กำลังบันทึก...' : '📸 Capturing...';

    html2canvas(element, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `sales_report_${todayStr}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (btn) btn.innerText = lang === 'th' ? '💾 บันทึกรูปภาพสำเร็จ' : '💾 Saved Successfully';
      setTimeout(() => {
        if (btn) btn.innerText = lang === 'th' ? '💾 บันทึกภาพสรุป (PNG)' : '💾 Save as PNG';
      }, 2000);
    }).catch(err => {
      console.error(err);
      if (btn) btn.innerText = lang === 'th' ? '❌ เกิดข้อผิดพลาด' : '❌ Error';
    });
  };

  const fmt = (n) => (Number(n) || 0).toLocaleString('th-TH');

  const cardStyle = {
    background: '#16162a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    color: 'white'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={22} /> {lang === 'th' ? 'สรุปยอดขายประจำวัน' : 'Daily Sales Summary'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={loadReport} disabled={loading} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: 'white', padding: '0.4rem', cursor: 'pointer', display: 'flex' }}>
              <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.5)' }}>
              <RefreshCw size={32} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }} />
              <span>{lang === 'th' ? 'กำลังดึงรายงานข้อมูลยอดขายล่าสุด...' : 'Fetching latest sales report...'}</span>
            </div>
          ) : error ? (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '1rem', color: '#ef4444', textAlign: 'center' }}>
              {error}
            </div>
          ) : (
            <div id="sales-report-card-capture" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: '#0f0f1e', borderRadius: '12px' }}>
              
              {/* Report Title Banner */}
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>NaraiBoxset</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {lang === 'th' ? 'ยอดขายของวันที่' : 'Report for'} {new Date(todayStr).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              </div>

              {/* Total sales & bills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ ...cardStyle, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(250,204,21,0.7)', fontWeight: 700, marginBottom: '2px' }}>💰 ยอดขายทั้งหมด</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24' }}>฿{fmt(totalSales)}</div>
                </div>
                <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.04)', textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '2px' }}>🧾 จำนวนบิล</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white' }}>{totalBills} บิล</div>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={cardStyle}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem', color: 'rgba(255,255,255,0.7)' }}>
                  💳 ช่องทางการชำระเงิน
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { label: '💵 เงินสด (Cash)', value: totalCash, color: '#22c55e' },
                    { label: '📱 เงินโอน / QR (Transfer)', value: totalXfer, color: '#38bdf8' },
                    { label: '💳 บัตรเครดิต (Card)', value: totalCard, color: '#f97316' }
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.55)' }}>{row.label}</span>
                      <strong style={{ color: row.color }}>฿{fmt(row.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Menu items sold */}
              <div style={cardStyle}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem', color: 'rgba(255,255,255,0.7)' }}>
                  🍲 ยอดขายรายเมนู (ไม่รวมแอดออน/ป๊อปอัพ)
                </h4>
                {menuRows.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '1rem', fontSize: '0.85rem' }}>
                    {lang === 'th' ? 'ไม่มีรายการขายในวันนี้' : 'No sales recorded today'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {menuRows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', minWidth: 0 }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 'bold' }}>{i + 1}.</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{r.qty} {lang === 'th' ? 'จาน' : 'qty'}</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)', minWidth: '55px', textAlign: 'right' }}>฿{fmt(r.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
          <button id="capture-btn" onClick={handleDownloadImage} disabled={loading || !data} style={{ flex: 2, padding: '0.75rem', background: 'var(--accent)', border: 'none', color: 'white', borderRadius: '10px', cursor: (loading || !data) ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(250,204,21,0.25)' }}>
            <Download size={16} /> {lang === 'th' ? 'บันทึกภาพสรุป (PNG)' : 'Save as PNG'}
          </button>
        </div>

      </div>
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SalesSummaryModal;
