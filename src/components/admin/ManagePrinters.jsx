import React, { useState, useEffect } from 'react';
import { Printer, Save, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const ManagePrinters = () => {
  const { lang } = useOutletContext();
  
  const [kitchenIP, setKitchenIP] = useState('');
  const [receiptIP, setReceiptIP] = useState('');
  const [testingStatus, setTestingStatus] = useState(null); // { ip, status: 'success' | 'error', msg }
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Load saved settings from local storage
    const savedKitchen = localStorage.getItem('printer_kitchen_ip') || '';
    const savedReceipt = localStorage.getItem('printer_receipt_ip') || '';
    setKitchenIP(savedKitchen);
    setReceiptIP(savedReceipt);
  }, []);

  const handleSave = () => {
    localStorage.setItem('printer_kitchen_ip', kitchenIP);
    localStorage.setItem('printer_receipt_ip', receiptIP);
    setSaveMessage(lang === 'th' ? 'บันทึกการตั้งค่าแล้ว!' : 'Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleTestPrint = async (ip, type) => {
    if (!ip) {
      setTestingStatus({ ip, status: 'error', msg: lang === 'th' ? 'กรุณาระบุ IP Address' : 'Please provide an IP address' });
      return;
    }

    setTestingStatus({ ip, status: 'loading', msg: lang === 'th' ? 'กำลังทดสอบปริ้น...' : 'Testing connection...' });
    
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: ip,
          printerType: type,
          orderData: {
            orderNumber: 'TEST-001',
            total: 999,
            customerDetails: { name: 'Test User' },
            items: [
              { name: 'ทดสอบการพิมพ์ (Test Print)', quantity: 1, isFlattened: true }
            ]
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        setTestingStatus({ ip, status: 'success', msg: lang === 'th' ? 'พิมพ์ทดสอบสำเร็จ!' : 'Test print successful!' });
      } else {
        setTestingStatus({ ip, status: 'error', msg: result.error || 'Failed' });
      }
    } catch (error) {
      console.error(error);
      setTestingStatus({ ip, status: 'error', msg: lang === 'th' ? 'ติดต่อ Print Server ไม่ได้ (ลืมเปิด node server.js หรือเปล่า?)' : 'Cannot reach local Print Server. Did you run node server.js?' });
    }
  };

  return (
    <div>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Printer size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {lang === 'th' ? 'ตั้งค่าเครื่องพิมพ์ (Printers)' : 'Printer Settings'}</h1>
          <p>{lang === 'th' ? 'ระบุหมายเลข IP ของเครื่องพิมพ์วงแลน (ESC/POS Port 9100) สำหรับแต่ละจุด' : 'Configure LAN printer IPs (ESC/POS Port 9100) for kitchen and receipts.'}</p>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Receipt Printer */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={20} />
              {lang === 'th' ? 'เครื่องพิมพ์ใบเสร็จ (หน้าร้าน)' : 'Receipt Printer (Front Desk)'}
            </h3>
            <div className="admin-form-group" style={{ marginBottom: '0' }}>
              <label>{lang === 'th' ? 'IP Address (เช่น 192.168.1.100)' : 'IP Address (e.g., 192.168.1.100)'}</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  value={receiptIP} 
                  onChange={e => setReceiptIP(e.target.value)} 
                  placeholder="192.168.x.x"
                  style={{ flex: 1 }}
                />
                <button className="admin-btn secondary" onClick={() => handleTestPrint(receiptIP, 'receipt')} disabled={!receiptIP}>
                   {lang === 'th' ? 'ทดสอบพิมพ์' : 'Test Print'}
                </button>
              </div>
              {testingStatus?.ip === receiptIP && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: testingStatus.status === 'success' ? '#22c55e' : (testingStatus.status === 'error' ? '#ef4444' : '#eab308') }}>
                  {testingStatus.status === 'success' && <CheckCircle size={16} />}
                  {testingStatus.status === 'error' && <XCircle size={16} />}
                  {testingStatus.status === 'loading' && <AlertCircle size={16} />}
                  {testingStatus.msg}
                </div>
              )}
            </div>
          </div>

          {/* Kitchen Printer */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={20} />
              {lang === 'th' ? 'เครื่องพิมพ์ใบสั่งอาหาร (ห้องครัว)' : 'Kitchen Printer'}
            </h3>
            <div className="admin-form-group" style={{ marginBottom: '0' }}>
              <label>{lang === 'th' ? 'IP Address (เช่น 192.168.1.101)' : 'IP Address (e.g., 192.168.1.101)'}</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  value={kitchenIP} 
                  onChange={e => setKitchenIP(e.target.value)} 
                  placeholder="192.168.x.x"
                  style={{ flex: 1 }}
                />
                <button className="admin-btn secondary" onClick={() => handleTestPrint(kitchenIP, 'kitchen')} disabled={!kitchenIP}>
                   {lang === 'th' ? 'ทดสอบพิมพ์' : 'Test Print'}
                </button>
              </div>
              {testingStatus?.ip === kitchenIP && (
                 <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: testingStatus.status === 'success' ? '#22c55e' : (testingStatus.status === 'error' ? '#ef4444' : '#eab308') }}>
                   {testingStatus.status === 'success' && <CheckCircle size={16} />}
                   {testingStatus.status === 'error' && <XCircle size={16} />}
                   {testingStatus.status === 'loading' && <AlertCircle size={16} />}
                   {testingStatus.msg}
                 </div>
              )}
            </div>
          </div>

          <div>
             <button className="admin-btn" onClick={handleSave} style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem' }}>
                <Save size={20} /> {lang === 'th' ? 'บันทึกการตั้งค่า' : 'Save Config'}
             </button>
             {saveMessage && <p style={{ color: '#22c55e', textAlign: 'center', marginTop: '1rem' }}>{saveMessage}</p>}
          </div>

          <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '1rem', borderRadius: '8px', color: '#eab308', fontSize: '0.9rem' }}>
            <strong>คำแนะนำ:</strong> การสั่งพิมพ์จะทำงานได้ก็ต่อเมื่อมีโปรแกรม Print Server (node server.js) รันอยู่บนเครื่องนี้ และเครื่องพิมพ์จะต้องอยู่ในวงแลน (WiFi / LAN) เดียวกันกับคอมพิวเตอร์ที่รัน Server
          </div>

        </div>
      </div>
    </div>
  );
};

export default ManagePrinters;
