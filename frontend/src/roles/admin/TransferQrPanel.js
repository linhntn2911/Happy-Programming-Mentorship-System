import { escapeHtml as e } from '../../shared/html.js';

/**
 * Normalizes user-entered bank names/strings into canonical VietQR/Napas bank codes.
 * Supports accented and unaccented Vietnamese, short names, and abbreviations.
 */
export function normalizeBankCode(name = '') {
  const normalized = String(name || '')
    .replaceAll('đ', 'd')
    .replaceAll('Đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (normalized.includes('tpbank') || normalized.includes('tpb') || normalized.includes('tienphong')) return 'TPB';
  if (normalized.includes('vietcom') || normalized.includes('vcb') || normalized.includes('ngoaithuong')) return 'VCB';
  if (normalized.includes('techcom') || normalized.includes('tcb') || normalized.includes('kythuong')) return 'TCB';
  if (normalized.includes('sacom') || normalized.includes('stb')) return 'STB';
  if (normalized.includes('vietin') || normalized.includes('viettin') || normalized.includes('icb') || normalized.includes('ctg') || normalized.includes('congthuong')) return 'ICB';
  if (normalized.includes('bidv')) return 'BIDV';
  if (normalized.includes('agri') || normalized.includes('vba') || normalized.includes('nongnghiep')) return 'VBA';
  if (normalized.includes('vpbank') || normalized.includes('vpb') || normalized.includes('thinhvuong')) return 'VPB';
  if (normalized.includes('acb') || normalized.includes('achau')) return 'ACB';
  if (normalized.includes('hdbank') || normalized.includes('hdb')) return 'HDB';
  if (normalized.includes('mbbank') || normalized.includes('quandoi') || /^mb($|bank)/.test(normalized) || normalized === 'mb') return 'MB';
  if (normalized.includes('shb')) return 'SHB';
  if (normalized.includes('vib')) return 'VIB';
  if (normalized.includes('ocb') || normalized.includes('phuongdong')) return 'OCB';
  if (normalized.includes('msb') || normalized.includes('hanghai')) return 'MSB';
  if (normalized.includes('seabank') || normalized.includes('seab')) return 'SEAB';
  if (normalized.includes('baca') || normalized.includes('bab')) return 'BAB';
  if (normalized.includes('pvcom') || normalized.includes('pvcb')) return 'PVCB';
  if (normalized.includes('lpbank') || normalized.includes('lienviet') || normalized.includes('lpb')) return 'LPB';
  if (normalized.includes('nama') || normalized.includes('nab')) return 'NAB';
  if (normalized.includes('kienlong') || normalized.includes('klb')) return 'KLB';
  if (normalized.includes('saigon') || normalized.includes('sgb')) return 'SGB';
  if (normalized.includes('baoviet') || normalized.includes('bvb')) return 'BVB';
  if (normalized.includes('vieta') || normalized.includes('vab')) return 'VAB';
  if (normalized.includes('ncb') || normalized.includes('quocdan')) return 'NCB';
  if (normalized.includes('cake')) return 'CAKE';
  if (normalized.includes('timo')) return 'TIMO';
  if (normalized.includes('shinhan') || normalized.includes('shbvn')) return 'SHBVN';
  if (normalized.includes('woori')) return 'WOO';
  if (normalized.includes('scb')) return 'SCB';
  if (normalized.includes('exim') || normalized.includes('eib')) return 'EIB';
  if (normalized.includes('abbank') || normalized.includes('abb')) return 'ABB';
  return String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Builds VietQR and SePay QR URLs with exact transfer amount and metadata.
 */
export function buildTransferQrUrls({ bankName, accountNumber, accountName, amount, description }) {
  const bankCode = normalizeBankCode(bankName);
  const cleanAcc = String(accountNumber || '').replace(/[^0-9A-Za-z]/g, '');
  const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
  const des = String(description || '').trim().slice(0, 30);
  const accName = String(accountName || '').trim();

  const vietQrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(cleanAcc)}-compact2.png?amount=${cleanAmount}&addInfo=${encodeURIComponent(des)}&accountName=${encodeURIComponent(accName)}`;
  const sepayQrUrl = `https://qr.sepay.vn/img?bank=${encodeURIComponent(bankCode)}&acc=${encodeURIComponent(cleanAcc)}&template=compact&amount=${cleanAmount}&des=${encodeURIComponent(des)}`;

  return { vietQrUrl, sepayQrUrl, bankCode, cleanAcc, cleanAmount, des, accName };
}

/**
 * Renders the QR payment card and bank destination facts for Admin manual bank transfers.
 */
export function TransferQrPanel({
  recipientLabel = 'Recipient',
  recipientName = '',
  recipientEmail = '',
  amount = 0,
  feeAmount = 0,
  netAmount = null,
  bankName = '',
  accountNumber = '',
  accountName = '',
  referenceCode = '',
  memoPrefix = 'REFUND',
  contextNote = '',
  showReceiptUpload = false
}) {
  const rawTransferAmount = Math.max(0, Math.round(Number(netAmount !== null ? netAmount : amount) || 0));
  const amountFormatted = rawTransferAmount.toLocaleString('vi-VN');
  const cleanAcc = String(accountNumber || '').trim();
  const bankCode = normalizeBankCode(bankName);
  const cleanAccountName = String(accountName || recipientName || '').trim();
  const transferMemo = `${memoPrefix} ${referenceCode}`.trim().slice(0, 30);

  const hasValidAccount = Boolean(cleanAcc && !cleanAcc.includes('*') && cleanAcc.length >= 6);

  const { vietQrUrl, sepayQrUrl } = hasValidAccount
    ? buildTransferQrUrls({
        bankName,
        accountNumber: cleanAcc,
        accountName: cleanAccountName,
        amount: rawTransferAmount,
        description: transferMemo,
      })
    : { vietQrUrl: '', sepayQrUrl: '' };

  const qrMarkup = hasValidAccount
    ? `<div class="mb-4 rounded-2xl border border-brand/20 bg-gradient-to-b from-lilac/30 to-cream p-4 text-center">
        <div class="inline-block rounded-xl bg-white p-2 shadow-sm border border-line">
          <img
            src="${e(vietQrUrl)}"
            alt="VietQR Transfer Payment"
            class="h-44 w-44 object-contain mx-auto"
            onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='${e(sepayQrUrl)}';}"
          />
        </div>
        <p class="mt-2 text-xs font-semibold text-ink">Scan with any Mobile Banking App (Napas 24/7)</p>
        <p class="text-[11px] text-muted">Auto-fills destination, note &amp; exact amount: <strong class="text-brand font-bold">${amountFormatted} VND</strong></p>
      </div>`
    : `<div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        Account number is missing or masked. Please transfer manually using bank details below.
      </div>`;

  return `
    <div class="admin-transfer-qr-panel">
      ${qrMarkup}

      <div class="rounded-xl border border-line bg-cream p-3 text-xs space-y-2 mb-4">
        <div class="flex items-center justify-between gap-2 border-b border-line pb-1.5">
          <span class="text-muted">${e(recipientLabel)}:</span>
          <strong class="text-ink font-semibold">${e(recipientName)}${recipientEmail ? ` <span class="text-muted font-normal text-[11px]">(${e(recipientEmail)})</span>` : ''}</strong>
        </div>
        <div class="flex items-center justify-between gap-2 border-b border-line pb-1.5">
          <span class="text-muted">Receiving Bank:</span>
          <strong class="text-ink font-semibold">${e(bankName || 'N/A')}${bankCode ? ` <span class="text-brand text-[11px]">(${e(bankCode)})</span>` : ''}</strong>
        </div>
        <div class="flex items-center justify-between gap-2 border-b border-line pb-1.5">
          <span class="text-muted">Account Number:</span>
          <div class="flex items-center gap-1.5">
            <code class="font-mono font-bold text-ink">${e(cleanAcc || 'N/A')}</code>
            ${cleanAcc && !cleanAcc.includes('*') ? `<button type="button" class="btn btn-outline btn-xs px-1.5 py-0.5 text-[10px]" data-copy-text="${e(cleanAcc)}" title="Copy account number">Copy</button>` : ''}
          </div>
        </div>
        <div class="flex items-center justify-between gap-2 border-b border-line pb-1.5">
          <span class="text-muted">Account Holder:</span>
          <strong class="uppercase text-ink font-semibold">${e(cleanAccountName || 'N/A')}</strong>
        </div>
        <div class="flex items-center justify-between gap-2 border-b border-line pb-1.5">
          <span class="text-muted">Exact Amount:</span>
          <div class="flex items-center gap-1.5">
            <strong class="font-bold text-brand">${amountFormatted} VND</strong>
            ${feeAmount ? `<span class="text-muted text-[10px]">(Fee: ${Number(feeAmount).toLocaleString('vi-VN')} VND)</span>` : ''}
            <button type="button" class="btn btn-outline btn-xs px-1.5 py-0.5 text-[10px]" data-copy-text="${rawTransferAmount}" title="Copy amount">Copy</button>
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-muted">Transfer Note:</span>
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-[11px] text-ink font-medium">${e(transferMemo)}</span>
            <button type="button" class="btn btn-outline btn-xs px-1.5 py-0.5 text-[10px]" data-copy-text="${e(transferMemo)}" title="Copy note">Copy</button>
          </div>
        </div>
      </div>

      ${contextNote ? `<p class="text-xs text-muted mb-3">${e(contextNote)}</p>` : ''}

      ${showReceiptUpload ? `
      <label class="admin-field mt-3">Upload transfer receipt / proof (evidence for mentee)
        <input type="file" id="admin-receipt-file" name="receiptFile" accept="image/png,image/jpeg,image/webp" class="mt-1 block w-full text-xs text-muted file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-lilac file:text-brand hover:file:bg-brand hover:file:text-white cursor-pointer">
        <span class="text-[11px] text-muted">Supports PNG, JPG, WEBP up to 5 MB. Verified receipt sent to mentee and mediation chat.</span>
      </label>
      <div id="receipt-preview-container" class="mt-2 hidden">
        <div class="relative inline-block border border-line rounded-lg overflow-hidden bg-white p-1">
          <img id="receipt-preview-img" src="" alt="Receipt Preview" class="max-h-36 max-w-full rounded object-contain" />
          <button type="button" id="receipt-remove-btn" class="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-rose-700 leading-none" title="Remove image">&times;</button>
        </div>
      </div>
      ` : ''}

      <label class="admin-field mt-3">Bank transfer reference
        <input name="transferReference" maxlength="150" required placeholder="e.g. MBVCB.123456789">
      </label>
    </div>
  `;
}
