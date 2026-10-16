import { BrandLogo } from '../../shared/BrandLogo.js';
import { Footer } from '../../shared/Footer.js';
import { MentorAvatar } from '../../shared/MentorAvatar.js';
import { mentorService } from '../../shared/mentorService.js';
import { authService } from '../auth/authService.js';
import { mentorPlanService } from '../mentor/mentorPlanService.js';
import { bindUserDropdown, getInitials, renderUserDropdown } from '../../shared/Header.js';
import { mentorshipRequestService } from './mentorshipRequestService.js';
import { availabilityService } from '../../shared/availabilityService.js';

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const money = (value, currency = 'VND') => `${Number(value || 0).toLocaleString('en-US')} ${currency}`;
const MIN_AGENDA_LENGTH = 50;
const TERMS_VERSION = 'v1';

export function calculateOneOffTotal(unitPrice, sessions, participants) {
  return Number(unitPrice || 0) * Number(sessions || 0) * Number(participants || 0);
}

function ratingSummary(mentor) {
  const rating = Number(mentor.rating || 0);
  const reviewCount = Number(mentor.reviewCount || 0);
  if (!reviewCount) {
    return '<span class="text-sm text-muted">No reviews yet</span>';
  }
  const stars = '★★★★★';
  return `<span class="text-base tracking-[0.16em] text-brand" aria-hidden="true">${stars}</span><span class="sr-only">${rating.toFixed(1)} out of 5 stars</span><span class="text-sm font-semibold text-ink">${rating.toFixed(1)}</span><a class="text-sm text-brand underline-offset-2 hover:underline" href="#reviews">${reviewCount} verified review${reviewCount === 1 ? '' : 's'}</a>`;
}

function header() {
  const user = authService.getCurrentUser();
  const name = user?.name || user?.email || '';
  return `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">${BrandLogo()}<nav class="flex items-center gap-5" aria-label="Main navigation"><a class="text-sm font-semibold text-ink hover:text-brand" href="?#/mentors">Browse mentors</a>${user ? renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) }) : '<a class="btn btn-outline btn-sm" href="#/login">Log in</a>'}</nav></div></header>`;
}

const shell = body => `${header()}<main class="bg-cream"><div class="container py-10 sm:py-14">${body}</div></main>${Footer()}`;

export function oneOffSessionList(mentor, offerings) {
  return shell(`
    <nav class="mb-7 text-xs text-muted" aria-label="Breadcrumb"><a href="?#/mentors">Mentors</a> / <a href="#/mentors/${encodeURIComponent(mentor.id)}">${esc(mentor.name)}</a> / <span aria-current="page">One-off sessions</span></nav>
    <div class="mx-auto max-w-5xl">
      <p class="eyebrow">ONE-OFF SESSIONS</p>
      <h1 class="mt-3 font-display text-4xl text-ink sm:text-5xl">Book a focused session with ${esc(mentor.name)}</h1>
      <p class="mt-4 max-w-3xl text-sm leading-7 text-muted">Choose a published session for a specific programming question, code review or career discussion.</p>
      ${offerings.length ? `<div class="mt-9 grid gap-5 md:grid-cols-2">${offerings.map(item => `
        <article class="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wider text-brand">${esc(item.sessionDurationMinutes)} minutes</p>
          <h2 class="mt-2 font-display text-2xl text-ink">${esc(item.name)}</h2>
          <p class="mt-3 line-clamp-3 text-sm leading-6 text-muted">${esc(item.description)}</p>
          <div class="mt-6 flex items-center justify-between gap-4"><strong class="text-lg text-ink">${money(item.price, item.currency)}</strong><a class="btn btn-primary btn-sm" href="#/mentors/${encodeURIComponent(mentor.id)}/sessions?offeringId=${encodeURIComponent(item.id)}">View details</a></div>
        </article>`).join('')}</div>` : `<section class="mt-9 rounded-2xl border border-line bg-white p-8 text-center"><h2 class="font-display text-2xl text-ink">No one-off sessions published</h2><p class="mt-3 text-sm text-muted">This mentor does not currently offer individual sessions.</p><a class="btn btn-outline mt-6" href="#/mentors/${encodeURIComponent(mentor.id)}">Back to mentor profile</a></section>`}
    </div>`);
}

