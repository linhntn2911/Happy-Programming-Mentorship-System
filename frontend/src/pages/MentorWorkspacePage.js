import { MentorLayout, bindMentorLayout } from '../components/layout/MentorLayout.js';
import { authService } from '../services/authService.js';
import { mentorPlanService } from '../services/mentorPlanService.js';

const fieldClass = 'w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none';

function availabilityPanel() {
  return `
    <div class="admin-panel-heading"><div><p class="eyebrow mb-2">SCHEDULE MANAGEMENT</p><h2 id="mentor-module-title">Availability schedule</h2><p>Plan when mentees can request sessions with you.</p></div></div>
    <div class="admin-panel-body"><div class="admin-notice" role="status">
      <p class="font-semibold">Availability scheduling is not available yet. No schedule has been created or changed.</p>
      <p class="mt-2">Recurring availability, timezone handling, and date exceptions will be added in a future release.</p>
    </div>
    <a href="#/mentor/dashboard" class="btn btn-outline mt-6">Back to mentor dashboard</a></div>`;
}

function packagesPanel() {
  return `
    <div class="admin-panel-heading"><div><p class="eyebrow mb-2">SERVICE MANAGEMENT</p><h2 id="mentor-module-title">Mentorship packages</h2><p>Set your monthly price and the time you offer each month.</p></div></div>
    <div class="admin-panel-body">
    <p class="text-sm text-muted">Mentees request this package when they apply.</p>

    <div id="packages-loading" class="mt-6 rounded-xl border border-line bg-cream p-4 text-sm text-muted" role="status">Loading your package…</div>
    <div id="packages-error" class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>
    <button id="packages-retry" class="btn btn-outline mt-4" type="button" hidden>Try again</button>
    <p id="packages-save-status" class="mt-4 text-sm font-medium text-brand" role="status" aria-live="polite"></p>

    <form id="mentor-packages-form" class="mt-6 space-y-6" hidden novalidate>
      <div class="space-y-1.5">
        <label for="package-name" class="block text-xs font-semibold text-ink">Package name <span aria-hidden="true" class="text-red-600">*</span></label>
        <input id="package-name" name="name" type="text" maxlength="200" required class="${fieldClass}" aria-describedby="package-name-help">
        <p id="package-name-help" class="text-xs text-muted">For example, "Monthly Mentorship".</p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="package-price" class="block text-xs font-semibold text-ink">Monthly price (VND) <span aria-hidden="true" class="text-red-600">*</span></label>
          <input id="package-price" name="price" type="number" min="0" step="1000" required inputmode="numeric" class="${fieldClass}">
        </div>
        <div class="space-y-1.5">
          <label for="package-calls" class="block text-xs font-semibold text-ink">Sessions per month <span aria-hidden="true" class="text-red-600">*</span></label>
          <input id="package-calls" name="callsPerPeriod" type="number" min="0" max="365" step="1" required inputmode="numeric" class="${fieldClass}">
        </div>
        <div class="space-y-1.5">
          <label for="package-minutes" class="block text-xs font-semibold text-ink">Minutes per session <span aria-hidden="true" class="text-red-600">*</span></label>
          <input id="package-minutes" name="sessionDurationMinutes" type="number" min="1" max="1440" step="5" required inputmode="numeric" class="${fieldClass}">
        </div>
        <div class="space-y-1.5">
          <label for="package-trial" class="block text-xs font-semibold text-ink">Free trial days</label>
          <input id="package-trial" name="trialDays" type="number" min="0" max="30" step="1" inputmode="numeric" class="${fieldClass}" aria-describedby="package-trial-help">
          <p id="package-trial-help" class="text-xs text-muted">Optional. Leave blank to use 7 days.</p>
        </div>
        <div class="space-y-1.5 sm:col-span-2">
          <label for="package-response" class="block text-xs font-semibold text-ink">Response time (hours)</label>
          <input id="package-response" name="responseTimeHours" type="number" min="1" max="720" step="1" inputmode="numeric" class="${fieldClass}" aria-describedby="package-response-help">
          <p id="package-response-help" class="text-xs text-muted">Optional. Leave blank to use 24 hours.</p>
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="package-description" class="block text-xs font-semibold text-ink">Description <span aria-hidden="true" class="text-red-600">*</span></label>
        <textarea id="package-description" name="description" rows="4" maxlength="4000" required class="${fieldClass} resize-y"></textarea>
      </div>

      <label for="package-active" class="flex items-center gap-3 rounded-xl border border-line bg-cream p-3 text-sm text-ink">
        <input id="package-active" name="active" type="checkbox" class="h-4 w-4 accent-brand">
        <span>Published and visible to mentees</span>
      </label>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <a href="#/mentor/dashboard" class="btn btn-outline">Back to dashboard</a>
        <button id="packages-save" type="submit" class="btn btn-primary">Save package</button>
      </div>
    </form></div>`;
}

