// สร้าง payload มาตรฐาน PromptPay (EMVCo) สำหรับทำ QR ชำระเงิน
// รองรับเบอร์มือถือ / เลขบัตรประชาชน(13หลัก) / เลขผู้เสียภาษี และใส่ยอดเงินได้

// ฟิลด์รูปแบบ TLV: id(2) + length(2) + value
const field = (id, value) => {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
};

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — ใช้ปิดท้าย payload
const crc16 = (data) => {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

// target = เบอร์มือถือ หรือ เลขบัตร/เลขผู้เสียภาษี ; amount = ยอดเงิน (บาท, ไม่ใส่ก็ได้)
export function generatePromptPayPayload(target, amount) {
  const id = String(target || '').replace(/[^0-9]/g, '');
  const amt = Number(amount);
  const hasAmount = Number.isFinite(amt) && amt > 0;

  // มากกว่าหรือเท่ากับ 13 หลัก = เลขบัตรประชาชน/เลขผู้เสียภาษี (tag 02), ไม่งั้นเป็นเบอร์มือถือ (tag 01)
  const acctTarget = id.length >= 13
    ? field('02', id)
    : field('01', ('0000000000000' + id.replace(/^0/, '66')).slice(-13));

  const merchantAccount = field('29', field('00', 'A000000677010111') + acctTarget);

  let payload =
    field('00', '01') +                          // Payload Format Indicator
    field('01', hasAmount ? '12' : '11') +        // 12 = dynamic (มียอด), 11 = static
    merchantAccount +                             // PromptPay merchant account
    field('53', '764') +                          // สกุลเงิน THB
    (hasAmount ? field('54', amt.toFixed(2)) : '') + // ยอดเงิน
    field('58', 'TH');                            // ประเทศ

  payload += '6304'; // CRC tag + length
  return payload + crc16(payload);
}
