import { normalizeBankCode } from '../roles/admin/TransferQrPanel.js';

export const VIETNAM_BANKS = [
  { code: 'TPB', shortName: 'TPBank', label: 'TPBank (Ngân hàng Tiên Phong)' },
  { code: 'VCB', shortName: 'Vietcombank', label: 'Vietcombank (Ngân hàng Ngoại Thương)' },
  { code: 'TCB', shortName: 'Techcombank', label: 'Techcombank (Ngân hàng Kỹ Thương)' },
  { code: 'MB', shortName: 'MB Bank', label: 'MB Bank (Ngân hàng Quân Đội)' },
  { code: 'ACB', shortName: 'ACB', label: 'ACB (Ngân hàng Á Châu)' },
  { code: 'VPB', shortName: 'VPBank', label: 'VPBank (Ngân hàng VN Thịnh Vượng)' },
  { code: 'BIDV', shortName: 'BIDV', label: 'BIDV (Ngân hàng Đầu tư & Phát triển VN)' },
  { code: 'VBA', shortName: 'Agribank', label: 'Agribank (Ngân hàng Nông Nghiệp)' },
  { code: 'ICB', shortName: 'VietinBank', label: 'VietinBank (Ngân hàng Công Thương)' },
  { code: 'STB', shortName: 'Sacombank', label: 'Sacombank (Ngân hàng Sài Gòn Thương Tín)' },
  { code: 'VIB', shortName: 'VIB', label: 'VIB (Ngân hàng Quốc Tế)' },
  { code: 'HDB', shortName: 'HDBank', label: 'HDBank (Ngân hàng Phát triển TP.HCM)' },
  { code: 'SHB', shortName: 'SHB', label: 'SHB (Ngân hàng Sài Gòn - Hà Nội)' },
  { code: 'MSB', shortName: 'MSB', label: 'MSB (Ngân hàng Hàng Hải)' },
  { code: 'OCB', shortName: 'OCB', label: 'OCB (Ngân hàng Phương Đông)' },
  { code: 'SEAB', shortName: 'SeABank', label: 'SeABank (Ngân hàng Đông Nam Á)' },
  { code: 'LPB', shortName: 'LPBank', label: 'LPBank (Ngân hàng Lộc Phát Việt Nam)' },
  { code: 'CAKE', shortName: 'Cake by VPBank', label: 'Cake by VPBank (Ngân hàng số Cake)' },
  { code: 'TIMO', shortName: 'Timo', label: 'Timo (Ngân hàng số Timo)' },
  { code: 'PVCB', shortName: 'PVcomBank', label: 'PVcomBank (Ngân hàng Đại Chúng)' },
  { code: 'BAB', shortName: 'Bac A Bank', label: 'Bac A Bank (Ngân hàng Bắc Á)' },
  { code: 'NAB', shortName: 'Nam A Bank', label: 'Nam A Bank (Ngân hàng Nam Á)' },
  { code: 'KLB', shortName: 'KienlongBank', label: 'KienlongBank (Ngân hàng Kiên Long)' },
  { code: 'BVB', shortName: 'BaoViet Bank', label: 'BaoViet Bank (Ngân hàng Bảo Việt)' },
  { code: 'VAB', shortName: 'Viet A Bank', label: 'Viet A Bank (Ngân hàng Việt Á)' },
  { code: 'NCB', shortName: 'NCB', label: 'NCB (Ngân hàng Quốc Dân)' },
  { code: 'SHBVN', shortName: 'Shinhan Bank', label: 'Shinhan Bank (Ngân hàng Shinhan VN)' },
  { code: 'WOO', shortName: 'Woori Bank', label: 'Woori Bank (Ngân hàng Woori VN)' },
  { code: 'EIB', shortName: 'Eximbank', label: 'Eximbank (Ngân hàng Xuất Nhập Khẩu)' },
  { code: 'ABB', shortName: 'ABBANK', label: 'ABBANK (Ngân hàng An Bình)' },
  { code: 'SGB', shortName: 'Saigonbank', label: 'Saigonbank (Ngân hàng Sài Gòn Công Thương)' }
];

/**
 * Finds the matching bank object from a user string by resolving its normalized VietQR code.
 */
export function findMatchingBank(name = '') {
  if (!name) return null;
  const targetCode = normalizeBankCode(name);
  return VIETNAM_BANKS.find(b => b.code === targetCode) || null;
}

/**
 * Generates options for a <select> element.
 */
export function renderBankSelectOptions(selectedName = '') {
  const matched = findMatchingBank(selectedName);
  const matchedShort = matched ? matched.shortName : '';
  const isOther = Boolean(selectedName && !matched);

  const options = VIETNAM_BANKS.map(b => {
    const isSelected = matchedShort === b.shortName;
    return `<option value="${b.shortName}"${isSelected ? ' selected' : ''}>${b.label}</option>`;
  }).join('');

  return `
    <option value="">-- Select bank (VietQR supported) --</option>
    ${options}
    <option value="__OTHER__"${isOther ? ' selected' : ''}>Other bank (Enter manually)...</option>
  `;
}
