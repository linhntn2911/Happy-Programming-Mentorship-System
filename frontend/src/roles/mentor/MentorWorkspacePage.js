import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { authService } from '../auth/authService.js';
import { mentorPlanService } from './mentorPlanService.js';
import { mentorAvailabilityService } from './mentorAvailabilityService.js';
import { escapeHtml } from '../../shared/html.js';

const fieldClass = 'w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none';

const PLAN_TIERS = [
  { tier: 'LITE', label: 'Lite', blurb: 'Entry-level monthly guidance for self-driven mentees.' },
  { tier: 'STANDARD', label: 'Standard', blurb: 'Balanced monthly mentorship with regular calls.' },
  { tier: 'PRO', label: 'Pro', blurb: 'Intensive monthly support with priority access.' },
];

function availabilityPanel() {
  return `
    <div class="admin-panel-heading">
      <div>
        <p class="eyebrow mb-2">SCHEDULE MANAGEMENT</p>
        <h2 id="mentor-module-title">Availability schedule</h2>
        <p>Publish the time windows when mentees can book a one-off session with you. Times are entered and shown in your local timezone.</p>
      </div>
    </div>
    <div class="admin-panel-body">
      <div id="availability-toast" class="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status" aria-live="polite" hidden></div>
      <div id="availability-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>

      <form id="availability-form" class="rounded-2xl border border-line bg-cream p-5" novalidate>
        <p class="eyebrow mb-3">ADD AN OPEN SLOT</p>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="space-y-1.5">
            <label for="availability-date" class="block text-xs font-semibold text-ink">Date <span aria-hidden="true" class="text-red-600">*</span></label>
            <input id="availability-date" name="date" type="date" class="${fieldClass}" required>
          </div>
          <div class="space-y-1.5">
            <label for="availability-start" class="block text-xs font-semibold text-ink">Start time <span aria-hidden="true" class="text-red-600">*</span></label>
            <input id="availability-start" name="start" type="time" class="${fieldClass}" required>
          </div>
          <div class="space-y-1.5">
            <label for="availability-end" class="block text-xs font-semibold text-ink">End time <span aria-hidden="true" class="text-red-600">*</span></label>
            <input id="availability-end" name="end" type="time" class="${fieldClass}" required>
          </div>
        </div>
        <div class="mt-4 space-y-1.5">
          <label for="availability-reason" class="block text-xs font-semibold text-ink">Note (optional)</label>
          <input id="availability-reason" name="reason" type="text" maxlength="500" class="${fieldClass}" placeholder="e.g. Open for code review sessions">
        </div>
        <div class="mt-5 flex justify-end">
          <button id="availability-submit" type="submit" class="btn btn-primary">Add open slot</button>
        </div>
      </form>

      <div class="mt-8">
        <p class="eyebrow mb-3">YOUR UPCOMING OPEN SLOTS</p>
        <div id="availability-loading" class="rounded-xl border border-line bg-cream p-4 text-sm text-muted" role="status">Loading your availability…</div>
        <div id="availability-empty" class="rounded-xl border border-dashed border-line bg-cream p-6 text-center text-sm text-muted" hidden>No upcoming open slots yet. Add one above so mentees can book a session with you.</div>
        <ul id="availability-list" class="space-y-3" hidden></ul>
      </div>
    </div>`;
}

