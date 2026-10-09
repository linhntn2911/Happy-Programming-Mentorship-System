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

const PLAN_TIERS = [
  { tier: 'LITE', label: 'Lite', blurb: 'Entry-level monthly guidance for self-driven mentees.' },
  { tier: 'STANDARD', label: 'Standard', blurb: 'Balanced monthly mentorship with regular calls.' },
  { tier: 'PRO', label: 'Pro', blurb: 'Intensive monthly support with priority access.' },
];

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
            <input id="tier-${key}-minutes" name="sessionDurationMinutes" type="number" min="1" max="1440" step="5" inputmode="numeric" data-field="sessionDurationMinutes" class="${fieldClass}">
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
    <p class="eyebrow">SERVICE MANAGEMENT</p>
    <h2 id="mentor-module-title" class="mt-2 text-xl font-semibold text-ink">Mentorship packages</h2>
    <p class="mt-2 text-sm text-muted">Enable the tiers you want to offer and set a monthly price, cadence and description for each. You are not required to offer all three — enable one, two or all three.</p>

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
            <a href="#/mentor/requests" class="mb-1 block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-cream">Requests</a>
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

export function mountMentorWorkspacePage(root, section) {
  document.title = `${section === 'packages' ? 'Mentorship packages' : 'Availability schedule'} | HappyProgramming`;
  root.innerHTML = MentorWorkspacePage(section);
  bindUserDropdown(root);
  if (section === 'packages') initializeMentorPackages(root);
}