function availabilityPreview(slots) {
  const available = (Array.isArray(slots) ? slots : []).filter(slot => slot.available !== false);
  if (!available.length) {
    return '<section class="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-8"><h2 class="font-display text-2xl text-ink">Availability</h2><p class="mt-3 text-sm leading-6 text-muted">No matching times are available yet. Please check back after the mentor publishes more availability.</p></section>';
  }
  const grouped = new Map();
  available.forEach(slot => {
    const start = new Date(slot.startAt);
    const dateKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey).push(slot);
  });
  const dates = [...grouped.entries()];
  const dateButtons = dates.map(([dateKey, dateSlots], index) => {
    const date = new Date(dateSlots[0].startAt);
    return `<button type="button" data-slot-date="${esc(dateKey)}" aria-pressed="${index === 0}" class="min-w-[92px] rounded-xl border px-3 py-2.5 text-center transition ${index === 0 ? 'border-brand bg-lilac text-brand-dark' : 'border-line bg-white text-muted hover:border-brand/50'}"><span class="block text-[10px] font-semibold uppercase">${esc(date.toLocaleDateString(undefined, { weekday: 'short' }))}</span><span class="mt-1 block text-xs font-semibold text-ink">${esc(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</span><span class="mt-1 block text-[10px]">${dateSlots.length} slots</span></button>`;
  }).join('');
  const timeGroups = dates.map(([dateKey, dateSlots], index) => `<div data-slot-times="${esc(dateKey)}" ${index === 0 ? '' : 'hidden'}>${dateSlots.map(slot => {
    const start = new Date(slot.startAt);
    const end = new Date(slot.endAt);
    return `<button type="button" data-session-slot data-start-at="${esc(slot.startAt)}" aria-pressed="false" class="flex w-full items-center justify-center border-b border-line px-4 py-3 text-sm font-medium text-ink transition last:border-b-0 hover:bg-lilac focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"><span>${esc(start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))} – ${esc(end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))}</span></button>`;
  }).join('')}</div>`).join('');
  return `<section class="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-8"><h2 class="font-display text-2xl text-ink">Availability</h2><p class="mt-3 text-sm leading-6 text-muted">Choose a date and an available start time. Times are shown in your local timezone.</p><div class="mt-5 flex gap-3 overflow-x-auto pb-2" aria-label="Available dates">${dateButtons}</div><div class="mt-5"><p class="mb-2 text-xs font-semibold text-ink">Available times</p><div class="max-h-56 overflow-y-auto rounded-xl border border-line bg-white" data-slot-scroll>${timeGroups}</div></div><input id="session-start-at" type="hidden" value=""><p id="selected-session-time" class="mt-3 text-xs font-semibold text-brand" role="status" aria-live="polite">Select a time to continue.</p></section>`;
}

function bindAvailabilityPicker(root) {
  const dateButtons = [...root.querySelectorAll('[data-slot-date]')];
  const timeGroups = [...root.querySelectorAll('[data-slot-times]')];
  const slotButtons = [...root.querySelectorAll('[data-session-slot]')];
  const selectedInput = root.querySelector('#session-start-at');
  const selectedLabel = root.querySelector('#selected-session-time');

  dateButtons.forEach(button => button.addEventListener('click', () => {
    const dateKey = button.dataset.slotDate;
    dateButtons.forEach(item => {
      const active = item === button;
      item.setAttribute('aria-pressed', String(active));
      item.classList.toggle('border-brand', active);
      item.classList.toggle('bg-lilac', active);
      item.classList.toggle('text-brand-dark', active);
      item.classList.toggle('border-line', !active);
      item.classList.toggle('bg-white', !active);
      item.classList.toggle('text-muted', !active);
    });
    timeGroups.forEach(group => { group.hidden = group.dataset.slotTimes !== dateKey; });
  }));

  slotButtons.forEach(button => button.addEventListener('click', () => {
    slotButtons.forEach(item => {
      const active = item === button;
      item.setAttribute('aria-pressed', String(active));
      item.classList.toggle('bg-lilac', active);
      item.classList.toggle('text-brand-dark', active);
      item.classList.toggle('font-semibold', active);
    });
    if (selectedInput) selectedInput.value = button.dataset.startAt || '';
    if (selectedLabel) selectedLabel.textContent = `Selected: ${button.textContent.trim()}`;
  }));
}

