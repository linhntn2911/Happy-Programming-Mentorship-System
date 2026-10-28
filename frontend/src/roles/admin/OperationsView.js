import { escapeHtml as e } from '../../shared/html.js';
export function OperationsView(settings) {
  return `<section class="admin-panel mt-6"><div class="admin-panel-heading"><div><h2>System operations</h2><p>Configure OTP timing, withdrawals, earnings holds, maintenance and announcements.</p></div></div>
  <form id="admin-operations" class="admin-panel-body admin-form">
  <div class="admin-form-grid">
  ${[['otpResendSeconds','OTP resend wait (seconds)',30,3600,settings.otpResendSeconds],['otpExpiryMinutes','OTP validity (minutes)',1,30,settings.otpExpiryMinutes],['withdrawalThreshold','Withdrawals must exceed (VND)',10000,999999999,settings.withdrawalThreshold],['withdrawalFee','Fixed fee per withdrawal (VND)',0,10000,settings.withdrawalFee],['earningsHoldDays','Earnings hold (days)',1,90,settings.earningsHoldDays]].map(([name,label,min,max,value])=>`<label class="admin-field" for="operations-${name}">${label}<input id="operations-${name}" name="${name}" type="number" min="${min}" max="${max}" step="1" value="${e(value)}" required></label>`).join('')}
  </div><p class="text-muted">A withdrawal must be strictly above the threshold. The fee is deducted from the requested amount. Existing payouts and funded payment hold periods stay unchanged.</p>
  <label class="admin-field" for="operations-maintenance"><span><input type="checkbox" id="operations-maintenance" name="maintenance" ${settings.maintenance ? 'checked' : ''}> Enable maintenance mode</span><span class="text-muted">Members cannot use business functions. Administrator access and payment callbacks remain available.</span></label>
  <label class="admin-field" for="operations-announcement">System announcement<textarea id="operations-announcement" name="announcement" maxlength="2000" rows="4">${e(settings.announcement)}</textarea><span class="text-muted">Plain text only. Leave blank to hide the announcement.</span></label>
  <label class="admin-field" for="operations-reason">Reason for change<textarea id="operations-reason" name="reason" maxlength="1000" rows="2" required></textarea></label>
  <div class="admin-actions"><button class="btn btn-primary" type="submit">Review operational changes</button></div></form></section>`;
}
