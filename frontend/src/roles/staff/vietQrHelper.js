/**
 * Helper to normalize Vietnamese bank names and generate VietQR image URLs for manual bank transfer.
 */
const BANK_CODE_MAP = {
  vietcombank: 'vietcombank', vcb: 'vietcombank',
  mbbank: 'mb', mb: 'mb',
  techcombank: 'techcombank', tcb: 'techcombank',
  vietinbank: 'vietinbank', icb: 'vietinbank',
  bidv: 'bidv',
  tpbank: 'tpbank', tpb: 'tpbank',
  acb: 'acb',
  vpbank: 'vpbank', vpb: 'vpbank',
  agribank: 'agribank', vba: 'agribank',
  sacombank: 'sacombank', stb: 'sacombank',
  vib: 'vib',
  shb: 'shb',
  hdbank: 'hdbank', hdb: 'hdbank',
  ocb: 'ocb',
  msb: 'msb',
  seabank: 'seabank',
  lpbank: 'lpbank', lpb: 'lpbank',
  lienvietpostbank: 'lpbank',
  namabank: 'namabank',
  pvcombank: 'pvcombank',
  bacabank: 'bacabank',
  kienlongbank: 'kienlongbank',
  baovietbank: 'baovietbank',
  wooribank: 'woori',
  shinhanbank: 'shinhan', shinhan: 'shinhan'
};

export function getVietQrBankCode(bankName = '') {
  const normalized = String(bankName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return BANK_CODE_MAP[normalized] || normalized || 'vcb';
}

export function buildVietQrUrl({ bankName, accountNumber, amount, memo = '', accountName = '' }) {
  const bankCode = getVietQrBankCode(bankName);
  const cleanAccount = String(accountNumber || '').replace(/[^0-9a-zA-Z]/g, '');
  const cleanAmount = Math.round(Number(amount) || 0);
  const params = new URLSearchParams();
  if (cleanAmount > 0) params.set('amount', String(cleanAmount));
  if (memo) params.set('addInfo', memo);
  if (accountName) params.set('accountName', accountName);
  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(cleanAccount)}-compact2.png?${params.toString()}`;
}