function allSessionsModal(mentor, offerings) {
  return `<div class="fixed inset-0 z-50 hidden items-center justify-center bg-black/50 p-4" data-all-sessions-modal role="dialog" aria-modal="true" aria-labelledby="all-sessions-title">
    <div class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-cream p-6 shadow-2xl sm:p-8">
      <button type="button" data-all-sessions-close class="absolute right-4 top-3 text-2xl text-muted hover:text-ink" aria-label="Close session list">×</button>
      <h2 id="all-sessions-title" class="font-display text-3xl text-ink">One-off sessions with ${esc(mentor.name)}</h2>
      <p class="mt-2 text-sm text-muted">Choose a focused session for a specific programming question or career goal.</p>
      <div class="mt-6 grid gap-5 sm:grid-cols-2">${offerings.map(item => `<article class="rounded-xl border border-brand/25 bg-white p-5 shadow-sm transition hover:border-brand/60 hover:shadow-md"><h3 class="font-display text-xl text-ink">${esc(item.name)}</h3><p class="mt-3 line-clamp-3 text-xs leading-5 text-muted">${esc(item.description)}</p><div class="mt-5 flex items-center justify-between gap-3"><strong class="font-display text-lg text-ink">${money(item.price, item.currency)} / ${esc(item.sessionDurationMinutes)} min</strong><a class="btn btn-primary btn-sm" href="#/mentors/${encodeURIComponent(mentor.id)}/sessions?offeringId=${encodeURIComponent(item.id)}">View details →</a></div></article>`).join('')}</div>
    </div>
  </div>`;
}

function quantityControl(name, label) {
  return `<div class="flex items-center justify-between gap-4"><span class="text-muted">${label}</span><span class="inline-flex items-center gap-3"><button type="button" class="grid h-7 w-7 place-items-center rounded-md border border-line text-muted hover:border-brand hover:text-brand" data-quantity-action="decrease" data-quantity-name="${name}" aria-label="Decrease ${label.toLowerCase()}">−</button><strong class="min-w-4 text-center text-ink" data-quantity-value="${name}">1</strong><button type="button" class="grid h-7 w-7 place-items-center rounded-md border border-line text-muted hover:border-brand hover:text-brand" data-quantity-action="increase" data-quantity-name="${name}" aria-label="Increase ${label.toLowerCase()}">+</button></span><input type="hidden" id="session-${name}" value="1"></div>`;
}

function bindSessionSummary(root) {
  const values = { sessions: 1, participants: 1 };
  const total = root.querySelector('[data-session-total]');
  const modal = root.querySelector('[data-all-sessions-modal]');
  const update = () => {
    Object.entries(values).forEach(([name, value]) => {
      const output = root.querySelector(`[data-quantity-value="${name}"]`);
      const input = root.querySelector(`#session-${name}`);
      if (output) output.textContent = String(value);
      if (input) input.value = String(value);
      root.querySelectorAll(`[data-quantity-name="${name}"]`).forEach(button => {
        button.disabled = (button.dataset.quantityAction === 'decrease' && value <= 1)
          || (button.dataset.quantityAction === 'increase' && value >= 10);
      });
    });
    if (total) {
      const unitPrice = Number(total.dataset.unitPrice || 0);
      total.textContent = money(
        calculateOneOffTotal(unitPrice, values.sessions, values.participants),
        total.dataset.currency || 'VND',
      );
    }
  };
  root.querySelectorAll('[data-quantity-action]').forEach(button => button.addEventListener('click', () => {
    const name = button.dataset.quantityName;
    const delta = button.dataset.quantityAction === 'increase' ? 1 : -1;
    values[name] = Math.min(10, Math.max(1, values[name] + delta));
    update();
  }));
  const closeModal = () => {
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  };
  root.querySelector('[data-all-sessions-open]')?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
  });
  root.querySelector('[data-all-sessions-close]')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  update();
}

