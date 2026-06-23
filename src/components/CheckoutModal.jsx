import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, CheckCircle, ArrowLeft, CreditCard, Banknote, Smartphone, Tag, ChevronRight, Split, Clock, Camera, Upload } from 'lucide-react';
import { generatePromptPayPayload, generateDynamicQRFromRaw, parseKShopPayload } from '../utils/promptpay';
import { print80mm, scopedSlipCss } from '../utils/print80mm';
import { Printer } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwEGa7KC8W8FiQutWl84FL3XyaHUni23zgFET3q7ATSpBTzftfNX7ILvbEYbG134KAl/exec';

const calcCharges = (subtotal, settings = {}, discount = null) => {
  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'baht') {
      discountAmount = Math.min(Number(discount.value) || 0, subtotal);
    } else if (discount.type === 'percent') {
      discountAmount = Math.round(subtotal * (Number(discount.value) || 0)) / 100;
    }
  }
  const afterDiscount = subtotal - discountAmount;
  const scRate = settings?.serviceCharge?.enabled ? (settings.serviceCharge.rate || 0) : 0;
  const vatRate = settings?.vat?.enabled ? (settings.vat.rate || 0) : 0;
  const sc = Math.round(afterDiscount * scRate) / 100;
  const vatBase = afterDiscount + sc;
  const vat = Math.round(vatBase * vatRate) / 100;
  return { subtotal, discountAmount, afterDiscount, sc, vat, grand: afterDiscount + sc + vat };
};