function slotCard(slot) {
  const start = new Date(slot.startAt);
  const end = new Date(slot.endAt);
  const dateLabel = start.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const timeLabel = `${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  const note = slot.reason ? ` · ${escapeHtml(slot.reason)}` : '';
  return `
    <li class="flex items-center justify-between gap-4 rounded-xl border border-line bg-white p-4" data-slot-id="${escapeHtml(slot.id)}">
      <div>
        <p class="text-sm font-semibold text-ink">${escapeHtml(dateLabel)}</p>
        <p class="mt-0.5 text-xs text-muted">${escapeHtml(timeLabel)}${note}</p>
      </div>
      <button type="button" class="btn btn-outline btn-sm" data-delete-slot="${escapeHtml(slot.id)}">Remove</button>
    </li>`;
}

function tierCard({ tier, label, blurb }) {
  const key = tier.toLowerCase();
  return `
    <article class="tier-card rounded-2xl border border-line bg-white p-5" data-tier="${tier}">
      <label for="tier-${key}-active" class="flex items-start justify-between gap-3">
        <span>
          <span class="block text-base font-semibold text-ink">${label}</span>
          <span class="mt-1 block text-xs text-muted">${blurb}</span>
        </span>
        <input id="tier-${key}-active" name="active" type="checkbox" data-field="active" class="mt-1 h-5 w-5 shrink-0 accent-brand" aria-label="Enable ${label} package">
      </label>

      <div class="tier-fields mt-4 space-y-4" data-fields hidden>
        <div class="space-y-1.5">
          <label for="tier-${key}-price" class="block text-xs font-semibold text-ink">Monthly price (VND) <span aria-hidden="true" class="text-red-600">*</span></label>
          <input id="tier-${key}-price" name="price" type="number" min="0" step="1000" inputmode="numeric" data-field="price" class="${fieldClass}">
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label for="tier-${key}-calls" class="block text-xs font-semibold text-ink">Sessions / month <span aria-hidden="true" class="text-red-600">*</span></label>
            <input id="tier-${key}-calls" name="callsPerPeriod" type="number" min="0" max="365" step="1" inputmode="numeric" data-field="callsPerPeriod" class="${fieldClass}">
          </div>
          <div class="space-y-1.5">
            <label for="tier-${key}-minutes" class="block text-xs font-semibold text-ink">Minutes / session <span aria-hidden="true" class="text-red-600">*</span></label>
            <input id="tier-${key}-minutes" name="sessionDurationMinutes" type="number" min="1" max="1440" step="1" inputmode="numeric" data-field="sessionDurationMinutes" class="${fieldClass}">
          </div>
        </div>
        <div class="space-y-1.5">
          <label for="tier-${key}-description" class="block text-xs font-semibold text-ink">Description <span aria-hidden="true" class="text-red-600">*</span></label>
          <textarea id="tier-${key}-description" name="description" rows="3" maxlength="4000" data-field="description" class="${fieldClass} resize-y"></textarea>
        </div>
      </div>
    </article>`;
}

function packagesPanel() {
  const cards = PLAN_TIERS.map(tierCard).join('');
  return `
    <div class="admin-panel-heading">
      <div>
        <p class="eyebrow mb-2">SERVICE MANAGEMENT</p>
        <h2 id="mentor-module-title">Mentorship packages</h2>
        <p>Enable the tiers you want to offer and set a monthly price, cadence and description for each. You are not required to offer all three — enable one, two or all three.</p>
      </div>
    </div>
    <div class="admin-panel-body">
      <div id="packages-loading" class="mt-6 rounded-xl border border-line bg-cream p-4 text-sm text-muted" role="status">Loading your packages…</div>
      <div id="packages-error" class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>
      <button id="packages-retry" class="btn btn-outline mt-4" type="button" hidden>Try again</button>
      <p id="packages-save-status" class="mt-4 text-sm font-medium text-brand" role="status" aria-live="polite"></p>

      <form id="mentor-packages-form" class="mt-6 space-y-5" hidden novalidate>
        <div class="grid gap-5 lg:grid-cols-3">${cards}</div>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <a href="#/mentor/dashboard" class="btn btn-outline">Back to dashboard</a>
          <button id="packages-save" type="submit" class="btn btn-primary">Save packages</button>
        </div>
      </form>
    </div>`;
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

  const cards = PLAN_TIERS.map(({ tier }) => {
    const card = root.querySelector(`.tier-card[data-tier="${tier}"]`);
    const field = name => card.querySelector(`[data-field="${name}"]`);
    return {
      tier,
      card,
      fieldsWrap: card.querySelector('[data-fields]'),
      active: field('active'),
      price: field('price'),
      calls: field('callsPerPeriod'),
      minutes: field('sessionDurationMinutes'),
      description: field('description'),
    };
  });

  function syncCard(card) {
    card.fieldsWrap.hidden = !card.active.checked;
    ['price', 'calls', 'minutes', 'description'].forEach(key => {
      card[key].required = card.active.checked;
    });
  }

  cards.forEach(card => {
    card.active.addEventListener('change', () => syncCard(card));
    syncCard(card);
  });

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    retry.hidden = false;
  }

  function fill(plans) {
    const byTier = new Map(
      (plans || []).filter(p => p.planTier).map(p => [p.planTier, p]),
    );
    cards.forEach(card => {
      const plan = byTier.get(card.tier);
      card.active.checked = Boolean(plan);
      card.price.value = plan?.price ?? '';
      card.calls.value = plan?.callsPerPeriod ?? '';
      card.minutes.value = plan?.sessionDurationMinutes ?? '';
      card.description.value = plan?.description || '';
      syncCard(card);
    });
  }

  async function load() {
    loading.hidden = false;
    error.hidden = true;
    retry.hidden = true;
    form.hidden = true;
    status.textContent = '';
    try {
      fill(await mentorPlanService.getMyPlans());
      form.hidden = false;
    } catch (loadError) {
      showError(loadError.message || 'Unable to load your mentorship packages. Please try again.');
    } finally {
      loading.hidden = true;
    }
  }

  function collectPayload() {
    const plans = [];
    for (const card of cards) {
      if (!card.active.checked) continue;
      const price = card.price.value.trim();
      const calls = card.calls.value.trim();
      const minutes = card.minutes.value.trim();
      const description = card.description.value.trim();
      if (price === '' || calls === '' || minutes === '' || description === '') {
        throw new Error('Complete the price, sessions, minutes and description for every enabled package.');
      }
      plans.push({
        planTier: card.tier,
        price: Number(price),
        callsPerPeriod: Number(calls),
        sessionDurationMinutes: Number(minutes),
        description,
        status: 'ACTIVE',
      });
    }
    if (plans.length === 0) {
      throw new Error('Enable at least one package before saving.');
    }
    return plans;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    status.textContent = '';
    error.hidden = true;
    if (!form.reportValidity()) return;

    let payload;
    try {
      payload = collectPayload();
    } catch (validationError) {
      showError(validationError.message);
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    try {
      const saved = await mentorPlanService.savePlans(payload);
      fill(saved);
      status.textContent = 'Your mentorship packages have been saved.';
    } catch (saveError) {
      showError(saveError.message || 'Unable to save your packages. Please try again.');
    } finally {
      saveButton.textContent = 'Save packages';
      saveButton.disabled = false;
    }
  }

  retry.addEventListener('click', () => void load());
  form.addEventListener('submit', handleSubmit);
  void load();
}

function initializeMentorAvailability(root) {
  const form = root.querySelector('#availability-form');
  if (!form) return;
  const loading = root.querySelector('#availability-loading');
  const empty = root.querySelector('#availability-empty');
  const list = root.querySelector('#availability-list');
  const error = root.querySelector('#availability-error');
  const toast = root.querySelector('#availability-toast');
  const submit = root.querySelector('#availability-submit');
  const dateInput = root.querySelector('#availability-date');
  const startInput = root.querySelector('#availability-start');
  const endInput = root.querySelector('#availability-end');
  const reasonInput = root.querySelector('#availability-reason');

  let slots = [];

  function showError(message) {
    toast.hidden = true;
    error.textContent = message;
    error.hidden = false;
  }
  function showToast(message) {
    error.hidden = true;
    toast.textContent = message;
    toast.hidden = false;
  }
  function clearMessages() {
    error.hidden = true;
    toast.hidden = true;
  }

  function render() {
    if (slots.length === 0) {
      list.innerHTML = '';
      list.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.innerHTML = slots.map(slotCard).join('');
    list.hidden = false;
  }

  async function load() {
    loading.hidden = false;
    empty.hidden = true;
    list.hidden = true;
    try {
      slots = await mentorAvailabilityService.getMyAvailability();
      render();
    } catch (loadError) {
      slots = [];
      list.innerHTML = '';
      empty.hidden = true;
      showError(loadError.message || 'Unable to load your availability. Please try again.');
    } finally {
      loading.hidden = true;
    }
  }

  function toInstant(date, time) {
    const parsed = new Date(`${date}T${time}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearMessages();
    const date = dateInput.value;
    const start = startInput.value;
    const end = endInput.value;
    if (!date || !start || !end) {
      showError('Choose a date, a start time and an end time.');
      return;
    }
    const startAt = toInstant(date, start);
    const endAt = toInstant(date, end);
    if (!startAt || !endAt) {
      showError('Enter a valid date and time.');
      return;
    }
    if (endAt <= startAt) {
      showError('The slot must end after it starts.');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Adding…';
    try {
      await mentorAvailabilityService.createSlot({ startAt, endAt, reason: reasonInput.value.trim() });
      form.reset();
      await load();
      showToast('Open slot published.');
    } catch (saveError) {
      showError(saveError.message || 'Unable to add the slot. Please try again.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Add open slot';
    }
  }

  async function handleDelete(slotId) {
    clearMessages();
    try {
      await mentorAvailabilityService.deleteSlot(slotId);
      await load();
      showToast('Open slot removed.');
    } catch (deleteError) {
      showError(deleteError.message || 'Unable to remove the slot. Please try again.');
    }
  }

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-delete-slot]');
    if (!button) return;
    void handleDelete(button.getAttribute('data-delete-slot'));
  });
  form.addEventListener('submit', handleSubmit);
  void load();
}

export function mountMentorWorkspacePage(root, section) {
  document.title = `${section === 'packages' ? 'Mentorship packages' : 'Availability schedule'} | HappyProgramming`;
  root.innerHTML = MentorWorkspacePage(section);
  const unbindLayout = bindMentorLayout(root);
  if (section === 'packages') initializeMentorPackages(root);
  if (section === 'availability') initializeMentorAvailability(root);
  return unbindLayout;
}
