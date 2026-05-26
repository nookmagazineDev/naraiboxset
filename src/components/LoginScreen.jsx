import React, { useState, useEffect } from 'react';
import { User, ArrowRight, Delete, RefreshCw, WifiOff } from 'lucide-react';
import './LoginScreen.css';

const LoginScreen = ({ users, onLogin, lang, isOfflineMode, onRetry }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin]                   = useState('');
  const [error, setError]               = useState('');
  const [retrying, setRetrying]         = useState(false);
  // แสดงปุ่ม retry หลังรอ 5 วิโดยไม่มี users
  const [showRetry, setShowRetry]       = useState(false);

  useEffect(() => {
    if (users && users.length > 0) { setShowRetry(false); return; }
    const t = setTimeout(() => setShowRetry(true), 5000);
    return () => clearTimeout(t);
  }, [users]);

  const handleUserSelect = (user) => { setSelectedUser(user); setPin(''); setError(''); };

  const handlePinPress = (digit) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) verifyLogin(next);
    }
  };

  const handleDelete = () => { setPin(pin.slice(0, -1)); setError(''); };

  const verifyLogin = (entered) => {
    if (String(selectedUser.pin) === String(entered)) {
      onLogin(selectedUser);
    } else {
      setError(lang === 'th' ? 'รหัส PIN ไม่ถูกต้อง' : 'Invalid PIN');
      setPin('');
    }
  };

  const handleDefaultAdmin = () => onLogin({ id: 'admin', username: 'Admin', canCheckout: true, isAdmin: true });

  const handleRetry = async () => {
    setRetrying(true);
    setShowRetry(false);
    if (onRetry) await onRetry();
    setRetrying(false);
    // ถ้ายังไม่มี users หลัง retry ให้แสดงปุ่มอีกครั้ง
    setTimeout(() => setShowRetry(true), 6000);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">{lang === 'th' ? 'เข้าสู่ระบบ' : 'Login'}</h1>
        <p className="login-subtitle">{lang === 'th' ? 'เลือกรหัสพนักงานของคุณ' : 'Select your user account'}</p>

        {(!users || users.length === 0) ? (
          /* ── ไม่มี users ── */
          <div className="no-users-container">

            {retrying ? (
              /* กำลัง retry */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: '#f97316' }} />
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>กำลังเชื่อมต่อ...</p>
              </div>
            ) : showRetry ? (
              /* หมดเวลารอ — แสดงปุ่ม retry + default admin */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '0.9rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '0.65rem 1rem' }}>
                  <WifiOff size={16} />
                  {lang === 'th' ? 'เชื่อมต่อฐานข้อมูลไม่ได้' : 'Cannot connect to database'}
                </div>
                <button
                  onClick={handleRetry}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f97316', color: 'white', border: 'none', borderRadius: 12, padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <RefreshCw size={17} /> ลองเชื่อมต่อใหม่
                </button>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>หรือ</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                </div>
                <button onClick={handleDefaultAdmin} className="default-admin-btn">
                  {lang === 'th' ? 'เข้าในฐานะแอดมิน (ชั่วคราว)' : 'Login as Default Admin'}
                </button>
              </div>
            ) : (
              /* กำลังรอครั้งแรก (5 วิแรก) */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  <RefreshCw size={15} style={{ animation: 'spin 1.2s linear infinite', opacity: 0.6 }} />
                  {lang === 'th' ? 'กำลังโหลดรายชื่อพนักงาน...' : 'Loading users...'}
                </div>
                <button onClick={handleDefaultAdmin} className="default-admin-btn" style={{ opacity: 0.75 }}>
                  {lang === 'th' ? 'เข้าสู่ระบบในฐานะแอดมิน (เริ่มต้น)' : 'Login as Default Admin'}
                </button>
              </div>
            )}

          </div>
        ) : !selectedUser ? (
          /* ── มี users — เลือกได้เลย ── */
          <div className="user-grid">
            {users.map(user => (
              <button key={user.id} className="user-select-btn" onClick={() => handleUserSelect(user)}>
                <div className="user-avatar"><User size={28} /></div>
                <span>{user.username}</span>
              </button>
            ))}
          </div>
        ) : (
          /* ── กรอก PIN ── */
          <div className="pin-container">
            <div className="selected-user-header">
              <button className="back-btn" onClick={() => setSelectedUser(null)}>
                <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <div className="current-user-info">
                <User size={20} />
                <span>{selectedUser.username}</span>
              </div>
            </div>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {lang === 'th' ? 'กรุณากรอกรหัส PIN 4 หลัก' : 'Enter 4-digit PIN'}
            </p>
            <div className="pin-dots">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />
              ))}
            </div>
            {error && <div className="pin-error">{error}</div>}
            <div className="pin-numpad">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} className="numpad-btn" onClick={() => handlePinPress(String(n))}>{n}</button>
              ))}
              <div className="numpad-empty" />
              <button className="numpad-btn" onClick={() => handlePinPress('0')}>0</button>
              <button className="numpad-btn delete" onClick={handleDelete}><Delete size={24} /></button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoginScreen;