export function oneOffSessionDetail(mentor, offering, slots = [], offerings = [offering]) {
  return shell(`
    <nav class="mb-7 text-xs text-muted" aria-label="Breadcrumb"><a href="?#/mentors">Mentors</a> / <a href="#/mentors/${encodeURIComponent(mentor.id)}">${esc(mentor.name)}</a> / <a href="#/mentors/${encodeURIComponent(mentor.id)}/sessions">One-off sessions</a> / <span aria-current="page">${esc(offering.name)}</span></nav>
    <div class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <p class="eyebrow">ONE-OFF SESSION</p><h1 class="mt-3 font-display text-4xl text-ink sm:text-5xl">${esc(offering.name)}</h1>
        <p class="mt-3 text-sm text-muted">with <a class="font-semibold text-brand" href="#/mentors/${encodeURIComponent(mentor.id)}">${esc(mentor.name)}</a></p>
        <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2"><span class="text-sm text-muted">${esc(offering.sessionDurationMinutes)} minutes</span><span class="h-4 w-px bg-line" aria-hidden="true"></span><span id="reviews" class="inline-flex items-center gap-2">${ratingSummary(mentor)}</span></div>
        <section class="mt-8 rounded-2xl border border-line bg-white p-6 sm:p-8"><h2 class="font-display text-2xl text-ink">About this session</h2><p class="mt-4 whitespace-pre-line text-sm leading-7 text-muted">${esc(offering.description)}</p></section>
        ${availabilityPreview(slots)}
        <section class="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-8"><h2 class="font-display text-2xl text-ink">Your mentor</h2><div class="mt-5 flex items-start gap-4">${MentorAvatar(mentor, 'h-16 w-16 rounded-full object-cover', 64)}<div><h3 class="font-semibold text-ink">${esc(mentor.name)}</h3><p class="mt-1 text-sm text-muted">${esc(mentor.role)}${mentor.company ? ` at ${esc(mentor.company)}` : ''}</p><p class="mt-3 text-sm leading-6 text-muted">${esc(mentor.description)}</p></div></div></section>
      </div>
      <aside class="sticky top-5 rounded-2xl border border-line bg-white p-6 shadow-sm" aria-label="Session request">
        <p class="text-xs font-semibold uppercase tracking-wider text-brand">SESSION SUMMARY</p><h2 class="mt-2 text-xl font-semibold text-ink">${esc(offering.name)}</h2>
        <dl class="mt-5 space-y-3 border-y border-line py-4 text-sm"><div class="flex justify-between gap-4"><dt class="text-muted">Price per session</dt><dd class="font-semibold text-ink">${money(offering.price, offering.currency)}</dd></div><div class="flex justify-between gap-4"><dt class="text-muted">Duration</dt><dd class="font-semibold text-ink">${esc(offering.sessionDurationMinutes)} minutes</dd></div>${quantityControl('sessions', 'Number of sessions')}${quantityControl('participants', 'Number of participants')}</dl>
        <div class="flex items-center justify-between border-b border-line py-4 text-sm"><span class="text-muted">Total</span><strong class="text-ink" data-session-total data-unit-price="${esc(offering.price)}" data-currency="${esc(offering.currency || 'VND')}">${money(offering.price, offering.currency)}</strong></div>
        <form id="session-request-form" class="mt-5" novalidate>
          <label class="block text-xs font-semibold text-ink" for="session-agenda">Discussion agenda</label>
          <textarea id="session-agenda" name="agenda" class="mt-2 w-full resize-y rounded-xl border border-line px-3 py-3 text-sm focus:border-brand focus:outline-none" rows="4" maxlength="4000" required placeholder="What would you like help with?"></textarea>
          <p id="session-agenda-count" class="mt-1 text-xs text-muted">0/4000 characters · minimum ${MIN_AGENDA_LENGTH}</p>
          <label class="mt-4 block text-xs font-semibold text-ink" for="session-experience">Your experience level</label>
          <select id="session-experience" name="experienceLevel" class="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none">
            <option value="">Select your level…</option>
            <option value="BEGINNER">Beginner — just starting out</option>
            <option value="JUNIOR">Junior — some experience</option>
            <option value="MID">Mid-level — working professionally</option>
            <option value="SENIOR">Senior — deep experience</option>
          </select>
          <label class="mt-4 flex items-start gap-3 text-sm text-ink" for="session-terms"><input id="session-terms" name="terms" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand"><span>I agree to the session terms and understand that the booking is confirmed only after payment is verified.</span></label>
          <div id="session-error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert" hidden></div>
          <button id="session-submit" class="btn btn-primary mt-5 w-full" type="submit">Continue to payment</button>
        </form>
        <button class="btn btn-outline mt-3 w-full" type="button" data-all-sessions-open>View all sessions</button>
      </aside>
    </div>${allSessionsModal(mentor, offerings)}`);
}