const CheckoutModal = ({
  tableOrderItems = [], total = 0, orderNumber, tableNo = '',
  onClose, onComplete, lang = 'th',
  settings = {}, discounts = []
}) => {
  const [paymentStep, setPaymentStep] = useState('summary');
  const [cashInput, setCashInput] = useState('');
  const [selectedDiscount, setSelectedDiscount] = useState(null);

  // อนุมัติสร้าง QR โดยแอดมิน/แคชเชียร์ (ปิดการยืนยันแล้ว → เป็น true เสมอ)
  const [qrApproved, setQrApproved] = useState(true);
  const [approverName] = useState('');
  const [approvalId] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('approved'); // idle | pending | approved | rejected

  // อัปโหลดสลิปการโอน
  const [slipPreview, setSlipPreview] = useState('');
  const [slipUploading, setSlipUploading] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(null); // { method, details }
  const billNo = String(orderNumber || '').replace(/[^0-9A-Za-z]/g, '') || ('bill-' + Date.now());

  // อ่านไฟล์ภาพ + ย่อขนาดเป็น JPEG (กันไฟล์ใหญ่)
  const fileToResizedDataUrl = (file, maxDim = 1280, quality = 0.72) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height >= width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSlipFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { setSlipPreview(await fileToResizedDataUrl(file)); } catch (err) {}
  };

  const uploadSlip = async (dataUrl) => {
    const base64 = String(dataUrl).split(',')[1];
    if (!base64) return;
    await fetch(GAS_URL, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'uploadSlip', base64, mimeType: 'image/jpeg', filename: `${billNo}.jpg` })
    });
  };

  const finishWithSlip = async (skip = false) => {
    if (!skip && slipPreview) {
      setSlipUploading(true);
      try { await uploadSlip(slipPreview); } catch (e) {}
      setSlipUploading(false);
    }
    setPaymentStep('success');
  };

  // แยกจ่าย (split payment)
  const [splitCash, setSplitCash] = useState('');
  const [splitTransfer, setSplitTransfer] = useState('');
  const [splitCard, setSplitCard] = useState('');

  const { subtotal, discountAmount, sc, vat, grand } = calcCharges(total, settings, selectedDiscount);
  const hasCharges = sc > 0 || vat > 0;
  const hasDiscount = discountAmount > 0;

  const cashAmount = parseFloat(cashInput) || 0;
  const change = cashAmount - grand;

  // ── PromptPay QR ── (เลขพร้อมเพย์ ตั้งได้ที่ตั้งค่าร้าน ไม่งั้นใช้ค่าเริ่มต้น)
  const promptPayId = settings?.promptPayId || '004000001641684';
  // ตั้งค่าเริ่มต้นให้เป็น kshop_dynamic อัตโนมัติเลย เพื่อให้เจนยอด K Shop ได้ทันที
  const qrType = settings?.qrType || 'kshop_dynamic';
  const staticQrUrl = settings?.staticQrUrl || '/kshop_qr.png';
  const [qrDataUrl, setQrDataUrl] = useState('');

  // ข้อมูลตั้งค่าเริ่มต้นแบบฝังในโค้ดตามคำขอของลูกค้า (K Shop Narai Pizzeria)
  const kshopRawPayload = settings?.kshopRawPayload || '00020101021130810016A00000067701011201150107536000315080214KB0000016416840320KPS004KB00000164168431690016A00000067701011301030040214KB0000016416840420KPS004KB00000164168453037645802TH6304A14E';
  const qrShopName = settings?.qrShopName || 'NARAI-KHANOY UNION MALL 4F.';
  const qrAccountName = settings?.qrAccountName || 'บจก. นารายณ์ พิซเซอเรีย';

  // ส่งคำขออนุมัติไปยังแอดมิน/แคชเชียร์
  const requestApproval = () => {
    // ปิดการใช้งานการขออนุมัติแล้ว
  };

  // เข้า/ออกขั้นเงินโอน: ปิดการยืนยัน/อนุมัติทันที
  useEffect(() => {
    if (paymentStep === 'transfer') {
      setQrApproved(true);
      setApprovalStatus('approved');
    } else {
      setQrApproved(true);
      setApprovalStatus('approved');
    }
  }, [paymentStep]);

  // โพลสถานะคำขออนุมัติ
  useEffect(() => {
    // ปิดการดึงสถานะ
  }, [paymentStep, approvalStatus, approvalId]);

  useEffect(() => {
    // สร้าง QR ทันทีโดยไม่ต้องรอแอดมิน/แคชเชียร์ยืนยัน (เฉพาะเมื่อเป็นแบบ dynamic หรือ kshop_dynamic)
    const isDynamic = qrType === 'dynamic' || qrType === 'kshop_dynamic';
    if (!isDynamic || paymentStep !== 'transfer' || grand <= 0) { setQrDataUrl(''); return; }
    let cancelled = false;

    let payload = '';
    if (qrType === 'kshop_dynamic') {
      payload = generateDynamicQRFromRaw(kshopRawPayload, grand);
    } else {
      payload = generatePromptPayPayload(promptPayId, grand);
    }

    if (payload) {
      QRCode.toDataURL(payload, { width: 320, margin: 1, errorCorrectionLevel: 'M' })
        .then(url => { if (!cancelled) setQrDataUrl(url); })
        .catch(() => { if (!cancelled) setQrDataUrl(''); });
    } else {
      setQrDataUrl('');
    }
    return () => { cancelled = true; };
  }, [paymentStep, grand, promptPayId, qrType, kshopRawPayload]);

  // split helpers
  const splitCashN = parseFloat(splitCash) || 0;
  const splitTransferN = parseFloat(splitTransfer) || 0;
  const splitCardN = parseFloat(splitCard) || 0;
  const splitSum = Math.round((splitCashN + splitTransferN + splitCardN) * 100) / 100;
  const splitRemaining = Math.round((grand - splitSum) * 100) / 100;
  const splitValid = splitRemaining === 0 && splitSum > 0 && [splitCashN, splitTransferN, splitCardN].filter(v => v > 0).length >= 2;

  const handleConfirmPayment = (method) => {
    if (method === 'เงินโอน') {
      // โอน/สแกนจ่าย → ไปขั้นแนบสลิปก่อน
      setPendingComplete({ method: 'เงินโอน' });
      setSlipPreview('');
      setPaymentStep('slip');
    } else {
      setPendingComplete({ method });
      setPaymentStep('success');
    }
  };

  const handleConfirmSplit = () => {
    if (!splitValid) return;
    const details = { cash: splitCashN, transfer: splitTransferN, card: splitCardN };
    setPendingComplete({ method: 'แยกจ่าย', details });
    if (splitTransferN > 0) {
      // มีการโอน → ต้องแนบสลิป
      setSlipPreview('');
      setPaymentStep('slip');
    } else {
      setPaymentStep('success');
    }
  };

  // ── ใบเสร็จ 80mm (พรีวิว + พิมพ์) ──
  const paidMethod = pendingComplete?.method || '';
  const buildReceiptHtml = () => {
    const now = new Date().toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const rows = (tableOrderItems || []).map(it => {
      const qty = Number(it.Quantity) || 1;
      const price = (Number(it.ItemPrice) || 0) * qty;
      const name = it.ItemName || '';
      const opt = it.Options ? `<div class="opt">${it.Options}</div>` : '';
      return `<div class="it"><div class="row"><span>${qty}× ${name}</span><span>฿${price.toLocaleString()}</span></div>${opt}</div>`;
    }).join('');
    const line = (k, v, cls = '') => `<div class="row ${cls}"><span>${k}</span><span>${v}</span></div>`;
    return `
      <div class="c xl">NaraiBoxset</div>
      <div class="c sm">ใบเสร็จรับเงิน / RECEIPT</div>
      <div class="hr"></div>
      ${line('บิลเลขที่', orderNumber || '-')}
      ${tableNo ? line('โต๊ะ', tableNo) : ''}
      ${line('วันที่', now)}
      ${paidMethod ? line('ชำระโดย', paidMethod) : ''}
      <div class="hr"></div>
      ${rows}
      <div class="hr"></div>
      ${(hasDiscount || hasCharges) ? line('ยอดอาหาร', `฿${subtotal.toLocaleString()}`) : ''}
      ${hasDiscount ? line(`ส่วนลด ${selectedDiscount?.name || ''}`, `-฿${discountAmount.toLocaleString()}`) : ''}
      ${sc > 0 ? line(`เซอร์วิสชาร์จ ${settings.serviceCharge.rate}%`, `+฿${sc.toLocaleString()}`) : ''}
      ${vat > 0 ? line(`VAT ${settings.vat.rate}%`, `+฿${vat.toLocaleString()}`) : ''}
      <div class="hr"></div>
      <div class="row tot"><span>รวมทั้งสิ้น</span><span>฿${grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      <div class="hr"></div>
      <div class="c sm">ขอบคุณที่ใช้บริการ</div>
    `;
  };

  const finalizeComplete = () => {
    const pc = pendingComplete || { method: 'เงินสด' };
    onComplete(grand, pc.method, pc.details);
  };

  const PriceBreakdown = ({ compact = false }) => (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px', padding: compact ? '0.85rem 1rem' : '1rem 1.25rem',
      marginBottom: compact ? '0.75rem' : '1.5rem'
    }}>
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

      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        marginTop: compact ? 0 : '0.75rem', paddingTop: '0.6rem',
        display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem'
      }}>
        {(hasDiscount || hasCharges) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)' }}>
            <span>{lang === 'th' ? 'ยอดอาหาร' : 'Subtotal'}</span>
            <span>฿{subtotal.toLocaleString()}</span>
          </div>
        )}
        {hasDiscount && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={13} /> {lang === 'th' ? `ส่วนลด: ${selectedDiscount.name}` : `Discount: ${selectedDiscount.name}`}
            </span>
            <span>-฿{discountAmount.toLocaleString()}</span>
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
        <div style={{
          display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.15rem',
          borderTop: (hasDiscount || hasCharges) ? '1px solid rgba(255,255,255,0.1)' : 'none',
          paddingTop: (hasDiscount || hasCharges) ? '0.45rem' : 0
        }}>
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
            <button
              onClick={() => setPaymentStep('discount')}
              className="confirm-btn"
              style={{ width: '100%' }}
            >
              {lang === 'th' ? `ดำเนินการชำระเงิน ฿${grand.toLocaleString()}` : `Proceed to Payment ฿${grand.toLocaleString()}`}
              <ChevronRight size={18} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '6px' }} />
            </button>
          </>
        )}

        {/* ── Step 1.5: เลือกส่วนลด ── */}
        {paymentStep === 'discount' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} color="var(--accent)" />
                {lang === 'th' ? 'เลือกส่วนลด' : 'Select Discount'}
              </h2>
              <button className="close-btn" onClick={() => setPaymentStep('summary')}><ArrowLeft size={22} /></button>
            </div>

            {/* ยอดปัจจุบัน */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1.25rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {lang === 'th' ? 'ยอดอาหาร' : 'Subtotal'}
              </span>
              <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'white' }}>
                ฿{subtotal.toLocaleString()}
              </span>
            </div>

            {/* ไม่ใช้ส่วนลด */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <button
                onClick={() => setSelectedDiscount(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.9rem 1.1rem', borderRadius: '12px', cursor: 'pointer',
                  border: `2px solid ${selectedDiscount === null ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  background: selectedDiscount === null ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  color: 'white', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%', textAlign: 'left'
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                  {lang === 'th' ? '❌ ไม่ใช้ส่วนลด' : '❌ No Discount'}
                </span>
                {selectedDiscount === null && (
                  <CheckCircle size={18} color="#22c55e" />
                )}
              </button>

              {discounts.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem',
                  border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px'
                }}>
                  {lang === 'th' ? 'ยังไม่มีส่วนลด (ตั้งค่าได้ที่ Admin → ส่วนลด)' : 'No discounts configured (Admin → Discounts)'}
                </div>
              ) : (
                discounts.map(d => {
                  const isSelected = selectedDiscount?.id === d.id;
                  const previewAmount = d.type === 'baht'
                    ? Math.min(Number(d.value), subtotal)
                    : Math.round(subtotal * Number(d.value)) / 100;
                  const previewGrand = subtotal - previewAmount;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDiscount(isSelected ? null : d)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.9rem 1.1rem', borderRadius: '12px', cursor: 'pointer',
                        border: `2px solid ${isSelected ? '#f87171' : 'rgba(248,113,113,0.2)'}`,
                        background: isSelected ? 'rgba(248,113,113,0.1)' : 'rgba(248,113,113,0.03)',
                        color: 'white', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%', textAlign: 'left'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <Tag size={15} color="#f87171" />
                          <span style={{ fontWeight: '700', fontSize: '0.97rem' }}>{d.name}</span>
                          <span style={{
                            padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                            background: d.type === 'baht' ? 'rgba(34,197,94,0.15)' : 'rgba(96,165,250,0.15)',
                            color: d.type === 'baht' ? '#22c55e' : '#60a5fa'
                          }}>
                            {d.type === 'baht' ? `-฿${Number(d.value).toLocaleString()}` : `-${d.value}%`}
                          </span>
                        </div>
                        {d.categories && d.categories.length > 0 && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '23px' }}>
                            {lang === 'th' ? 'ใช้กับ: ' : 'Applies to: '}
                            {d.categories.join(', ')}
                          </div>
                        )}
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', paddingLeft: '23px', marginTop: '2px' }}>
                          {lang === 'th' ? 'ประหยัด ' : 'Save '}
                          <strong style={{ color: '#f87171' }}>฿{previewAmount.toLocaleString()}</strong>
                          {lang === 'th' ? '  →  ยอดสุทธิ ' : '  →  Net '}
                          <strong style={{ color: '#fbbf24' }}>฿{previewGrand.toLocaleString()}</strong>
                        </div>
                      </div>
                      {isSelected && <CheckCircle size={20} color="#f87171" style={{ flexShrink: 0, marginLeft: '0.5rem' }} />}
                    </button>
                  );
                })
              )}
            </div>

            {/* ยอดหลังลด preview */}
            {hasDiscount && (
              <div style={{
                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: '#f87171', fontWeight: '600', fontSize: '0.9rem' }}>
                  {lang === 'th' ? `ส่วนลด: ${selectedDiscount.name}` : `Discount: ${selectedDiscount.name}`}
                </span>
                <span style={{ color: '#f87171', fontWeight: '800', fontSize: '1.1rem' }}>
                  -฿{discountAmount.toLocaleString()}
                </span>
              </div>
            )}

            <button
              onClick={() => setPaymentStep('payment_method')}
              className="confirm-btn"
              style={{ width: '100%' }}
            >
              {lang === 'th'
                ? `ชำระเงิน ฿${grand.toLocaleString()}`
                : `Pay ฿${grand.toLocaleString()}`}
              <ChevronRight size={18} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '6px' }} />
            </button>
          </>
        )}

        {/* ── Step 2: Payment Method ── */}
        {paymentStep === 'payment_method' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'th' ? 'วิธีชำระเงิน' : 'Payment Method'}</h2>
              <button className="close-btn" onClick={() => setPaymentStep('discount')}><ArrowLeft size={22} /></button>
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
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>{lang === 'th' ? 'เงินสด' : 'Cash'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'th' ? 'รับเงินสดและทอนเงิน' : 'Accept cash & calculate change'}</div>
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
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>{lang === 'th' ? 'เงินโอน / QR Code' : 'Transfer / QR Code'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'th' ? 'สแกน QR ที่เคาน์เตอร์' : 'Scan QR at the counter'}</div>
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
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>{lang === 'th' ? 'บัตรเครดิต / เดบิต' : 'Credit / Debit Card'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'th' ? 'รูดบัตร EDC ที่เคาน์เตอร์' : 'Swipe card at the counter'}</div>
                </div>
              </button>

              {/* แยกจ่าย */}
              <button
                onClick={() => { setSplitCash(''); setSplitTransfer(''); setSplitCard(''); setPaymentStep('split'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(168,85,247,0.07)', border: '1.5px solid rgba(168,85,247,0.25)', borderRadius: '14px', padding: '1rem 1.25rem', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', fontFamily: 'inherit', width: '100%' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(168,85,247,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(168,85,247,0.07)'}
              >
                <div style={{ background: 'rgba(168,85,247,0.15)', borderRadius: '50%', padding: '0.6rem', flexShrink: 0 }}>
                  <Split size={28} color="#a855f7" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>{lang === 'th' ? 'แยกจ่าย (หลายวิธี)' : 'Split Payment'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'th' ? 'ระบุจำนวนเงินแต่ละประเภท' : 'Specify amount per method'}</div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Step 3d: แยกจ่าย ── */}
        {paymentStep === 'split' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Split size={22} color="#a855f7" /> {lang === 'th' ? 'แยกจ่าย' : 'Split Payment'}
              </h2>
              <button className="close-btn" onClick={() => setPaymentStep('payment_method')}><ArrowLeft size={22} /></button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>{lang === 'th' ? 'ยอดที่ต้องชำระ' : 'Amount Due'}</p>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#fbbf24', lineHeight: 1 }}>฿{grand.toLocaleString()}</div>
            </div>

            {/* inputs */}
            {[
              { key: 'cash', label: lang === 'th' ? 'เงินสด' : 'Cash', icon: <Banknote size={20} color="#22c55e" />, color: '#22c55e', val: splitCash, set: setSplitCash },
              { key: 'transfer', label: lang === 'th' ? 'เงินโอน / QR' : 'Transfer / QR', icon: <Smartphone size={20} color="#60a5fa" />, color: '#60a5fa', val: splitTransfer, set: setSplitTransfer },
              { key: 'card', label: lang === 'th' ? 'บัตรเครดิต' : 'Card', icon: <CreditCard size={20} color="#fbbf24" />, color: '#fbbf24', val: splitCard, set: setSplitCard },
            ].map(row => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '130px' }}>
                  <div style={{ background: `${row.color}22`, borderRadius: '50%', padding: '0.4rem', display: 'flex' }}>{row.icon}</div>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{row.label}</span>
                </div>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: '700' }}>฿</span>
                  <input
                    type="number" min="0" step="1" placeholder="0"
                    value={row.val} onChange={e => row.set(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 1.6rem', background: 'rgba(0,0,0,0.3)', border: `2px solid ${row.color}55`, borderRadius: '10px', color: 'white', fontSize: '1.15rem', fontWeight: '700', textAlign: 'right', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={() => row.set(String(Math.max(0, splitRemaining + (parseFloat(row.val) || 0))))}
                  title={lang === 'th' ? 'เติมส่วนที่เหลือ' : 'Fill remaining'}
                  style={{ background: `${row.color}22`, border: `1px solid ${row.color}55`, borderRadius: '8px', color: row.color, cursor: 'pointer', padding: '0.5rem 0.6rem', fontSize: '0.75rem', fontWeight: '700', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  {lang === 'th' ? 'ที่เหลือ' : 'Rest'}
                </button>
              </div>
            ))}

            {/* running total */}
            <div style={{
              background: splitRemaining === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${splitRemaining === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '12px', padding: '0.85rem 1rem', margin: '1rem 0 1.25rem',
              display: 'flex', flexDirection: 'column', gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)' }}>
                <span>{lang === 'th' ? 'รวมที่กรอก' : 'Entered'}</span>
                <span style={{ fontWeight: '700', color: 'white' }}>฿{splitSum.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: '800', color: splitRemaining === 0 ? '#22c55e' : (splitRemaining < 0 ? '#ef4444' : '#fbbf24') }}>
                <span>
                  {splitRemaining === 0
                    ? (lang === 'th' ? 'ครบพอดี ✓' : 'Balanced ✓')
                    : splitRemaining > 0
                      ? (lang === 'th' ? 'ยังขาด' : 'Remaining')
                      : (lang === 'th' ? 'เกิน' : 'Over')}
                </span>
                <span>{splitRemaining >= 0 ? `฿${splitRemaining.toLocaleString()}` : `-฿${Math.abs(splitRemaining).toLocaleString()}`}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmSplit}
              disabled={!splitValid}
              className="confirm-btn"
              style={{ width: '100%', background: splitValid ? '#a855f7' : 'rgba(255,255,255,0.1)', cursor: splitValid ? 'pointer' : 'not-allowed', opacity: splitValid ? 1 : 0.5 }}
            >
              <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              {lang === 'th' ? 'ยืนยันการแยกจ่าย' : 'Confirm Split Payment'}
            </button>
            {!splitValid && splitSum > 0 && splitRemaining === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.6rem' }}>
                {lang === 'th' ? 'ต้องระบุอย่างน้อย 2 ประเภท' : 'Select at least 2 methods'}
              </p>
            )}
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
              {(hasCharges || hasDiscount) && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  {lang === 'th' ? '(รวมส่วนลดและค่าบริการแล้ว)' : '(incl. discount & charges)'}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                {lang === 'th' ? 'รับเงินมา (บาท)' : 'Cash Received (THB)'}
              </label>
              <input
                type="number" min={grand} step="1" placeholder={`฿${Math.ceil(grand)}`}
                value={cashInput} onChange={e => setCashInput(e.target.value)} autoFocus
                style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(34,197,94,0.4)', borderRadius: '12px', color: 'white', fontSize: '1.5rem', fontWeight: '700', textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

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
            {!qrApproved ? (
              /* ── ส่งคำขอให้แอดมิน/แคชเชียร์อนุมัติ (ข้ามเครื่อง) ── */
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>
                  {approvalStatus === 'rejected' ? '❌' : '⏳'}
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', color: 'white' }}>
                  {approvalStatus === 'rejected'
                    ? (lang === 'th' ? 'คำขอถูกปฏิเสธ' : 'Request Rejected')
                    : (lang === 'th' ? 'รอการอนุมัติ' : 'Waiting for Approval')}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 auto 1.1rem', maxWidth: '330px' }}>
                  {approvalStatus === 'rejected'
                    ? (lang === 'th' ? 'ผู้มีสิทธิ์ปฏิเสธคำขอนี้ กดเพื่อขออนุมัติใหม่อีกครั้ง' : 'The request was rejected. Tap to request approval again.')
                    : (lang === 'th' ? 'ได้ส่งแจ้งเตือนไปยังแอดมิน/แคชเชียร์แล้ว กรุณารอการกดยืนยัน ระบบจะสร้าง QR ให้อัตโนมัติ' : 'Notified admin/cashier. Waiting for confirmation — the QR will appear automatically.')}
                </p>

                <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: '12px', padding: '1rem', maxWidth: '320px', margin: '0 auto 1.1rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>{lang === 'th' ? 'ยอดที่ต้องชำระ' : 'Amount Due'}</div>
                  <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1.8rem' }}>฿{grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                    {lang === 'th' ? 'บิล' : 'Bill'} {orderNumber}{tableNo ? ` · ${lang === 'th' ? 'โต๊ะ' : 'Table'} ${tableNo}` : ''}
                  </div>
                </div>

                {approvalStatus === 'pending' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#60a5fa', fontSize: '0.9rem', fontWeight: 600 }}>
                    <Clock size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
                    {lang === 'th' ? 'กำลังรอผู้มีสิทธิ์กดยืนยัน...' : 'Waiting for approval...'}
                  </div>
                )}

                {approvalStatus === 'rejected' && (
                  <button
                    onClick={requestApproval}
                    className="confirm-btn"
                    style={{ width: '100%', background: '#60a5fa' }}
                  >
                    {lang === 'th' ? 'ขออนุมัติใหม่' : 'Request Again'}
                  </button>
                )}
              </div>
            ) : (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'white' }}>
                {lang === 'th' ? 'สแกนเพื่อชำระเงิน' : 'Scan to Pay'}
              </h3>
              {approverName && (
                <p style={{ color: '#22c55e', fontSize: '0.8rem', margin: '0 0 0.25rem' }}>
                  ✓ {lang === 'th' ? `อนุมัติโดย ${approverName}` : `Approved by ${approverName}`}
                </p>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 0.85rem' }}>
                {lang === 'th' ? 'พร้อมเพย์ (PromptPay) — รองรับทุกแอปธนาคาร' : 'PromptPay — works with any Thai banking app'}
              </p>

              {/* PromptPay QR card */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '1rem 1rem 1.25rem', maxWidth: '320px', margin: '0 auto 1rem', boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#003d6a', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.5px' }}>THAI QR PAYMENT</span>
                </div>
                <div style={{ background: '#003d6a', color: 'white', fontWeight: 800, fontSize: '0.9rem', borderRadius: '8px', padding: '0.35rem', marginBottom: '0.85rem' }}>
                  PromptPay
                </div>
                {qrType === 'static' ? (
                  <img src={staticQrUrl} alt="K Shop QR" style={{ width: '100%', maxWidth: '260px', display: 'block', margin: '0 auto' }} />
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="PromptPay QR" style={{ width: '100%', maxWidth: '260px', display: 'block', margin: '0 auto' }} />
                ) : (
                  <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                    {lang === 'th' ? 'กำลังสร้าง QR...' : 'Generating QR...'}
                  </div>
                )}
                <div style={{ color: '#003d6a', marginTop: '0.65rem' }}>
                  <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>
                    {qrType === 'static' ? (
                      (lang === 'th' ? 'สแกน QR ร้านค้าด้านบน' : 'Scan merchant QR above')
                    ) : qrType === 'kshop_dynamic' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center', color: '#003d6a', fontWeight: '700' }}>
                        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          {qrShopName}
                        </div>
                        <div style={{ fontWeight: 'normal', opacity: 0.9 }}>
                          บัญชี: {qrAccountName}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 'normal', opacity: 0.7 }}>
                          เลขอ้างอิง: {parseKShopPayload(kshopRawPayload)?.ref2 || 'KPS004KB000001641684'}
                        </div>
                      </div>
                    ) : (
                      (lang === 'th' ? 'พร้อมเพย์ ID' : 'PromptPay ID') + ': ' + promptPayId
                    )}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '0.15rem' }}>฿{grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {lang === 'th' ? 'บิลเลขที่:' : 'Bill No:'} <strong style={{ color: 'var(--accent)' }}>{orderNumber}</strong>
              </p>
              <button onClick={() => handleConfirmPayment('เงินโอน')} className="confirm-btn" style={{ background: '#60a5fa', width: '100%' }}>
                <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                {lang === 'th' ? 'ยืนยันรับเงินโอนแล้ว' : 'Confirm Transfer Received'}
              </button>
            </div>
            )}
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
                <p style={{ color: 'white', fontWeight: '600', margin: '0 0 0.35rem' }}>{lang === 'th' ? '💳 เครื่อง EDC ที่เคาน์เตอร์' : '💳 EDC Machine at Counter'}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{lang === 'th' ? 'นำบัตรไปรูดที่พนักงานแคชเชียร์' : 'Present card to the cashier'}</p>
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

        {/* ── Step 3e: แนบสลิปการโอน ── */}
        {paymentStep === 'slip' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={22} color="#60a5fa" /> {lang === 'th' ? 'แนบสลิปการโอน' : 'Attach Transfer Slip'}
              </h2>
              <button className="close-btn" onClick={onClose}><X size={24} /></button>
            </div>

            <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>
                {lang === 'th' ? 'ถ่ายรูปหรืออัปโหลดสลิป แล้วบันทึก' : 'Take a photo or upload the slip, then save'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {lang === 'th' ? 'บิลเลขที่:' : 'Bill No:'} <strong style={{ color: 'var(--accent)' }}>{orderNumber}</strong>
                {' · '}<span style={{ color: '#fbbf24', fontWeight: 700 }}>฿{grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>

              {/* preview */}
              {slipPreview ? (
                <div style={{ marginBottom: '1rem' }}>
                  <img src={slipPreview} alt="slip" style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)' }} />
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', padding: '2rem 1rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {lang === 'th' ? 'ยังไม่ได้เลือกรูปสลิป' : 'No slip selected yet'}
                </div>
              )}

              {/* choose source */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', background: 'rgba(96,165,250,0.12)', border: '1.5px solid rgba(96,165,250,0.4)', borderRadius: '12px', color: '#60a5fa', fontWeight: 700, cursor: 'pointer' }}>
                  <Camera size={18} /> {lang === 'th' ? 'ถ่ายรูป' : 'Camera'}
                  <input type="file" accept="image/*" capture="environment" onChange={handleSlipFile} style={{ display: 'none' }} />
                </label>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  <Upload size={18} /> {lang === 'th' ? 'อัปโหลดไฟล์' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handleSlipFile} style={{ display: 'none' }} />
                </label>
              </div>

              <button
                onClick={() => finishWithSlip(false)}
                disabled={!slipPreview || slipUploading}
                className="confirm-btn"
                style={{ width: '100%', background: (slipPreview && !slipUploading) ? '#22c55e' : 'rgba(255,255,255,0.1)', cursor: (slipPreview && !slipUploading) ? 'pointer' : 'not-allowed', opacity: (slipPreview && !slipUploading) ? 1 : 0.5 }}
              >
                <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                {slipUploading ? (lang === 'th' ? 'กำลังอัปโหลด...' : 'Uploading...') : (lang === 'th' ? 'บันทึกสลิปและเสร็จสิ้น' : 'Save Slip & Finish')}
              </button>
              <button
                onClick={() => finishWithSlip(true)}
                disabled={slipUploading}
                style={{ width: '100%', marginTop: '0.6rem', padding: '0.6rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                {lang === 'th' ? 'ข้ามไปก่อน (ไม่แนบสลิป)' : 'Skip (no slip)'}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Success + พรีวิวใบเสร็จ ── */}
        {paymentStep === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 0.5rem' }} />
            <h3 style={{ color: '#22c55e', margin: '0 0 0.25rem' }}>{lang === 'th' ? 'ชำระเงินสำเร็จ!' : 'Payment Successful!'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              {lang === 'th' ? 'พรีวิวใบเสร็จ (80mm)' : 'Receipt preview (80mm)'}
            </p>

            {/* พรีวิวใบเสร็จจริงที่จะพิมพ์ */}
            <div style={{ background: 'white', borderRadius: '8px', width: '302px', maxWidth: '100%', margin: '0 auto 1.25rem', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', textAlign: 'left', overflow: 'hidden' }}>
              <style>{scopedSlipCss('.slip-body')}</style>
              <div className="slip-body" dangerouslySetInnerHTML={{ __html: buildReceiptHtml() }} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => print80mm(buildReceiptHtml())}
                style={{ flex: 1, padding: '0.85rem', background: 'rgba(96,165,250,0.15)', border: '1.5px solid rgba(96,165,250,0.45)', borderRadius: '12px', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Printer size={18} /> {lang === 'th' ? 'พิมพ์ใบเสร็จ' : 'Print'}
              </button>
              <button
                onClick={finalizeComplete}
                className="confirm-btn"
                style={{ flex: 1.4, background: '#22c55e' }}
              >
                <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                {lang === 'th' ? 'เสร็จสิ้น' : 'Done'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutModal;
