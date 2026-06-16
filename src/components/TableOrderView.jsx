import React, { useState } from 'react';
import { ShoppingBag, Plus, CreditCard, Trash2, ChevronLeft, RefreshCw, Split, AlertTriangle } from 'lucide-react';

const calcCharges = (subtotal, settings = {}) => {
  const scRate = settings?.serviceCharge?.enabled ? (settings.serviceCharge.rate || 0) : 0;
  const vatRate = settings?.vat?.enabled ? (settings.vat.rate || 0) : 0;
  const sc = Math.round(subtotal * scRate) / 100;
  const vatBase = subtotal + sc;
  const vat = Math.round(vatBase * vatRate) / 100;
  return { sc, vat, grand: subtotal + sc + vat };
};

const TableOrderView = ({
  tableNumber,
  tableOrders,
  lang = 'th',
  onAddMore,
  onCheckout,
  onDeleteItem,
  onBack,
  onRefresh,
  isRefreshing,
  onMoveMerge,
  currentUser,
  settings = {},
  customerType = '',
  setCustomerType,
  customerName = '',
  setCustomerName,
  customerTypeOptions = ['']
}) => {
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'move' | 'merge' | 'split'
  const [targetTable, setTargetTable] = useState('');
  const [confirmStage, setConfirmStage] = useState(false); // true = ขั้นยืนยันอีกรอบ
  const [selectedIdx, setSelectedIdx] = useState([]); // index ของรายการที่เลือก
  
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [currentCount, setCurrentCount] = useState(() => localStorage.getItem('customer_count_' + tableNumber) || '');
  const [editCustomerCount, setEditCustomerCount] = useState(1);

  // Group items for display
  const pendingItems = (tableOrders || []).filter(
    o => String(o.TableNumber) === String(tableNumber) && o.Status !== 'paid'
  );

  const totalAmount = pendingItems.reduce((sum, item) => {
    return sum + (Number(item.ItemPrice) || 0) * (Number(item.Quantity) || 1);
  }, 0);

  const toggleSelect = (idx) => {
    setSelectedIdx(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };
  const allSelected = pendingItems.length > 0 && selectedIdx.length === pendingItems.length;
  const toggleSelectAll = () => {
    setSelectedIdx(allSelected ? [] : pendingItems.map((_, i) => i));
  };

  // เปิด modal สำหรับแอคชั่นโต๊ะ (move/merge/split)
  const openAction = (type) => {
    setActionType(type);
    setTargetTable('');
    setConfirmStage(false);
    setShowActionModal(true);
  };
  const closeAction = () => {
    setShowActionModal(false);
    setConfirmStage(false);
  };

  // รายการที่จะดำเนินการ: ถ้าไม่ได้เลือกอะไร = ทั้งโต๊ะ
  const actingItems = selectedIdx.length > 0 ? selectedIdx.map(i => pendingItems[i]).filter(Boolean) : pendingItems;
  const actingIsAll = selectedIdx.length === 0 || selectedIdx.length === pendingItems.length;

  const actionLabel = (type) => {
    if (type === 'move') return lang === 'th' ? 'ย้ายโต๊ะ' : 'Move';
    if (type === 'merge') return lang === 'th' ? 'รวมโต๊ะ' : 'Merge';
    return lang === 'th' ? 'แยกโต๊ะ' : 'Split';
  };

  const runTableAction = () => {
    if (!targetTable || targetTable === String(tableNumber)) return;
    onMoveMerge(tableNumber, targetTable, actionType === 'merge', actingItems, actingIsAll);
    closeAction();
    setSelectedIdx([]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(30,30,40,0.98) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)'
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'white',
            padding: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {lang === 'th' ? 'สรุปบิล' : 'Bill Summary'}
              {currentCount && (
                <span 
                  onClick={() => {
                    setEditCustomerCount(parseInt(currentCount, 10) || 1);
                    setShowEditCustomerModal(true);
                  }}
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--accent)',
                    background: 'rgba(250,204,21,0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: '1px solid rgba(250,204,21,0.3)'
                  }}
                >
                  ({currentCount} {lang === 'th' ? 'ท่าน' : 'pax'})
                </span>
              )}
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => openAction('move')}
                disabled={pendingItems.length === 0}
                style={{
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '6px',
                  color: '#60a5fa',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: pendingItems.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: pendingItems.length === 0 ? 0.4 : 1
                }}
              >
                {lang === 'th' ? 'ย้ายโต๊ะ' : 'Move'}
              </button>
              <button
                onClick={() => openAction('merge')}
                disabled={pendingItems.length === 0}
                style={{
                  background: 'rgba(16,185,129,0.2)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '6px',
                  color: '#34d399',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: pendingItems.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: pendingItems.length === 0 ? 0.4 : 1
                }}
              >
                {lang === 'th' ? 'รวมโต๊ะ' : 'Merge'}
              </button>
              <button
                onClick={() => openAction('split')}
                disabled={pendingItems.length === 0}
                style={{
                  background: 'rgba(168,85,247,0.2)',
                  border: '1px solid rgba(168,85,247,0.3)',
                  borderRadius: '6px',
                  color: '#c084fc',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: pendingItems.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: pendingItems.length === 0 ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', gap: '3px'
                }}
              >
                <Split size={12} /> {lang === 'th' ? 'แยกโต๊ะ' : 'Split'}
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {lang === 'th' ? `${pendingItems.length} รายการ` : `${pendingItems.length} items`}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'white',
            padding: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            opacity: isRefreshing ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          <RefreshCw size={18} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Customer type + name (เชื่อมกับหน้าสั่งอาหาร) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
        padding: '0.75rem 1.25rem',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)'
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
          👤 {lang === 'th' ? 'ประเภทลูกค้า' : 'Customer'}
        </span>
        <select
          value={customerType}
          onChange={(e) => setCustomerType && setCustomerType(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.08)', color: 'white',
            border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem',
            fontWeight: 700, cursor: 'pointer', maxWidth: '160px'
          }}
        >
          {customerTypeOptions.map(t => (
            <option key={t || 'normal'} value={t} style={{ color: '#000' }}>
              {t || (lang === 'th' ? 'ปกติ' : 'Normal')}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName && setCustomerName(e.target.value)}
          placeholder={lang === 'th' ? 'ชื่อลูกค้า (ถ้ามี)' : 'Customer name (optional)'}
          style={{
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.08)', color: 'white',
            border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem',
            width: '180px', flexShrink: 0
          }}
        />
      </div>

      {/* Order Items */}
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', paddingBottom: '180px' }}>
        {pendingItems.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '4rem',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            <ShoppingBag size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>
              {lang === 'th' ? 'ยังไม่มีรายการอาหาร' : 'No orders yet'}
            </p>
            <p style={{ fontSize: '0.88rem', opacity: 0.7 }}>
              {lang === 'th' ? 'กดปุ่มด้านล่างเพื่อสั่งอาหาร' : 'Tap the button below to order'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 0.25rem', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600
            }}>
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              {lang === 'th' ? 'เลือกทั้งหมด' : 'Select all'}
              {selectedIdx.length > 0 && (
                <span style={{ color: 'var(--accent)' }}>
                  ({selectedIdx.length} {lang === 'th' ? 'รายการ' : 'selected'})
                </span>
              )}
            </label>
            {pendingItems.map((item, idx) => {
              const subtotal = (Number(item.ItemPrice) || 0) * (Number(item.Quantity) || 1);
              return (
                <div key={idx} style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${selectedIdx.includes(idx) ? 'rgba(250,204,21,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '14px',
                  padding: '1rem 1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedIdx.includes(idx)}
                    onChange={() => toggleSelect(idx)}
                    style={{ width: '18px', height: '18px', marginTop: '0.35rem', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{
                    background: 'rgba(250,204,21,0.12)',
                    border: '1px solid rgba(250,204,21,0.3)',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontWeight: '700',
                    color: 'var(--accent)',
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    minWidth: '36px',
                    textAlign: 'center'
                  }}>
                    {Number(item.Quantity) || 1}x
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: 'white', fontSize: '0.97rem' }}>
                      {lang === 'th' ? (item.ItemName || '') : (item.ItemNameEn || item.ItemName || '')}
                    </div>
                    {item.Options && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {item.Options}
                      </div>
                    )}
                    {item.Timestamp && !isNaN(new Date(item.Timestamp)) && (
                      <div style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.15rem',
                        opacity: 0.6
                      }}>
                        🕒 {new Date(item.Timestamp).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <span style={{ fontWeight: '700', color: 'white', fontSize: '0.97rem' }}>
                      ฿{subtotal}
                    </span>
                    <button
                      onClick={() => onDeleteItem(item)}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '7px',
                        color: '#f87171',
                        padding: '0.25rem 0.4rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, var(--bg-dark) 80%, transparent)',
        padding: '1rem 1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {pendingItems.length > 0 && (() => {
          const { sc, vat, grand } = calcCharges(totalAmount, settings);
          const hasCharges = sc > 0 || vat > 0;
          return (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              marginBottom: '0.25rem'
            }}>
              {hasCharges ? (
                <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.65)' }}>
                    <span>{lang === 'th' ? 'ยอดอาหาร' : 'Subtotal'}</span>
                    <span>฿{totalAmount.toLocaleString()}</span>
                  </div>
                  {sc > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24' }}>
                      <span>{lang === 'th' ? `เซอร์วิชชาร์จ ${settings.serviceCharge.rate}%` : `Service Charge ${settings.serviceCharge.rate}%`}</span>
                      <span>+฿{sc.toLocaleString()}</span>
                    </div>
                  )}
                  {vat > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa' }}>
                      <span>{lang === 'th' ? `VAT ${settings.vat.rate}%` : `VAT ${settings.vat.rate}%`}</span>
                      <span>+฿{vat.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.45rem', marginTop: '0.1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{lang === 'th' ? 'ยอดรวม' : 'Total'}</span>
                    <span style={{ color: 'var(--accent)', fontSize: '1.4rem' }}>฿{grand.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    {lang === 'th' ? 'ยอดรวม' : 'Total'}
                  </span>
                  <span style={{ color: 'var(--accent)', fontWeight: '800', fontSize: '1.4rem' }}>
                    ฿{totalAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          );
        })()}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onAddMore}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              color: 'white',
              padding: '0.9rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} />
            {lang === 'th' ? 'สั่งเพิ่ม' : 'Add More'}
          </button>
          {pendingItems.length > 0 && (
            <button
              onClick={() => {
                if (currentUser?.canCheckout !== false || currentUser?.isAdmin) {
                  onCheckout(pendingItems, totalAmount);
                } else {
                  alert(lang === 'th' ? 'ไม่มีสิทธิ์ในการชำระเงิน' : 'No checkout permission');
                }
              }}
              style={{
                flex: 2,
                background: (currentUser?.canCheckout !== false || currentUser?.isAdmin) ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '14px',
                color: (currentUser?.canCheckout !== false || currentUser?.isAdmin) ? 'white' : 'var(--text-muted)',
                padding: '0.9rem',
                cursor: (currentUser?.canCheckout !== false || currentUser?.isAdmin) ? 'pointer' : 'not-allowed',
                fontWeight: '700',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: (currentUser?.canCheckout !== false || currentUser?.isAdmin) ? '0 4px 20px rgba(250,204,21,0.4)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <CreditCard size={20} />
              {lang === 'th' ? 'ชำระเงิน' : 'Pay Now'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Action Modal (Move / Merge) */}
      {showActionModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '360px',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white', textAlign: 'center' }}>
              {actionLabel(actionType)}
            </h3>

            {/* สรุปรายการที่จะดำเนินการ */}
            <div style={{
              marginBottom: '1rem', padding: '0.6rem 0.8rem', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center'
            }}>
              {actingIsAll
                ? (lang === 'th' ? `ดำเนินการกับ "ทั้งโต๊ะ" (${actingItems.length} รายการ)` : `Acting on the whole table (${actingItems.length} items)`)
                : (lang === 'th' ? `ดำเนินการกับ ${actingItems.length} รายการที่เลือก` : `Acting on ${actingItems.length} selected items`)}
            </div>

            {!confirmStage ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {actionType === 'move'
                      ? (lang === 'th' ? 'ย้ายไปโต๊ะเบอร์ (โต๊ะว่าง):' : 'Move to table (empty):')
                      : actionType === 'merge'
                        ? (lang === 'th' ? 'รวมกับโต๊ะเบอร์ (โต๊ะที่มีลูกค้า):' : 'Merge into table (occupied):')
                        : (lang === 'th' ? 'แยกรายการไปโต๊ะเบอร์:' : 'Split items to table:')}
                  </label>
                  <input
                    type="text"
                    value={targetTable}
                    onChange={(e) => setTargetTable(e.target.value)}
                    placeholder={lang === 'th' ? 'ระบุเบอร์โต๊ะเป้าหมาย' : 'Enter target table'}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      color: 'white',
                      padding: '0.8rem',
                      fontSize: '1rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={closeAction}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none',
                      borderRadius: '10px', color: 'white', padding: '0.8rem',
                      fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => { if (targetTable && targetTable !== String(tableNumber)) setConfirmStage(true); }}
                    disabled={!targetTable || targetTable === String(tableNumber)}
                    style={{
                      flex: 1,
                      background: actionType === 'move' ? '#3b82f6' : actionType === 'merge' ? '#10b981' : '#a855f7',
                      border: 'none', borderRadius: '10px', color: 'white', padding: '0.8rem',
                      fontWeight: '600', cursor: 'pointer',
                      opacity: (!targetTable || targetTable === String(tableNumber)) ? 0.5 : 1
                    }}
                  >
                    {lang === 'th' ? 'ถัดไป' : 'Next'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'center'
                }}>
                  <AlertTriangle size={40} color="#fbbf24" />
                  <p style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                    {lang === 'th' ? 'ยืนยันอีกครั้ง' : 'Please confirm again'}
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {lang === 'th'
                      ? `${actionLabel(actionType)} ${actingIsAll ? 'ทั้งโต๊ะ' : `${actingItems.length} รายการ`} จากโต๊ะ ${tableNumber} ไปโต๊ะ ${targetTable} ?`
                      : `${actionLabel(actionType)} ${actingIsAll ? 'the whole table' : `${actingItems.length} items`} from table ${tableNumber} to table ${targetTable}?`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setConfirmStage(false)}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none',
                      borderRadius: '10px', color: 'white', padding: '0.8rem',
                      fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    {lang === 'th' ? 'ย้อนกลับ' : 'Back'}
                  </button>
                  <button
                    onClick={runTableAction}
                    style={{
                      flex: 1,
                      background: actionType === 'move' ? '#3b82f6' : actionType === 'merge' ? '#10b981' : '#a855f7',
                      border: 'none', borderRadius: '10px', color: 'white', padding: '0.8rem',
                      fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {lang === 'th' ? 'ยืนยัน' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Customer Count Modal */}
      {showEditCustomerModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '320px',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white', textAlign: 'center' }}>
              {lang === 'th' ? 'แก้ไขจำนวนลูกค้า' : 'Edit Customer Count'}
            </h3>
            
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <button
                  onClick={() => setEditCustomerCount(Math.max(1, editCustomerCount - 1))}
                  style={{
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  -
                </button>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)', minWidth: '40px' }}>
                  {editCustomerCount}
                </span>
                <button
                  onClick={() => setEditCustomerCount(editCustomerCount + 1)}
                  style={{
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowEditCustomerModal(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('customer_count_' + tableNumber, editCustomerCount);
                  setCurrentCount(String(editCustomerCount));
                  setShowEditCustomerModal(false);
                }}
                style={{
                  flex: 1,
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {lang === 'th' ? 'บันทึก' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableOrderView;
