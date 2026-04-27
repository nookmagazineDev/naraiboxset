import React, { useState } from 'react';
import { ShoppingBag, Plus, CreditCard, Trash2, ChevronLeft, RefreshCw } from 'lucide-react';

const TableOrderView = ({
  tableNumber,
  tableOrders,
  lang = 'th',
  onAddMore,
  onCheckout,
  onDeleteItem,
  onBack,
  onRefresh,
  isRefreshing
}) => {
  // Group items for display
  const pendingItems = (tableOrders || []).filter(
    o => String(o.TableNumber) === String(tableNumber) && o.Status !== 'paid'
  );

  const totalAmount = pendingItems.reduce((sum, item) => {
    return sum + (Number(item.ItemPrice) || 0) * (Number(item.Quantity) || 1);
  }, 0);

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
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'white' }}>
            {lang === 'th' ? `โต๊ะ ${tableNumber}` : `Table ${tableNumber}`}
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
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
            {pendingItems.map((item, idx) => {
              const subtotal = (Number(item.ItemPrice) || 0) * (Number(item.Quantity) || 1);
              return (
                <div key={idx} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  padding: '1rem 1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    background: 'rgba(249,115,22,0.12)',
                    border: '1px solid rgba(249,115,22,0.3)',
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
                    <div style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.15rem',
                      opacity: 0.6
                    }}>
                      {new Date(item.Timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
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
        {pendingItems.length > 0 && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.25rem'
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {lang === 'th' ? 'ยอดรวม' : 'Total'}
            </span>
            <span style={{ color: 'var(--accent)', fontWeight: '800', fontSize: '1.4rem' }}>
              ฿{totalAmount.toLocaleString()}
            </span>
          </div>
        )}
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
              onClick={() => onCheckout(pendingItems, totalAmount)}
              style={{
                flex: 2,
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '14px',
                color: 'white',
                padding: '0.9rem',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
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
    </div>
  );
};

export default TableOrderView;