export function MentorWorkspacePage(section) {
  const activeSection = section === 'packages' ? 'packages' : 'availability';
  const isPackages = activeSection === 'packages';
  const heading = isPackages ? 'Mentorship packages' : 'Availability schedule';
  const description = isPackages
    ? 'Review the services and packages you offer to mentees.'
    : 'Plan when mentees can request sessions with you.';
  return MentorLayout(`
    <div class="admin-page-heading"><div><p class="eyebrow mb-3">HAPPYPROGRAMMING MENTOR</p><h1>${heading}</h1><p>${description}</p></div></div>
    <section class="admin-panel" aria-labelledby="mentor-module-title">${isPackages ? packagesPanel() : availabilityPanel()}</section>
  `, authService.getCurrentUser(), activeSection);
}

function initializeMentorPackages(root) {
  const form = root.querySelector('#mentor-packages-form');
  if (!form) return;
  const loading = root.querySelector('#packages-loading');
  const error = root.querySelector('#packages-error');
  const retry = root.querySelector('#packages-retry');
  const saveButton = root.querySelector('#packages-save');
  const status = root.querySelector('#packages-save-status');
  const fields = {
    name: root.querySelector('#package-name'),
    price: root.querySelector('#package-price'),
    calls: root.querySelector('#package-calls'),
    minutes: root.querySelector('#package-minutes'),
    trial: root.querySelector('#package-trial'),
    response: root.querySelector('#package-response'),
    description: root.querySelector('#package-description'),
    active: root.querySelector('#package-active'),
  };

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    retry.hidden = false;
  }

  function fill(plan) {
    fields.name.value = plan?.name || 'Monthly Mentorship';
    fields.price.value = plan?.price ?? '';
    fields.calls.value = plan?.callsPerPeriod ?? '';
    fields.minutes.value = plan?.sessionDurationMinutes ?? '';
    fields.trial.value = plan?.trialDays ?? '';
    fields.response.value = plan?.responseTimeHours ?? '';
    fields.description.value = plan?.description || '';
    fields.active.checked = plan ? plan.status === 'ACTIVE' : true;
  }

  async function load() {
    loading.hidden = false;
    error.hidden = true;
    retry.hidden = true;
    form.hidden = true;
    status.textContent = '';
    try {
      const plans = await mentorPlanService.getMyPlans();
      fill(plans.find(item => item.serviceType === 'MONTHLY') || null);
      form.hidden = false;
    } catch (loadError) {
      showError(loadError.message || 'Unable to load your mentorship package. Please try again.');
    } finally {
      loading.hidden = true;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    status.textContent = '';
    error.hidden = true;
    if (!form.reportValidity()) return;

    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    try {
      const payload = {
        name: fields.name.value.trim(),
        price: Number(fields.price.value),
        sessionDurationMinutes: Number(fields.minutes.value),
        callsPerPeriod: Number(fields.calls.value),
        description: fields.description.value.trim(),
        status: fields.active.checked ? 'ACTIVE' : 'INACTIVE',
      };
      if (fields.trial.value.trim() !== '') payload.trialDays = Number(fields.trial.value);
      if (fields.response.value.trim() !== '') payload.responseTimeHours = Number(fields.response.value);
      const saved = await mentorPlanService.saveMonthlyPlan(payload);
      fill(saved);
      status.textContent = 'Your mentorship package has been saved.';
    } catch (saveError) {
      showError(saveError.message || 'Unable to save your package. Please try again.');
    } finally {
      saveButton.textContent = 'Save package';
      saveButton.disabled = false;
    }
  }

  retry.addEventListener('click', () => void load());
  form.addEventListener('submit', handleSubmit);
  void load();
}

export function mountMentorWorkspacePage(root, section) {
  document.title = `${section === 'packages' ? 'Mentorship packages' : 'Availability schedule'} | HappyProgramming`;
  root.innerHTML = MentorWorkspacePage(section);
  const unbindLayout = bindMentorLayout(root);
  if (section === 'packages') initializeMentorPackages(root);
  return unbindLayout;
}