function bindSessionRequestForm(root, mentor, offering, mentorSlug) {
  const form = root.querySelector('#session-request-form');
  if (!form) return;
  const agenda = root.querySelector('#session-agenda');
  const count = root.querySelector('#session-agenda-count');
  const experience = root.querySelector('#session-experience');
  const terms = root.querySelector('#session-terms');
  const submit = root.querySelector('#session-submit');
  const errorBox = root.querySelector('#session-error');
  const selectedStartAt = root.querySelector('#session-start-at');

  const showError = message => {
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  agenda?.addEventListener('input', () => {
    const length = agenda.value.length;
    if (count) count.textContent = `${length}/4000 characters · minimum ${MIN_AGENDA_LENGTH}`;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    errorBox.hidden = true;
    const trimmed = agenda.value.trim();
    if (selectedStartAt && !selectedStartAt.value) {
      showError('Select an available session time to continue.');
      return;
    }
    if (trimmed.length < MIN_AGENDA_LENGTH) {
      showError(`Please describe what you need help with (at least ${MIN_AGENDA_LENGTH} characters).`);
      return;
    }
    if (!experience.value) {
      showError('Select your experience level so your mentor can prepare.');
      return;
    }
    if (!terms.checked) {
      showError('Please accept the session terms to continue.');
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Reserving your time…';
    let hold = null;
    try {
      const numberOfSessions = Number(root.querySelector('#session-sessions')?.value || 1);
      const numberOfParticipants = Number(root.querySelector('#session-participants')?.value || 1);
      hold = await availabilityService.holdSlot({
        mentorSlug,
        serviceOfferingId: offering.id,
        startAt: selectedStartAt.value,
        numberOfSessions,
      });
      const order = await mentorshipRequestService.createOneOff({
        mentorSlug,
        serviceOfferingId: offering.id,
        slotHoldId: hold.id,
        agenda: trimmed,
        experienceLevel: experience.value,
        termsVersion: TERMS_VERSION,
        numberOfSessions,
        numberOfParticipants,
      });
      window.location.hash = `#/checkout?requestId=${encodeURIComponent(order.requestId)}`;
    } catch (error) {
      if (hold?.id) {
        try { await availabilityService.releaseHold(hold.id); } catch (_) { /* expires automatically */ }
      }
      if (error?.status === 401) { location.hash = '#/login'; return; }
      submit.disabled = false;
      submit.textContent = 'Continue to payment';
      showError(error?.message || 'We could not reserve this time. Please choose another slot and try again.');
    }
  });
}


export async function mountOneOffSessionPage(root, mentorId, offeringId = '') {
  root.innerHTML = shell('<section class="rounded-2xl border border-line bg-white p-8 text-center" role="status">Loading one-off sessions…</section>');
  const marker = root.firstElementChild;
  try {
    const [mentor, offerings] = await Promise.all([mentorService.getProfile(mentorId), mentorPlanService.getMentorOfferings(mentorId)]);
    if (root.firstElementChild !== marker) return;
    if (!mentor) throw new Error('Mentor not found.');
    const oneOff = offerings.filter(item => item.serviceType === 'ONE_OFF' && item.status === 'ACTIVE');
    if (!offeringId) {
      window.location.hash = `#/mentors/${encodeURIComponent(mentor.id)}`;
      return;
    }
    const selected = offeringId ? oneOff.find(item => String(item.id) === String(offeringId)) : null;
    const slots = selected ? await availabilityService.getPublicSlots(mentorId, selected.id) : [];
    root.innerHTML = offeringId && !selected
      ? shell(`<section class="rounded-2xl border border-line bg-white p-8 text-center"><h1 class="font-display text-3xl text-ink">Session unavailable</h1><p class="mt-3 text-muted">This offering is no longer active.</p><a class="btn btn-outline mt-6" href="#/mentors/${encodeURIComponent(mentor.id)}/sessions">View active sessions</a></section>`)
      : selected ? oneOffSessionDetail(mentor, selected, slots, oneOff) : oneOffSessionList(mentor, oneOff);
    bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
    if (selected) {
      bindAvailabilityPicker(root);
      bindSessionSummary(root);
      bindSessionRequestForm(root, mentor, selected, mentorId);
    }
  } catch (error) {
    if (root.firstElementChild !== marker) return;
    root.innerHTML = shell(`<section class="rounded-2xl border border-line bg-white p-8 text-center" role="alert"><h1 class="font-display text-3xl text-ink">Unable to load sessions</h1><p class="mt-3 text-muted">${esc(error.message || 'Please try again later.')}</p><a class="btn btn-outline mt-6" href="#/mentors/${encodeURIComponent(mentorId)}">Back to mentor profile</a></section>`);
  }
}
