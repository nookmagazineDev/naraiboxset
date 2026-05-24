import React, { useState } from 'react';
import { X, CheckCircle, ArrowLeft, CreditCard, Banknote, Smartphone } from 'lucide-react';

const calcCharges = (subtotal, settings = {}) => {
  const scRate = settings?.serviceCharge?.enabled ? (settings.serviceCharge.rate || 0) : 0;
  const vatRate = settings?.vat?.enabled ? (settings.vat.rate || 0) : 0;
  const sc = Math.round(subtotal * scRate) / 100;
  const vatBase = subtotal + sc;
  const vat = Math.round(vatBase * vatRate) / 100;
  return { subtotal, sc, vat, grand: subtotal + sc + vat };
};

const CheckoutModal = ({ tableOrderItems = [], total = 0, orderNumber, onClose, onComplete, lang = 'th', settings = {} }) => {
  const [paymentStep, setPaymentStep] = useState('summary');
  const [cashInput, setCashInput] = useState('');

  const { subtotal, sc, vat, grand } = calcCharges(total, settings);
  const hasCharges = sc > 0 || vat > 0;

  const cashAmount = parseFloat(cashInput) || 0;
  const change = cashAmount - grand;

  const handleConfirmPayment = (method) => {
    setPaymentStep('success');
    setTimeout(() => onComplete(grand, method), 4500);
  };

  const PriceBreakdown = ({ compact = false }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: compact ? '0.85rem 1rem' : '1rem 1.25rem', marginBottom: compact ? '0.75rem' : '1.5rem' }}>
      {!compact && (
        <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {lang === 'th' ? 'สรุปรายการ' : 'Order Summary'}
        </h4>
      )}
      {!compact && tableOrderItems.map((item, idx) => {
        const itemSubtotal = (Number(item.ItemPrice) || 0) * (Number(item.Quantity) || 1);
        return (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            <div>
              <span style={{ fontWeight: '700', color: 'var(--accent)', marginRight: '6px' }}>{Number(item.Quantity) || 1}×</span>
              <span>{lang === 'th' ? item.ItemName : (item.ItemNameEn || item.ItemName)}</span>
              {item.Options && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>{item.Options}</div>
              )}
            </div>
            <span>฿{itemSubtotal.toLocaleString()}</span>
          </div>
        );
      })}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: compact ? 0 : '0.75rem', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
        {hasCharges && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)' }}>
            <span>{lang === 'th' ? 'ยอดอาหาร' : 'Subtotal'}</span>
            <span>฿{subtotal.toLocaleString()}</span>
          </div>
        )}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.15rem', borderTop: hasCharges ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingTop: hasCharges ? '0.45rem' : 0 }}>
          <span style={{ color: 'white' }}>{lang === 'th' ? 'รวมทั้งสิ้น' : 'Grand Total'}</span>
          <span style={{ color: '#fbbf24', fontSize: '1.3rem' }}>฿{grand.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={paymentStep !== 'success' ? onClose : undefined}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', overflowY: 'auto' }}>

        {/* ── Step 1: Summary ── */}
        {paymentStep === 'summary' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'th' ? 'สรุปบิล' : 'Bill Summary'}</h2>
              <button className="close-btn" onClick={onClose}><X size={24} /></button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
              <PriceBreakdown />
            </div>
            <button onClick={() => setPaymentStep('payment_method')} className="confirm-btn" style={{ width: '100%' }}>
              {lang === 'th' ? `ชำระเงิน ฿${grand.toLocaleString()}` : `Pay ฿${grand.toLocaleString()}`}
            </button>
          </>
        )}

        {/* ── Step 2: Payment Method ── */}
        {paymentStep === 'payment_method' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'th' ? 'วิธีชำระเงิน' : 'Payment Method'}</h2>
              <button className="close-btn" onClick={() => setPaymentStep('summary')}><ArrowLeft size={22} /></button>
            </div>

            <PriceBreakdown compact />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* เงินสด */}
              <button
                onClick={() => setPaymentStep('cash')}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(34,197,94,0.07)', border: '1.5px solid rgba(34,197,94,0.25)', borderRadius: '14px', padding: '1rem 1.25rem', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', fontFamily: 'inherit', width: '100%' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(34,197,94,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(34,197,94,0.07)'}
              >
                <div style={{ background: 'rgba(34,197,94,0.15)', borderRadius: '50%', padding: '0.6rem', flexShrink: 0 }}>
                  <Banknote size={28} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>
                    {lang === 'th' ? 'เงินสด' : 'Cash'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {lang === 'th' ? 'รับเงินสดและทอนเงิน' : 'Accept cash & calculate change'}
                  </div>
                </div>
              </button>

              {/* เงินโอน */}
              <button
                onClick={() => setPaymentStep('transfer')}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(96,165,250,0.07)', border: '1.5px solid rgba(96,165,250,0.25)', borderRadius: '14px', padding: '1rem 1.25rem', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', fontFamily: 'inherit', width: '100%' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(96,165,250,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(96,165,250,0.07)'}
              >
                <div style={{ background: 'rgba(96,165,250,0.15)', borderRadius: '50%', padding: '0.6rem', flexShrink: 0 }}>
                  <Smartphone size={28} color="#60a5fa" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>
                    {lang === 'th' ? 'เงินโอน / QR Code' : 'Transfer / QR Code'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {lang === 'th' ? 'สแกน QR ที่เคาน์เตอร์' : 'Scan QR at the counter'}
                  </div>
                </div>
              </button>

              {/* บัตรเครดิต */}
              <button
                onClick={() => setPaymentStep('card')}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(251,191,36,0.07)', border: '1.5px solid rgba(251,191,36,0.25)', borderRadius: '14px', padding: '1rem 1.25rem', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', fontFamily: 'inherit', width: '100%' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(251,191,36,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(251,191,36,0.07)'}
              >
                <div style={{ background: 'rgba(251,191,36,0.15)', borderRadius: '50%', padding: '0.6rem', flexShrink: 0 }}>
                  <CreditCard size={28} color="#fbbf24" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>
                    {lang === 'th' ? 'บัตรเครดิต / เดบิต' : 'Credit / Debit Card'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {lang === 'th' ? 'รูดบัตร EDC ที่เคาน์เตอร์' : 'Swipe card at the counter'}
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Step 3a: เงินสด ── */}
        {paymentStep === 'cash' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Banknote size={22} color="#22c55e" /> {lang === 'th' ? 'ชำระด้วยเงินสด' : 'Cash Payment'}
              </h2>
              <button className="close-btn" onClick={() => setPaymentStep('payment_method')}><ArrowLeft size={22} /></button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>{lang === 'th' ? 'ยอดที่ต้องชำระ' : 'Amount Due'}</p>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', lineHeight: 1 }}>฿{grand.toLocaleString()}</div>
              {hasCharges && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  (รวมค่าบริการแล้ว)
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                {lang === 'th' ? 'รับเงินมา (บาท)' : 'Cash Received (THB)'}
              </label>
              <input
                type="number"
                min={grand}
                step="1"
                placeholder={`฿${Math.ceil(grand)}`}
                value={cashInput}
                onChange={e => setCashInput(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(34,197,94,0.4)', borderRadius: '12px', color: 'white', fontSize: '1.5rem', fontWeight: '700', textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            {/* Quick cash buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {[20, 50, 100, 500, 1000].filter(v => v >= grand || v === Math.ceil(grand / 100) * 100).slice(0, 5).concat(
                [Math.ceil(grand / 100) * 100, Math.ceil(grand / 500) * 500, Math.ceil(grand / 1000) * 1000]
              ).filter((v, i, a) => v >= grand && a.indexOf(v) === i).sort((a, b) => a - b).slice(0, 5).map(amt => (
                <button key={amt} onClick={() => setCashInput(String(amt))}
                  style={{ flex: 1, minWidth: '60px', padding: '0.55rem', background: cashAmount === amt ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)', border: `1px solid ${cashAmount === amt ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                  ฿{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {cashInput && (
              <div style={{ background: change >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${change >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: change >= 0 ? '#22c55e' : '#ef4444' }}>
                  {lang === 'th' ? (change >= 0 ? 'เงินทอน' : 'ไม่พอ!') : (change >= 0 ? 'Change' : 'Insufficient!')}
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: change >= 0 ? '#22c55e' : '#ef4444' }}>
                  {change >= 0 ? `฿${change.toLocaleString()}` : `-฿${Math.abs(change).toLocaleString()}`}
                </span>
              </div>
            )}

            <button
              onClick={() => handleConfirmPayment('เงินสด')}
              disabled={cashAmount < grand}
              className="confirm-btn"
              style={{ width: '100%', background: cashAmount >= grand ? '#22c55e' : 'rgba(255,255,255,0.1)', cursor: cashAmount >= grand ? 'pointer' : 'not-allowed', opacity: cashAmount >= grand ? 1 : 0.5 }}
            >
              <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              {lang === 'th' ? 'ยืนยันรับเงิน' : 'Confirm Cash Received'}
            </button>
          </>
        )}

        {/* ── Step 3b: เงินโอน ── */}
        {paymentStep === 'transfer' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smartphone size={22} color="#60a5fa" /> {lang === 'th' ? 'เงินโอน / QR Code' : 'Transfer / QR'}
              </h2>
              <button className="close-btn" onClick={() => setPaymentStep('payment_method')}><ArrowLeft size={22} /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>📲</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', color: 'white' }}>
                {lang === 'th' ? 'กรุณาสแกน QR Code' : 'Please Scan QR Code'}
              </h3>
              <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                <p style={{ color: 'white', fontWeight: '600', margin: '0 0 0.35rem' }}>
                  🔲 {lang === 'th' ? 'QR Code ที่เคาน์เตอร์' : 'QR Code at Counter'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  {lang === 'th' ? 'สแกน QR พร้อมเพย์ที่ตั้งไว้ที่ร้าน' : 'Scan the PromptPay QR at the store'}
                </p>
              </div>
              <PriceBreakdown compact />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {lang === 'th' ? 'บิลเลขที่:' : 'Bill No:'} <strong style={{ color: 'var(--accent)' }}>{orderNumber}</strong>
              </p>
              <button onClick={() => handleConfirmPayment('เงินโอน')} className="confirm-btn" style={{ background: '#60a5fa', width: '100%' }}>
                <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                {lang === 'th' ? 'ยืนยันรับเงินโอนแล้ว' : 'Confirm Transfer Received'}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3c: บัตรเครดิต ── */}
        {paymentStep === 'card' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={22} color="#fbbf24" /> {lang === 'th' ? 'บัตรเครดิต / เดบิต' : 'Card Payment'}
              </h2>
              <button className="close-btn" onClick={() => setPaymentStep('payment_method')}><ArrowLeft size={22} /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>💳</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', color: 'white' }}>
                {lang === 'th' ? 'กรุณารูดบัตรที่เคาน์เตอร์' : 'Swipe Card at Counter'}
              </h3>
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                <p style={{ color: 'white', fontWeight: '600', margin: '0 0 0.35rem' }}>
                  {lang === 'th' ? '💳 เครื่อง EDC ที่เคาน์เตอร์' : '💳 EDC Machine at Counter'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  {lang === 'th' ? 'นำบัตรไปรูดที่พนักงานแคชเชียร์' : 'Present card to the cashier'}
                </p>
              </div>
              <PriceBreakdown compact />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {lang === 'th' ? 'บิลเลขที่:' : 'Bill No:'} <strong style={{ color: 'var(--accent)' }}>{orderNumber}</strong>
              </p>
              <button onClick={() => handleConfirmPayment('บัตรเครดิต')} className="confirm-btn" style={{ background: '#d4a017', width: '100%' }}>
                <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                {lang === 'th' ? 'ยืนยันรับชำระบัตรแล้ว' : 'Confirm Card Payment Done'}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Success ── */}
        {paymentStep === 'success' && (
          <div className="checkout-success">
            <CheckCircle size={64} color="#22c55e" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#22c55e' }}>{lang === 'th' ? 'ชำระเงินสำเร็จ!' : 'Payment Successful!'}</h3>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', margin: '1.5rem 0', display: 'inline-block', minWidth: '80%' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{lang === 'th' ? 'หมายเลขบิล' : 'Bill Number'}</p>
              <h1 style={{ color: 'var(--accent)', fontSize: '3rem', margin: 0 }}>{orderNumber}</h1>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>{lang === 'th' ? 'ขอบคุณที่ใช้บริการ!' : 'Thank you for your visit!'}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutModal;
