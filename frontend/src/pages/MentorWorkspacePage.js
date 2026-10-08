import { Footer } from '../components/layout/Footer.js';
import { BrowseAllMentorsLink } from '../components/ui/BrowseAllMentorsLink.js';
import { authService } from '../services/authService.js';
import { mentorPlanService } from '../services/mentorPlanService.js';
import { bindUserDropdown, getInitials, renderUserDropdown, renderNotificationBell } from '../components/layout/Header.js';

const mentorSections = [
  { id: 'availability', label: 'Availability schedule', href: '#/mentor/availability' },
  { id: 'packages', label: 'Mentorship packages', href: '#/mentor/packages' },
];

const fieldClass = 'w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none';

function mentorWorkspaceHeader() {
  const user = authService.getCurrentUser();
  const displayName = user?.name || user?.email || '';
  const accountNavigation = user
    ? `<div class="flex items-center gap-3">${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName, initials: getInitials(displayName) })}</div>`
    : '<a href="#/login" class="btn btn-outline btn-sm">Log in</a>';

  return `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4"><a href="#/" class="flex shrink-0 items-center gap-2.5" aria-label="HappyProgramming home"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span><span class="text-[16px] font-semibold tracking-tight text-ink">Happy<span class="text-brand">Programming</span></span></a><nav class="flex items-center gap-6" aria-label="Main navigation">${BrowseAllMentorsLink()}${accountNavigation}</nav></div></header>`;
}

function availabilityPanel() {
  return `
    <p class="eyebrow">SCHEDULE MANAGEMENT</p>
    <h2 id="mentor-module-title" class="mt-2 text-xl font-semibold text-ink">Availability schedule</h2>
    <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      <p class="font-semibold">Availability scheduling is not available yet. No schedule has been created or changed.</p>
      <p class="mt-2">Recurring availability, timezone handling, and date exceptions will be added in a future release.</p>
    </div>
    <a href="#/mentor/dashboard" class="btn btn-outline mt-6">Back to mentor dashboard</a>`;
}

function packagesPanel() {
  return `
    <p class="eyebrow">SERVICE MANAGEMENT</p>
    <h2 id="mentor-module-title" class="mt-2 text-xl font-semibold text-ink">Mentorship packages</h2>
    <p class="mt-2 text-sm text-muted">Set your monthly price (VND) and how much time you offer each month. Mentees request this package when they apply.</p>

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
    </form>`;
}

export function MentorWorkspacePage(section) {
  const activeSection = mentorSections.some(item => item.id === section) ? section : 'availability';
  const isPackages = activeSection === 'packages';
  const heading = isPackages ? 'Mentorship packages' : 'Availability schedule';
  const description = isPackages
    ? 'Review the services and packages you offer to mentees.'
    : 'Plan when mentees can request sessions with you.';
  const navigation = mentorSections.map(item => `
    <a href="${item.href}" class="block rounded-xl px-4 py-3 text-sm font-semibold ${item.id === activeSection ? 'bg-lilac text-brand' : 'text-ink hover:bg-cream'}"
       ${item.id === activeSection ? 'aria-current="page"' : ''}>${item.label}</a>
  `).join('');

  return `${mentorWorkspaceHeader()}
    <main class="min-h-screen bg-cream">
      <div class="container max-w-6xl py-12">
        <p class="eyebrow">MENTOR SPACE</p>
        <h1 class="mt-3 font-display text-4xl text-ink">${heading}</h1>
        <p class="mt-3 text-sm text-muted">${description}</p>
        <div class="mt-8 grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav class="rounded-2xl border border-line bg-white p-3 shadow-sm" aria-label="Mentor workspace">
            <a href="#/mentor/dashboard" class="mb-1 block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-cream">Dashboard</a>
            <a href="#/mentor/profile" class="mb-1 block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-cream">My profile</a>
            ${navigation}
          </nav>
          <section class="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="mentor-module-title">
            ${isPackages ? packagesPanel() : availabilityPanel()}
          </section>
        </div>
      </div>
    </main>${Footer()}`;
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
  bindUserDropdown(root);
  if (section === 'packages') initializeMentorPackages(root);
}
