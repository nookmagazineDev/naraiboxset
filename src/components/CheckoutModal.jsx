import React, { useState } from 'react';
import { X, CheckCircle, ArrowLeft, CreditCard, Banknote } from 'lucide-react';

// tableOrderItems: array of items from TableOrders sheet for this table
// total: computed total
const CheckoutModal = ({ tableOrderItems = [], total = 0, orderNumber, onClose, onComplete, lang = 'th' }) => {
  const [paymentStep, setPaymentStep] = useState('summary');

  const handleConfirmPayment = () => {
    setPaymentStep('success');
    setTimeout(() => {
      onComplete();
    }, 4500);
  };

  return (
    <div className="modal-overlay" onClick={paymentStep !== 'success' ? onClose : undefined}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>

        {/* Step 1: Order Summary */}
        {paymentStep === 'summary' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'th' ? 'สรุปรายการอาหาร' : 'Order Summary'}</h2>
              <button className="close-btn" onClick={onClose}><X size={24} /></button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', maxHeight: '320px', overflowY: 'auto' }}>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {lang === 'th' ? 'รายการอาหารทั้งหมด:' : 'All Items:'}
              </h4>
              {tableOrderItems.map((item, idx) => {
                const subtotal = (Number(item.ItemPrice) || 0) * (Number(item.Quantity) || 1);
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent)', marginRight: '8px' }}>
                        {Number(item.Quantity) || 1}x
                      </span>
                      <span>{lang === 'th' ? item.ItemName : (item.ItemNameEn || item.ItemName)}</span>
                      {item.Options && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '2rem' }}>
                          {item.Options}
                        </div>
                      )}
                    </div>
                    <span>฿{subtotal}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                <span>{lang === 'th' ? 'ยอดรวมต้องชำระ' : 'Total to Pay'}</span>
                <span style={{ color: 'var(--accent)', fontSize: '1.3rem' }}>฿{total}</span>
              </div>
            </div>

            <button onClick={() => setPaymentStep('payment_method')} className="confirm-btn" style={{ background: 'var(--accent)', width: '100%' }}>
              {lang === 'th' ? 'ดำเนินการชำระเงิน' : 'Proceed to Payment'}
            </button>
          </>
        )}

        {/* Step 2: Choose Payment Method */}
        {paymentStep === 'payment_method' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'th' ? 'เลือกวิธีชำระเงิน' : 'Select Payment Method'}</h2>
              <button className="close-btn" onClick={() => setPaymentStep('summary')}><ArrowLeft size={24} /></button>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {lang === 'th' ? `ยอดที่ต้องชำระ: ` : 'Amount due: '}
              <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>฿{total}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                onClick={() => setPaymentStep('qrcode')}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem 1.25rem', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <CreditCard size={32} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '2px' }}>
                    {lang === 'th' ? 'รูดบัตรเครดิต / เดบิต' : 'Credit / Debit Card'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {lang === 'th' ? 'รูดบัตรได้ที่เคาน์เตอร์' : 'Swipe card at the counter'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentStep('qr_side')}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem 1.25rem', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <Banknote size={32} color="#4ade80" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '2px' }}>
                    {lang === 'th' ? 'สแกน QR Code ด้านข้าง' : 'Scan QR Code at Counter'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {lang === 'th' ? 'ชำระโดยสแกน QR Code ที่ตั้งไว้ที่ร้าน' : 'Pay via QR Code placed at the store'}
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Step 3a: บัตรเครดิต */}
        {paymentStep === 'qrcode' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'th' ? 'รูดบัตรเครดิต / เดบิต' : 'Card Payment'}</h2>
              <button className="close-btn" onClick={() => setPaymentStep('payment_method')}><ArrowLeft size={24} /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💳</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: 'white' }}>
                {lang === 'th' ? 'กรุณารูดบัตรที่เคาน์เตอร์' : 'Please swipe card at the counter'}
              </h3>
              <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  {lang === 'th' ? 'นำบัตรไปรูดที่เครื่อง EDC ที่เคาน์เตอร์' : 'Swipe your card at the EDC machine at the counter'}
                </p>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {lang === 'th' ? 'ยอดที่ต้องชำระ:' : 'Amount:'} <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>฿{total}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {lang === 'th' ? 'บิลเลขที่:' : 'Bill No:'} <strong style={{ color: 'var(--accent)' }}>{orderNumber}</strong>
              </p>
              <button onClick={handleConfirmPayment} className="confirm-btn" style={{ background: 'var(--spice-1)', width: '100%' }}>
                <CheckCircle size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                {lang === 'th' ? 'ยืนยันว่าชำระแล้ว' : 'Confirm Payment Done'}
              </button>
            </div>
          </>
        )}

        {/* Step 3b: QR ด้านข้าง */}
        {paymentStep === 'qr_side' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'th' ? 'ชำระเงินที่เคาน์เตอร์' : 'Pay at Counter'}</h2>
              <button className="close-btn" onClick={() => setPaymentStep('payment_method')}><ArrowLeft size={24} /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📲</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: 'white' }}>
                {lang === 'th' ? 'กรุณาสแกนชำระเงิน' : 'Please Scan to Pay'}
              </h3>
              <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                  {lang === 'th' ? '🔲 QR Code ด้านข้าง' : '🔲 QR Code at the side'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: 0 }}>
                  {lang === 'th' ? 'กรุณาสแกนชำระเงิน QR Code ด้านข้าง' : 'Please scan the QR Code placed at the counter'}
                </p>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {lang === 'th' ? 'ยอดที่ต้องชำระ:' : 'Amount:'} <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>฿{total}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {lang === 'th' ? 'บิลเลขที่:' : 'Bill No:'} <strong style={{ color: 'var(--accent)' }}>{orderNumber}</strong>
              </p>
              <button onClick={handleConfirmPayment} className="confirm-btn" style={{ background: 'var(--spice-1)', width: '100%' }}>
                <CheckCircle size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                {lang === 'th' ? 'ยืนยันว่าชำระแล้ว' : 'Confirm Payment Done'}
              </button>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {paymentStep === 'success' && (
          <div className="checkout-success">
            <CheckCircle size={64} color="var(--spice-1)" style={{ margin: '0 auto 1rem' }} />
            <h3>{lang === 'th' ? 'ชำระเงินสำเร็จ!' : 'Payment Successful!'}</h3>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', margin: '1.5rem 0', display: 'inline-block', minWidth: '80%' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>{lang === 'th' ? 'หมายเลขบิล' : 'Bill Number'}</p>
              <h1 style={{ color: 'var(--accent)', fontSize: '3.5rem', margin: 0 }}>{orderNumber}</h1>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>{lang === 'th' ? 'ขอบคุณที่ใช้บริการ!' : 'Thank you for your visit!'}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutModal;
