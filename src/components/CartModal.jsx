import React from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus } from 'lucide-react';

const CartModal = ({ cart, onClose, onRemove, onUpdateQuantity, onUpdateNote, onCheckout, lang = 'th', settings = {} }) => {
  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      let itemTotal = Number(item.food.price);
      if (item.allPopups && item.allPopups.length > 0) {
        item.allPopups.forEach(p => { itemTotal += Number(p.price || 0); });
      }
      return total + (itemTotal * (item.quantity || 1));
    }, 0);
  };

  const calcCharges = (subtotal) => {
    const scRate = settings?.serviceCharge?.enabled ? (settings.serviceCharge.rate || 0) : 0;
    const vatRate = settings?.vat?.enabled ? (settings.vat.rate || 0) : 0;
    const sc = Math.round(subtotal * scRate) / 100;
    const vatBase = subtotal + sc;
    const vat = Math.round(vatBase * vatRate) / 100;
    return { sc, vat, grand: subtotal + sc + vat };
  };

  const calculateTotal = () => calculateSubtotal();

  const getSubtotal = (item) => {
      let itemTotal = Number(item.food.price);
      if (item.allPopups && item.allPopups.length > 0) {
        item.allPopups.forEach(p => { itemTotal += Number(p.price || 0); });
      }

      return itemTotal * (item.quantity || 1);
  };

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-panel" onClick={e => e.stopPropagation()}>
        <div className="cart-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag /> {lang === 'th' ? 'ตะกร้าสินค้า' : 'Shopping Cart'}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              <p>{lang === 'th' ? 'ยังไม่มีสินค้าในตะกร้า' : 'Your cart is empty'}</p>
              <button 
                onClick={() => {
                  onClose();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}
              >
                <ShoppingBag size={20} /> {lang === 'th' ? 'ดำเนินการสั่งอาหาร' : 'Start Ordering'}
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartId} className="cart-item">
                <div className="cart-item-info">
                  <h4>
                    {lang === 'th' ? item.food.name : (item.food.nameEn || item.food.name)}
                    {item.food.priceName && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', background: 'rgba(185,28,28,0.15)', padding: '0.1rem 0.45rem', borderRadius: '6px', verticalAlign: 'middle' }}>
                        {item.food.priceName}
                      </span>
                    )}
                  </h4>

                  <div className="cart-item-details">
                    {item.customerName && (
                      <div className="cart-item-customer">
                        <strong>{lang === 'th' ? 'ลูกค้า:' : 'Customer:'}</strong> {item.customerName}
                      </div>
                    )}
                    {item.allPopups && item.allPopups.length > 0 && (
                      <div className="cart-item-addons">
                        <strong>{lang === 'th' ? 'ตัวเลือก:' : 'Options:'}</strong> {(() => {
                          // รวมตัวเลือกที่ซ้ำกันแล้วแสดงเป็นจำนวน เช่น "Leoขวด ×12"
                          const grouped = [];
                          item.allPopups.forEach(a => {
                            const label = lang === 'th' ? a.name : (a.nameEn || a.name);
                            const found = grouped.find(g => g.label === label);
                            if (found) found.count += 1;
                            else grouped.push({ label, count: 1 });
                          });
                          return grouped.map(g => g.count > 1 ? `${g.label} ×${g.count}` : g.label).join(', ');
                        })()}
                      </div>
                    )}

                    <div className="cart-item-dining">
                        <strong>{lang === 'th' ? 'การรับประทาน:' : 'Dining:'}</strong> {lang === 'th' ? item.dining.name : (item.dining.nameEn || item.dining.name)}
                    </div>
                  </div>

                  <div className="cart-item-price">฿{getSubtotal(item)}</div>

                  {/* หมายเหตุอาหาร — มีในทุกรายการ */}
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => onUpdateNote && onUpdateNote(item.cartId, e.target.value)}
                    placeholder={lang === 'th' ? '📝 หมายเหตุ เช่น ไม่ใส่ผัก, เผ็ดน้อย' : '📝 Note e.g. no veggies'}
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.5rem 0.65rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div className="cart-item-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="qty-controls" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '0.25rem' }}>
                    <button className="qty-btn" onClick={() => onUpdateQuantity(item.cartId, -1)} disabled={(item.quantity || 1) <= 1} style={{ background: 'none', border: 'none', color: 'white', cursor: ((item.quantity || 1) <= 1) ? 'not-allowed' : 'pointer', opacity: ((item.quantity || 1) <= 1) ? 0.3 : 1, padding: '0.25rem' }}><Minus size={16}/></button>
                    <span className="qty-val" style={{ width: '24px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity || 1}</span>
                    <button className="qty-btn" onClick={() => onUpdateQuantity(item.cartId, 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}><Plus size={16}/></button>
                  </div>
                  <button 
                    className="remove-btn" 
                    onClick={() => {
                      if (window.confirm(lang === 'th' ? 'คุณต้องการลบรายการนี้ใช่หรือไม่?' : 'Remove this item from cart?')) {
                        onRemove(item.cartId);
                      }
                    }}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            {(() => {
              const subtotal = calculateSubtotal();
              const { sc, vat, grand } = calcCharges(subtotal);
              const hasCharges = sc > 0 || vat > 0;
              return (
                <div style={{ marginBottom: '0.85rem' }}>
                  {hasCharges ? (
                    <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.65)' }}>
                        <span>{lang === 'th' ? 'ยอดอาหาร' : 'Subtotal'}</span>
                        <span>฿{subtotal.toLocaleString()}</span>
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
                        <span style={{ color: 'white' }}>{lang === 'th' ? 'รวมทั้งสิ้น' : 'Grand Total'}</span>
                        <span style={{ color: '#fbbf24' }}>฿{grand.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="cart-total" style={{ marginBottom: '0.5rem' }}>
                      <span>{lang === 'th' ? 'ยอดรวม:' : 'Total:'}</span>
                      <span style={{ color: 'var(--accent)' }}>฿{subtotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button
                onClick={() => { onClose(); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100); }}
                style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', fontFamily: 'inherit' }}
              >
                <Plus size={20} /> {lang === 'th' ? 'สั่งเพิ่ม' : 'Order More'}
              </button>
              <button className="confirm-btn" onClick={onCheckout} style={{ flex: 1.5, margin: 0 }}>
                {lang === 'th' ? '✅ ส่งรายการอาหาร' : 'Send Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
