import React, { useState, useEffect } from 'react';
import { Printer, Save, CheckCircle, XCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwEGa7KC8W8FiQutWl84FL3XyaHUni23zgFET3q7ATSpBTzftfNX7ILvbEYbG134KAl/exec';

const PRINTER_TYPES = [
  { value: 'kitchen', label: 'ครัว (Kitchen)' },
  { value: 'bar', label: 'บาร์ (Bar)' },
  { value: 'receipt', label: 'ใบเสร็จ (Receipt)' },
  { value: 'other', label: 'อื่นๆ (Other)' },
];

const DEFAULT_PRINTER = () => ({ id: Date.now(), name: '', ip: '', type: 'kitchen' });

const ManagePrinters = () => {
  const [printers, setPrinters] = useState([]);
  const [testStatus, setTestStatus] = useState({}); // { [id]: { status, msg } }
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('printers_config');
    if (stored) {
      try { setPrinters(JSON.parse(stored)); } catch (e) {}
    } else {
      // Migrate old single-printer settings
      const oldKitchen = localStorage.getItem('printer_kitchen_ip');
      const oldReceipt = localStorage.getItem('printer_receipt_ip');
      const migrated = [];
      if (oldReceipt) migrated.push({ id: 1, name: 'ใบเสร็จ', ip: oldReceipt, type: 'receipt' });
      if (oldKitchen) migrated.push({ id: 2, name: 'ครัว', ip: oldKitchen, type: 'kitchen' });
      if (migrated.length > 0) setPrinters(migrated);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('printers_config', JSON.stringify(printers));
    window.dispatchEvent(new Event('printers_changed'));
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'savePrinters', printers })
    }).catch(console.error);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addPrinter = () => {
    setPrinters(prev => [...prev, DEFAULT_PRINTER()]);
    setSaved(false);
  };

  const removePrinter = (id) => {
    setPrinters(prev => prev.filter(p => p.id !== id));
    setSaved(false);
  };

  const updatePrinter = (id, field, value) => {
    setPrinters(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSaved(false);
  };

  const handleTestPrint = async (printer) => {
    if (!printer.ip) {
      setTestStatus(prev => ({ ...prev, [printer.id]: { status: 'error', msg: 'กรุณาระบุ IP Address' } }));
      return;
    }
    setTestStatus(prev => ({ ...prev, [printer.id]: { status: 'loading', msg: 'กำลังทดสอบ...' } }));
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: printer.ip,
          printerType: printer.type === 'receipt' ? 'receipt' : 'kitchen',
          orderData: {
            orderNumber: 'TEST-001',
            total: 0,
            items: [{ name: `ทดสอบ: ${printer.name || printer.ip}`, quantity: 1, isFlattened: true }]
          }
        })
      });
      const result = await response.json();
      setTestStatus(prev => ({
        ...prev,
        [printer.id]: result.success
          ? { status: 'success', msg: 'พิมพ์ทดสอบสำเร็จ!' }
          : { status: 'error', msg: result.error || 'Failed' }
      }));
    } catch (e) {
      setTestStatus(prev => ({
        ...prev,
        [printer.id]: { status: 'error', msg: 'ติดต่อ Print Server ไม่ได้ (ลืมเปิด node server.js?)' }
      }));
    }
  };

  return (
    <div>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Printer size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> ตั้งค่าเครื่องพิมพ์</h1>
          <p>จัดการเครื่องพิมพ์ทั้งหมดในระบบ — เพิ่มได้ไม่จำกัด แต่ละเมนูเลือกได้ว่าจะส่งไปพิมพ์ที่ใด</p>
        </div>
        <button className="admin-btn" onClick={addPrinter}>
          <Plus size={20} /> เพิ่มเครื่องพิมพ์
        </button>
      </div>

      <div className="admin-card" style={{ maxWidth: '900px' }}>
        {printers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Printer size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>ยังไม่มีเครื่องพิมพ์ กด "เพิ่มเครื่องพิมพ์" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {printers.map((printer, idx) => {
              const ts = testStatus[printer.id];
              return (
                <div key={printer.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Printer size={18} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: '700', color: 'white', fontSize: '0.95rem' }}>
                      เครื่องพิมพ์ที่ {idx + 1}
                    </span>
                    <button
                      onClick={() => removePrinter(printer.id)}
                      style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                    >
                      <Trash2 size={14} /> ลบ
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="admin-form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>ชื่อเครื่องพิมพ์</label>
                      <input
                        value={printer.name}
                        onChange={e => updatePrinter(printer.id, 'name', e.target.value)}
                        placeholder="เช่น ครัวใหญ่, บาร์, ใบเสร็จ"
                      />
                    </div>
                    <div className="admin-form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>IP Address</label>
                      <input
                        value={printer.ip}
                        onChange={e => updatePrinter(printer.id, 'ip', e.target.value)}
                        placeholder="192.168.x.x"
                      />
                    </div>
                    <div className="admin-form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>ประเภท</label>
                      <select value={printer.type} onChange={e => updatePrinter(printer.id, 'type', e.target.value)}>
                        {PRINTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                      className="admin-btn secondary"
                      onClick={() => handleTestPrint(printer)}
                      disabled={!printer.ip}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      ทดสอบพิมพ์
                    </button>
                    {ts && (
                      <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: ts.status === 'success' ? '#22c55e' : ts.status === 'error' ? '#ef4444' : '#eab308' }}>
                        {ts.status === 'success' && <CheckCircle size={15} />}
                        {ts.status === 'error' && <XCircle size={15} />}
                        {ts.status === 'loading' && <AlertCircle size={15} />}
                        {ts.msg}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="admin-btn"
            onClick={handleSave}
            style={{ padding: '0.85rem 2rem', background: saved ? '#22c55e' : 'var(--accent)', transition: 'background 0.3s' }}
          >
            <Save size={18} /> {saved ? 'บันทึกแล้ว ✓' : 'บันทึกการตั้งค่า'}
          </button>
        </div>

        <div style={{ marginTop: '1.25rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', padding: '1rem', borderRadius: '10px', color: '#eab308', fontSize: '0.85rem' }}>
          <strong>หมายเหตุ:</strong> การปริ้นจะทำงานได้ก็ต่อเมื่อมี Print Server (node server.js) รันอยู่ และเครื่องพิมพ์อยู่ในวงแลนเดียวกัน
        </div>
      </div>
    </div>
  );
};

export default ManagePrinters;
