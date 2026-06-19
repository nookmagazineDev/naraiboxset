import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, RefreshCw, Download, Calendar, TrendingUp, BarChart2, CheckCircle, Search, ArrowLeft, ChevronRight, Receipt, CreditCard, FileSpreadsheet } from 'lucide-react';
import html2canvas from 'html2canvas';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwEGa7KC8W8FiQutWl84FL3XyaHUni23zgFET3q7ATSpBTzftfNX7ILvbEYbG134KAl/exec';

// Time helpers in Thai Timezone
const getThaiTodayStr = () => {
  const d = new Date();
  const options = { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
  const p = {};
  parts.forEach(part => p[part.type] = part.value);
  return `${p.year}-${p.month}-${p.day}`;
};

const getThaiPastDateStr = (daysAgo) => {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const options = { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
  const p = {};
  parts.forEach(part => p[part.type] = part.value);
  return `${p.year}-${p.month}-${p.day}`;
};

const getThaiMonthStartStr = () => {
  const d = new Date();
  const options = { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
  const p = {};
  parts.forEach(part => p[part.type] = part.value);
  return `${p.year}-${p.month}-01`;
};

const parseItemQty = (detail) => {
  const s = String(detail).trim();
  let qty = 1;
  let name = s;
  
  const match = s.match(/(.*?)\s*[\(\[]\s*x?\s*(\d+)\s*[\)\]]$/i) ||
                s.match(/(.*?)\s*[xX*×]\s*(\d+)$/);
                
  if (match) {
    name = match[1].trim();
    qty = parseInt(match[2], 10) || 1;
  }
  return { name, qty };
};

const SalesSummaryModal = ({ lang = 'th', initialMode = 'daily', allMenu = [], onClose }) => {
  const todayStr = getThaiTodayStr();
  
  // Date States
  const [from, setFrom] = useState(() => {
    if (initialMode === 'range') {
      return getThaiPastDateStr(6); // Default to last 7 days for range mode
    }
    return todayStr;
  });
  const [to, setTo] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  
  // Navigation States
  const [view, setView] = useState('summary'); // 'summary' | 'bills' | 'drilldown'
  const [searchQuery, setSearchQuery] = useState('');
  const [drilldownItem, setDrilldownItem] = useState(null);

  const loadReport = useCallback(async (fromDate = from, toDate = to) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${GAS_URL}?action=getReportData&from=${fromDate}&to=${toDate}`);
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
  }, [from, to, lang]);

  useEffect(() => {
    loadReport();
  }, []);

  // Set up Price names to ignore from options string
  const priceNames = useMemo(() => {
    const set = new Set(['ปกติ', 'ทั่วไป', 'ราคาปกติ', 'ราคาพิเศษ', 'พนักงาน', 'จัดส่ง']);
    (allMenu || []).forEach(item => {
      if (Array.isArray(item.prices)) {
        item.prices.forEach(p => {
          if (p.name) set.add(p.name.trim());
        });
      }
    });
    return set;
  }, [allMenu]);

  // Group Payments by orderNumber
  const payMap = useMemo(() => {
    const map = {};
    (data?.payments || []).forEach(p => { map[p.orderNumber] = p; });
    return map;
  }, [data]);

  // Process Bills & Group items inside bills
  const bills = useMemo(() => {
    const billMap = {};
    (data?.orders || []).forEach(r => {
      if (!r.OrderNumber || r.Status === 'cancelled') return;
      
      if (!billMap[r.OrderNumber]) {
        billMap[r.OrderNumber] = {
          orderNumber: r.OrderNumber,
          customerName: r.CustomerName || 'ไม่ระบุ',
          total: Number(r.TotalAmount) || 0,
          timestamp: r.Timestamp,
          status: r.Status,
          paymentMethod: payMap[r.OrderNumber]?.paymentMethod || '—',
          splitDetail: payMap[r.OrderNumber]?.splitDetail || null,
          items: []
        };
      }

      const isSubItem = typeof r.ItemDetail === 'string' && r.ItemDetail.trim().startsWith('↳');
      if (isSubItem && billMap[r.OrderNumber].items.length > 0) {
        const lastItem = billMap[r.OrderNumber].items[billMap[r.OrderNumber].items.length - 1];
        if (!lastItem.subItems) lastItem.subItems = [];
        lastItem.subItems.push(r.ItemDetail);
      } else {
        const detail = String(r.ItemDetail).trim();
        let qty = 1;
        
        // 1. Check from r.Quantity
        if (r.Quantity !== undefined && r.Quantity !== null && String(r.Quantity).trim() !== '') {
          const parsedQty = parseInt(r.Quantity, 10);
          if (!isNaN(parsedQty) && parsedQty > 0) {
            qty = parsedQty;
          }
        }
        
        // 2. Parse from detail string for legacy
        const parsed = parseItemQty(detail);
        if (qty === 1 && parsed.qty > 1) {
          qty = parsed.qty;
        }
        const cleanName = parsed.name;

        billMap[r.OrderNumber].items.push({
          name: cleanName,
          qty: qty,
          price: Number(r.Price) || 0,
          subItems: []
        });
      }
    });

    return Object.values(billMap)
      .filter(b => ['completed','Completed'].includes(b.status))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [data, payMap]);

  // Calculations for Summary
  let totalSales = 0;
  let totalCash = 0;
  let totalXfer = 0;
  let totalCard = 0;
  let totalBills = bills.length;

  bills.forEach(o => {
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

  // Calculate Menu Breakdown including sub-items/popups
  const menuMap = {};
  const ordersGroupedByNum = {};
  (data?.orders || []).forEach(r => {
    if (!r.OrderNumber || r.Status === 'cancelled') return;
    if (!ordersGroupedByNum[r.OrderNumber]) ordersGroupedByNum[r.OrderNumber] = [];
    ordersGroupedByNum[r.OrderNumber].push(r);
  });

  Object.values(ordersGroupedByNum).forEach(orderRows => {
    let lastMainItemQty = 1;
    orderRows.forEach(r => {
      const isSub = String(r.ItemDetail || '').trim().startsWith('↳');
      if (!isSub) {
        // Main item
        const detail = String(r.ItemDetail).trim();
        let qty = 1;
        
        // 1. Check from r.Quantity
        if (r.Quantity !== undefined && r.Quantity !== null && String(r.Quantity).trim() !== '') {
          const parsedQty = parseInt(r.Quantity, 10);
          if (!isNaN(parsedQty) && parsedQty > 0) {
            qty = parsedQty;
          }
        }
        
        // 2. Parse from detail string for legacy
        const parsed = parseItemQty(detail);
        if (qty === 1 && parsed.qty > 1) {
          qty = parsed.qty;
        }
        const name = parsed.name;
        
        lastMainItemQty = qty;

        const rowPrice = Number(r.Price) || 0;
        const freePrefix = lang === 'th' ? 'ฟรี ' : 'Free ';
        const displayName = rowPrice > 0 ? name : (freePrefix + name);

        if (!menuMap[displayName]) {
          menuMap[displayName] = { name: displayName, qty: 0, revenue: 0, isSubItem: false };
        } else {
          menuMap[displayName].isSubItem = false;
        }
        menuMap[displayName].qty += qty;
        menuMap[displayName].revenue += rowPrice;
      } else {
        // Option/Popup sub-item
        const optionsText = String(r.ItemDetail).replace(/^↳/, '').trim();
        const parts = optionsText.split(',');
        parts.forEach(part => {
          const trimmed = part.trim();
          if (!trimmed) return;
          
          // Ignore non-food text
          if (trimmed.startsWith('ลูกค้า:') || trimmed.startsWith('ความเผ็ด:') || trimmed.includes('📝') || trimmed.startsWith('โต๊ะ')) return;
          if (['ทานที่ร้าน', 'กลับบ้าน', 'delivery', 'เดลิเวอรี่', 'dine-in', 'takeaway', 'dine in', 'take away'].includes(trimmed.toLowerCase())) return;
          if (priceNames.has(trimmed)) return;
          
          // Parse name and quantity from subitem part using parseItemQty
          const parsed = parseItemQty(trimmed);
          const name = parsed.name;
          const subQty = parsed.qty;
          
          const totalSubQty = lastMainItemQty * subQty;
          const freePrefix = lang === 'th' ? 'ฟรี ' : 'Free ';
          const displayName = freePrefix + name;
          
          if (!menuMap[displayName]) menuMap[displayName] = { name: displayName, qty: 0, revenue: 0, isSubItem: true };
          menuMap[displayName].qty += totalSubQty;
        });
      }
    });
  });

  const menuRows = Object.values(menuMap).sort((a, b) => b.qty - a.qty);
  const totalMenuRevenue = menuRows.reduce((sum, r) => sum + (r.isSubItem ? 0 : r.revenue), 0);
  const menuAdjustment = totalSales - totalMenuRevenue;

  // Filter bills by search query
  const filteredBills = useMemo(() => {
    if (!searchQuery) return bills;
    const query = searchQuery.toLowerCase().trim();
    return bills.filter(b => 
      b.orderNumber.toLowerCase().includes(query) || 
      b.customerName.toLowerCase().includes(query) ||
      b.paymentMethod.toLowerCase().includes(query)
    );
  }, [bills, searchQuery]);

  // Filter bills for a specific menu item drilldown
  const drilldownBills = useMemo(() => {
    if (!drilldownItem) return [];
    
    const freePrefix = lang === 'th' ? 'ฟรี ' : 'Free ';
    const isFreeQuery = drilldownItem.startsWith(freePrefix);
    const cleanQuery = isFreeQuery 
      ? drilldownItem.substring(freePrefix.length).toLowerCase().trim()
      : drilldownItem.toLowerCase().trim();
    
    const results = [];
    bills.forEach(bill => {
      const matchingItems = [];
      bill.items.forEach(item => {
        let isMatch = false;
        const itemCleanName = item.name.toLowerCase().trim();
        
        if (isFreeQuery) {
          // 1. Matches if it is a free main item (name matches and price is 0)
          if (itemCleanName.includes(cleanQuery) && item.price === 0) {
            isMatch = true;
          }
          // 2. Or matches if any sub-item option name matches
          if (item.subItems && item.subItems.length > 0) {
            item.subItems.forEach(sub => {
              const optionsText = sub.replace(/^↳/, '').trim();
              const parts = optionsText.split(',');
              parts.forEach(part => {
                const trimmed = part.trim();
                const parsed = parseItemQty(trimmed);
                if (parsed.name.toLowerCase().trim() === cleanQuery) {
                  isMatch = true;
                }
              });
            });
          }
        } else {
          // Paid query: matches if main item name matches and price > 0
          if (itemCleanName.includes(cleanQuery) && item.price > 0) {
            isMatch = true;
          }
        }
        
        if (isMatch) {
          matchingItems.push(item);
        }
      });
      
      if (matchingItems.length > 0) {
        results.push({
          ...bill,
          matchingItems
        });
      }
    });
    return results;
  }, [bills, drilldownItem, lang]);

  const handleMenuDrilldown = (itemName) => {
    setDrilldownItem(itemName);
    setView('drilldown');
  };

  // Date range presets helpers
  const applyPreset = (preset) => {
    let fStr = todayStr;
    let tStr = todayStr;

    if (preset === 'yesterday') {
      fStr = getThaiPastDateStr(1);
      tStr = getThaiPastDateStr(1);
    } else if (preset === '7days') {
      fStr = getThaiPastDateStr(6);
    } else if (preset === '30days') {
      fStr = getThaiPastDateStr(29);
    } else if (preset === 'thismonth') {
      fStr = getThaiMonthStartStr();
    }

    setFrom(fStr);
    setTo(tStr);
    loadReport(fStr, tStr);
  };

  const handleDownloadImage = () => {
    const element = document.getElementById('sales-report-card-capture');
    if (!element) return;
    
    const btn = document.getElementById('capture-btn');
    if (btn) btn.innerText = lang === 'th' ? '📸 กำลังบันทึก...' : '📸 Capturing...';

    html2canvas(element, {
      backgroundColor: '#0f0f1e',
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `sales_report_${from}_to_${to}.png`;
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

  const downloadExcelCSV = (headers, rows, filename) => {
    const BOM = '\uFEFF'; // UTF-8 BOM
    const csvContent = BOM + [headers, ...rows].map(row => 
      row.map(val => {
        const s = String(val ?? '');
        return (s.includes(',') || s.includes('"') || s.includes('\n'))
          ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ).join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (view === 'summary') {
      const headers = ['หัวข้อ', 'รายละเอียด', '', '', ''];
      const rows = [
        ['สรุปยอดขาย NaraiBoxset', ''],
        ['ช่วงวันที่เริ่มต้น', from],
        ['ช่วงวันที่สิ้นสุด', to],
        ['ยอดขายทั้งหมด (บาท)', totalSales],
        ['จำนวนบิลทั้งหมด', totalBills],
        ['ยอดเงินสด (บาท)', totalCash],
        ['ยอดเงินโอน (บาท)', totalXfer],
        ['ยอดบัตรเครดิต (บาท)', totalCard],
        [],
        ['ยอดขายสะสมรายเมนู'],
        ['อันดับ', 'ชื่อเมนู', 'ประเภท', 'จำนวนที่ขายได้', 'รายได้รวม (บาท)'],
        ...menuRows.map((r, i) => [
          i + 1,
          r.name,
          r.isSubItem ? 'ตัวเลือกเสริม/ชุด' : 'จานหลัก',
          r.qty,
          r.revenue
        ]),
        ...(menuAdjustment !== 0 ? [
          ['—', 'ส่วนต่าง (ส่วนลด / ภาษี / Service Charge)', 'ปรับปรุงยอด', '—', menuAdjustment]
        ] : []),
        ['—', 'รวมยอดขายสุทธิ (Grand Total)', '—', '—', totalSales]
      ];
      downloadExcelCSV(headers, rows, `สรุปยอดขาย_${from}_ถึง_${to}`);
    } else if (view === 'drilldown') {
      const headers = ['เลขที่บิล', 'ลูกค้า/โต๊ะ', 'เวลาสั่งซื้อ', 'ช่องทางชำระเงิน', 'ยอดรวมบิล (บาท)', 'จำนวนที่สั่งในบิล', 'รายละเอียดรายการทั้งหมดในบิล'];
      const rows = drilldownBills.map(bill => {
        const matchingQty = bill.matchingItems.reduce((sum, item) => sum + (item.qty || 1), 0);
        const itemsText = bill.items.map(it => {
          let text = `${it.name} (x${it.qty || 1}) - ฿${it.price}`;
          if (it.subItems && it.subItems.length > 0) {
            text += ` [ตัวเลือก: ${it.subItems.map(sub => sub.replace(/^↳/, '').trim()).join('; ')}]`;
          }
          return text;
        }).join(' | ');

        return [
          bill.orderNumber,
          bill.customerName,
          formatTimeThai(bill.timestamp),
          bill.paymentMethod,
          bill.total,
          matchingQty,
          itemsText
        ];
      });
      downloadExcelCSV(headers, rows, `ประวัติออเดอร์_${drilldownItem}_${from}_ถึง_${to}`);
    } else {
      const headers = ['เลขที่บิล', 'ลูกค้า/โต๊ะ', 'เวลาสั่งซื้อ', 'ช่องทางชำระเงิน', 'รายละเอียดการชำระเงิน', 'ยอดรวม (บาท)', 'รายการอาหาร'];
      const rows = filteredBills.map(bill => {
        let splitLabel = '';
        if (bill.splitDetail) {
          const sd = bill.splitDetail;
          const parts = [];
          if (sd.cash > 0) parts.push(`สด ฿${sd.cash}`);
          if (sd.transfer > 0) parts.push(`โอน ฿${sd.transfer}`);
          if (sd.card > 0) parts.push(`บัตร ฿${sd.card}`);
          splitLabel = parts.join(', ');
        }
        
        const itemsText = bill.items.map(it => {
          let text = `${it.name} (x${it.qty || 1}) - ฿${it.price}`;
          if (it.subItems && it.subItems.length > 0) {
            text += ` [ตัวเลือก: ${it.subItems.map(sub => sub.replace(/^↳/, '').trim()).join('; ')}]`;
          }
          return text;
        }).join(' | ');

        return [
          bill.orderNumber,
          bill.customerName,
          formatTimeThai(bill.timestamp),
          bill.paymentMethod,
          splitLabel || '—',
          bill.total,
          itemsText
        ];
      });
      downloadExcelCSV(headers, rows, `รายละเอียดบิล_${from}_ถึง_${to}`);
    }
  };

  const fmt = (n) => (Number(n) || 0).toLocaleString('th-TH');
  
  const formatDateThai = (dStr) => {
    if (!dStr) return '';
    try {
      return new Date(dStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const formatTimeThai = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '—';
    }
  };

  const cardStyle = {
    background: '#16162a',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    padding: '1.2rem',
    color: 'white'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart2 size={24} /> {view === 'summary' ? (lang === 'th' ? 'สรุปยอดขายร้าน' : 'Sales Summary') : (lang === 'th' ? 'รายละเอียดบิลทั้งหมด' : 'All Bills Details')}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => loadReport(from, to)} disabled={loading} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: 'white', padding: '0.45rem', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}>
              <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Date Selector and Filter Panel */}
        {view === 'summary' && (
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Range Date Fields */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>เริ่มต้น (From)</span>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '0.4rem 0.5rem', fontSize: '0.82rem', width: '100%', outline: 'none' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)', alignSelf: 'flex-end', marginBottom: '0.5rem' }}>—</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>สิ้นสุด (To)</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '0.4rem 0.5rem', fontSize: '0.82rem', width: '100%', outline: 'none' }} />
              </div>
              <button onClick={() => loadReport(from, to)} disabled={loading} style={{ background: '#7c3aed', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', padding: '0.45rem 0.75rem', alignSelf: 'flex-end', height: '32px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {lang === 'th' ? 'ดึงรายงาน' : 'Filter'}
              </button>
            </div>

            {/* Presets Row */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
              {[
                { label: 'วันนี้', value: 'today' },
                { label: 'เมื่อวาน', value: 'yesterday' },
                { label: '7 วันล่าสุด', value: '7days' },
                { label: '30 วันล่าสุด', value: '30days' },
                { label: 'เดือนนี้', value: 'thismonth' }
              ].map(preset => (
                <button
                  key={preset.value}
                  onClick={() => applyPreset(preset.value)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '20px',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.5)' }}>
              <RefreshCw size={36} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1.25rem', color: '#c084fc' }} />
              <span style={{ fontSize: '0.9rem' }}>{lang === 'th' ? 'กำลังดึงรายงานข้อมูลยอดขายล่าสุด...' : 'Fetching latest sales report...'}</span>
            </div>
          ) : error ? (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1rem', color: '#f87171', textAlign: 'center', fontSize: '0.9rem' }}>
              {error}
            </div>
          ) : (
            <>
              {/* VIEW 1: SUMMARY DASHBOARD */}
              {view === 'summary' && (
                <div id="sales-report-card-capture" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.25rem' }}>
                  
                  {/* Report Title Banner */}
                  <div style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', letterSpacing: '0.5px' }}>NaraiBoxset</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Calendar size={13} /> 
                      {from === to ? (
                        <>วันที่ {formatDateThai(from)}</>
                      ) : (
                        <>ระหว่างวันที่ {formatDateThai(from)} ถึง {formatDateThai(to)}</>
                      )}
                    </div>
                  </div>

                  {/* Total sales & bills */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem' }}>
                    <div style={{ ...cardStyle, background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.15)', textAlign: 'center', padding: '1.1rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(250,204,21,0.8)', fontWeight: 700, marginBottom: '4px' }}>💰 ยอดขายทั้งหมด</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24' }}>฿{fmt(totalSales)}</div>
                    </div>
                    
                    <button 
                      onClick={() => setView('bills')}
                      style={{ ...cardStyle, background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.18)', textAlign: 'center', padding: '1.1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', outline: 'none', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,132,252,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(192,132,252,0.06)'}
                    >
                      <div style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        🧾 จำนวนบิลทั้งหมด <ChevronRight size={12} />
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>{totalBills} บิล</div>
                    </button>
                  </div>

                  {/* Payment Methods */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={15} /> ช่องทางการชำระเงิน
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {[
                        { label: '💵 เงินสด (Cash)', value: totalCash, color: '#22c55e' },
                        { label: '📱 เงินโอน / QR (Transfer)', value: totalXfer, color: '#38bdf8' },
                        { label: '💳 บัตรเครดิต (Card)', value: totalCard, color: '#f97316' }
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.55)' }}>{row.label}</span>
                          <strong style={{ color: row.color, fontSize: '0.95rem' }}>฿{fmt(row.value)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Menu items sold (Includes popup/set items) */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BarChart2 size={15} /> ยอดขายรวมตามเมนู (รวมของในเซ็ต & ป๊อปอัป)
                    </h4>
                    {menuRows.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '1rem', fontSize: '0.85rem' }}>
                        {lang === 'th' ? 'ไม่มีรายการขายในช่วงเวลานี้' : 'No sales recorded during this range'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                        {menuRows.map((r, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleMenuDrilldown(r.name)}
                            style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center', padding: '0.25rem 0.4rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', gap: '6px', minWidth: 0, alignItems: 'center' }}>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', minWidth: '16px' }}>{i + 1}.</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: r.isSubItem ? 'rgba(255,255,255,0.55)' : 'white' }}>
                                {r.isSubItem && <span style={{ color: '#c084fc', marginRight: '4px', fontSize: '0.78rem' }}>↳</span>}
                                {r.name}
                                {r.isSubItem && <span style={{ fontSize: '0.72rem', color: 'rgba(192,132,252,0.4)', marginLeft: '6px' }}>[เสริม/เซ็ต]</span>}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', flexShrink: 0, alignItems: 'center' }}>
                              <span style={{ color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {r.qty} {lang === 'th' ? 'รายการ' : 'qty'}
                                <ChevronRight size={12} style={{ opacity: 0.5 }} />
                              </span>
                              <span style={{ color: r.revenue === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)', minWidth: '60px', textAlign: 'right', fontSize: '0.82rem' }}>
                                {r.revenue === 0 ? '—' : `฿${fmt(r.revenue)}`}
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        {menuAdjustment !== 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', alignItems: 'center', padding: '0.35rem 0.4rem', borderTop: '1px dashed rgba(255,255,255,0.08)', marginTop: '4px' }}>
                            <div style={{ display: 'flex', gap: '6px', minWidth: 0, alignItems: 'center' }}>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>—</span>
                              <span style={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ส่วนต่าง (ส่วนลด / ภาษี / Service Charge)
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', flexShrink: 0, alignItems: 'center' }}>
                              <span style={{ color: 'rgba(255,255,255,0.3)', minWidth: '60px', textAlign: 'right' }}>—</span>
                              <span style={{ color: menuAdjustment > 0 ? '#4ade80' : '#f87171', fontWeight: 700, minWidth: '60px', textAlign: 'right' }}>
                                {menuAdjustment > 0 ? '+' : ''}฿{fmt(menuAdjustment)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center', padding: '0.45rem 0.4rem 0.25rem', borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '4px', fontWeight: 'bold' }}>
                          <span style={{ color: 'white' }}>รวมยอดขายสุทธิ (Grand Total)</span>
                          <span style={{ color: '#fbbf24', fontSize: '0.9rem' }}>฿{fmt(totalSales)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* VIEW 2: DETAILED BILLS LIST */}
              {view === 'bills' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Back button & Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <button 
                      onClick={() => setView('summary')}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: 'white', padding: '0.4rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    >
                      <ArrowLeft size={14} /> {lang === 'th' ? 'ย้อนกลับ' : 'Back'}
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginLeft: 'auto' }}>
                      พบ {filteredBills.length} บิล
                    </span>
                  </div>

                  {/* Search input inside details view */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', color: 'rgba(255,255,255,0.3)' }} />
                    <input 
                      type="text" 
                      placeholder={lang === 'th' ? 'ค้นหาเลขบิล, โต๊ะ, วิธีชำระเงิน...' : 'Search bill #, table, method...'} 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', padding: '0.55rem 0.75rem 0.55rem 2.2rem', fontSize: '0.85rem', outline: 'none' }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0.2rem' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Scrollable Bills list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '2px' }}>
                    {filteredBills.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem', fontSize: '0.85rem' }}>
                        {lang === 'th' ? 'ไม่พบข้อมูลบิล' : 'No bills found'}
                      </div>
                    ) : (
                      filteredBills.map((bill) => {
                        const payMethodLabel = bill.paymentMethod;
                        // Format split text if present
                        let splitLabel = '';
                        if (bill.splitDetail) {
                          const sd = bill.splitDetail;
                          const parts = [];
                          if (sd.cash > 0) parts.push(`สด ฿${fmt(sd.cash)}`);
                          if (sd.transfer > 0) parts.push(`โอน ฿${fmt(sd.transfer)}`);
                          if (sd.card > 0) parts.push(`บัตร ฿${fmt(sd.card)}`);
                          splitLabel = `(${parts.join(', ')})`;
                        }

                        // Determine payment badge colors
                        const m = (bill.paymentMethod || '').toLowerCase();
                        let badgeColor = '#c084fc';
                        let badgeBg = 'rgba(192,132,252,0.1)';
                        if (m.includes('สด') || m === 'cash') {
                          badgeColor = '#4ade80';
                          badgeBg = 'rgba(74,222,128,0.1)';
                        } else if (m.includes('โอน') || m.includes('qr') || m === 'transfer') {
                          badgeColor = '#38bdf8';
                          badgeBg = 'rgba(56,189,248,0.1)';
                        } else if (m.includes('บัตร') || m === 'card') {
                          badgeColor = '#fb923c';
                          badgeBg = 'rgba(251,146,60,0.1)';
                        }

                        return (
                          <div key={bill.orderNumber} style={{ background: '#16162a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {/* Bill Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 800, color: '#c084fc', fontSize: '0.95rem' }}>{bill.orderNumber}</span>
                                <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.15rem 0.45rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                                  {bill.customerName}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                ⏰ {formatTimeThai(bill.timestamp)}
                              </span>
                            </div>

                            {/* Bill Items List */}
                            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {bill.items.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.8rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'white', fontWeight: 500 }}>
                                      {item.qty > 1 ? `${item.name} (x${item.qty})` : item.name}
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>฿{fmt(item.price)}</span>
                                  </div>
                                  {item.subItems && item.subItems.length > 0 && (
                                    <div style={{ color: 'rgba(192,132,252,0.6)', paddingLeft: '0.75rem', fontSize: '0.75rem', marginTop: '2px', lineHeight: '1.25' }}>
                                      {item.subItems.map((sub, sidx) => (
                                        <div key={sidx}>{sub}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Bill Footer Summary */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem', marginTop: '2px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '12px', color: badgeColor, background: badgeBg, fontWeight: 700, width: 'fit-content' }}>
                                  {payMethodLabel}
                                </span>
                                {splitLabel && (
                                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
                                    {splitLabel}
                                  </span>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginRight: '6px' }}>รวมยอด</span>
                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>฿{fmt(bill.total)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              )}

              {/* VIEW 3: MENU DRILLDOWN LIST */}
              {view === 'drilldown' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Back button & Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <button 
                      onClick={() => setView('summary')}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: 'white', padding: '0.4rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    >
                      <ArrowLeft size={14} /> {lang === 'th' ? 'ย้อนกลับ' : 'Back'}
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginLeft: 'auto' }}>
                      ออกไปทั้งหมด {drilldownBills.reduce((acc, b) => acc + b.matchingItems.length, 0)} ครั้ง
                    </span>
                  </div>

                  {/* Title of selected menu item */}
                  <div style={{ ...cardStyle, background: 'rgba(192,132,252,0.04)', border: '1px solid rgba(192,132,252,0.15)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700 }}>🔍 รายละเอียดประวัติการสั่งซื้อ</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>{drilldownItem}</span>
                  </div>

                  {/* Scrollable Drilldown list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '430px', overflowY: 'auto', paddingRight: '2px' }}>
                    {drilldownBills.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem', fontSize: '0.85rem' }}>
                        {lang === 'th' ? 'ไม่พบข้อมูลออเดอร์' : 'No matching orders found'}
                      </div>
                    ) : (
                      drilldownBills.map((bill, bidx) => (
                        <div key={bidx} style={{ background: '#16162a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          
                          {/* Order header info */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: '#c084fc', fontSize: '0.9rem' }}>{bill.orderNumber}</span>
                              <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.15rem 0.45rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                                {bill.customerName}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                              ⏰ {formatTimeThai(bill.timestamp)}
                            </span>
                          </div>

                          {/* The matching main item + options (what was inside the set) */}
                          <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {bill.matchingItems.map((item, midx) => (
                              <div key={midx} style={{ fontSize: '0.82rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '4px' }}>
                                  <span style={{ color: 'white', fontWeight: 600 }}>📦 {item.name}</span>
                                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>฿{fmt(item.price)}</span>
                                </div>
                                {item.subItems && item.subItems.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'rgba(192,132,252,0.85)', paddingLeft: '0.5rem' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: '2px' }}>📋 รายการประกอบข้างในเซ็ต:</div>
                                    {item.subItems.map((sub, sidx) => {
                                      const options = sub.replace(/^↳/, '').split(',').map(o => o.trim());
                                      return (
                                        <div key={sidx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px' }}>
                                          {options.map((opt, oidx) => {
                                            const freePrefix = lang === 'th' ? 'ฟรี ' : 'Free ';
                                            const cleanQuery = drilldownItem.startsWith(freePrefix)
                                              ? drilldownItem.substring(freePrefix.length).toLowerCase().trim()
                                              : drilldownItem.toLowerCase().trim();
                                            const isHighlight = opt.toLowerCase().includes(cleanQuery);
                                            return (
                                              <div key={oidx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ color: '#c084fc' }}>↳</span>
                                                <span style={{ color: isHighlight ? '#fbbf24' : 'rgba(255,255,255,0.7)', fontWeight: isHighlight ? 700 : 400 }}>
                                                  {opt}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                                    (ไม่มีตัวเลือกเสริมหรือชุดย่อยย่อย)
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Payment summary footer for this order */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem' }}>
                            <span>💳 ชำระผ่าน: {bill.paymentMethod}</span>
                            <span style={{ color: 'white' }}>ยอดรวมบิล: <strong>฿{fmt(bill.total)}</strong></span>
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'inherit', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}>
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
          
          {!loading && data && (
            <>
              {view === 'summary' && (
                <button id="capture-btn" onClick={handleDownloadImage} style={{ flex: 1.2, padding: '0.7rem', background: '#7c3aed', border: 'none', color: 'white', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(124,58,237,0.3)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'} onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}>
                  <Download size={16} /> {lang === 'th' ? 'รูปภาพ (PNG)' : 'Save as PNG'}
                </button>
              )}
              <button onClick={handleExportExcel} style={{ flex: 1.5, padding: '0.7rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#059669'} onMouseLeave={e => e.currentTarget.style.background = '#10b981'}>
                <FileSpreadsheet size={16} /> {lang === 'th' ? 'ส่งออก Excel' : 'Export Excel'}
              </button>
            </>
          )}
        </div>

      </div>
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SalesSummaryModal;
