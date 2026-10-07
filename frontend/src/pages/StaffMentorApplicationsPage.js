import { AuthShell } from './LoginPage.js';
import { mentorApplicationService as service } from '../services/mentorApplicationService.js';

const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
export async function mountStaffMentorApplications(root) {
  document.title = 'Mentor applications | HappyProgramming';
  root.innerHTML = AuthShell('<h1 class="font-display auth-title">Mentor applications</h1><div id="review-content" aria-live="polite">Loading applications…</div>');
  const content = root.querySelector('#review-content');
  try {
    const applications = await service.queue();
    if (!content.isConnected) return;
    content.innerHTML = applications.length ? applications.map(a => `
      <article class="rounded-2xl border border-line bg-white p-5 mb-6 space-y-4" data-application="${a.id}">
        <h2 class="text-xl font-semibold text-ink">${escape(a.name)}</h2>
        <p class="text-sm text-muted break-all">${escape(a.email)}</p>
        <span class="badge">Pending review</span>
        <dl class="text-sm space-y-3 break-words">
          ${Object.entries(a.profile || {}).filter(([k]) => !['firstName','lastName','email','cvFileName','photoDataUrl'].includes(k)).map(([k,v]) => `<div><dt class="font-semibold text-ink">${escape(k.replace(/([A-Z])/g,' $1'))}</dt><dd class="text-muted whitespace-pre-wrap">${escape(v)}</dd></div>`).join('')}
        </dl>
        <a class="auth-link" href="/api/staff/mentor-applications/${a.id}/cv" download>Download CV (PDF)</a>
        <form class="space-y-3">
          <label class="block text-sm" for="reason-${a.id}">Reason (required when rejecting)</label>
          <textarea id="reason-${a.id}" maxlength="1000" class="w-full rounded-lg border border-line p-3" rows="3"></textarea>
          <p role="alert" hidden></p>
          <div class="flex flex-wrap gap-3">
            <button type="submit" value="APPROVED" class="btn btn-primary">Approve</button>
            <button type="submit" value="REJECTED" class="btn btn-outline">Reject</button>
          </div>
        </form>
      </article>`).join('') : '<p class="text-muted">No applications are waiting for review.</p>';
    content.querySelectorAll('form').forEach(form => form.addEventListener('submit', async event => {
      event.preventDefault();
      const decision = event.submitter?.value;
      if (!decision || form.dataset.busy) return;
      const reason = form.querySelector('textarea').value.trim();
      const feedback = form.querySelector('[role="alert"]');
      feedback.hidden = true;
      if (decision === 'REJECTED' && !reason) {
        feedback.textContent = 'Enter a rejection reason.'; feedback.hidden = false; return;
      }
      form.dataset.busy = 'true';
      form.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        await service.decide(form.closest('[data-application]').dataset.application, decision, reason);
        if (content.isConnected) mountStaffMentorApplications(root);
      } catch (error) {
        feedback.textContent = error.message; feedback.hidden = false;
        delete form.dataset.busy;
        form.querySelectorAll('button').forEach(b => { b.disabled = false; });
      }
    }));
  } catch (error) {
    if (!content.isConnected) return;
    content.innerHTML = `<p role="alert">${escape(error.message)}</p><a class="auth-link" href="#/login?portal=staff&return=review">Staff / Admin log in</a><button class="btn btn-outline mt-4" id="review-retry">Try again</button>`;
    content.querySelector('#review-retry').onclick = () => mountStaffMentorApplications(root);
  }
}
