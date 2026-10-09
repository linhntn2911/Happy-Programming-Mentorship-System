import { mentorService } from '../../shared/mentorService.js';
import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { MentorAvatar } from '../../shared/MentorAvatar.js';
import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { Footer } from '../../shared/Footer.js';
import { MentorPricingCard, bindMentorPricingCardEvents } from '../../shared/MentorPricingCard.js';
import { wishlistService } from '../mentee/wishlistService.js';
import { authService } from '../auth/authService.js';
import { bindUserDropdown, getInitials, renderUserDropdown } from '../../shared/Header.js';

export function MentorProfilePage() {
  return MentorLayout(`
    <div class="admin-page-heading"><div><p class="eyebrow mb-3">HAPPYPROGRAMMING MENTOR</p><h1>Your mentor profile</h1><p>Keep your background and teaching skills up to date for mentees.</p></div></div>

    <div class="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="admin-panel p-6">
        <div id="profile-avatar" class="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-lilac text-3xl font-semibold text-brand" aria-hidden="true">M</div>
        <h2 id="profile-display-name" class="mt-4 break-words text-center font-semibold text-ink">Mentor profile</h2>
        <p class="mt-1 text-center text-xs text-muted">Mentor account</p>
        <a href="#/mentor/dashboard" class="btn btn-outline btn-sm mt-6 w-full">Mentor dashboard</a>
      </aside>
      <div class="min-w-0">

  <div id="profile-loading" class="rounded-xl border border-line bg-white p-6 text-sm text-muted" role="status">
    Loading your profile…
  </div>
  <div id="profile-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>
  <button id="profile-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>
  <p id="profile-save-status" class="mb-5 text-sm font-medium text-brand" role="status" aria-live="polite"></p>

  <form id="mentor-profile-form" class="space-y-6" hidden novalidate>
    <section class="admin-panel p-5 sm:p-8" aria-labelledby="profile-details-title">
      <h2 id="profile-details-title" class="text-lg font-semibold text-ink">Profile details</h2>
      <div class="mt-6 grid gap-5 sm:grid-cols-2">
        <div class="space-y-1.5 sm:col-span-2">
          <label for="profile-full-name" class="block text-xs font-semibold text-ink">Full name <span aria-hidden="true" class="text-red-600">*</span></label>
          <input id="profile-full-name" name="fullName" type="text" maxlength="150" required autocomplete="name" class="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none" aria-describedby="profile-name-help">
          <p id="profile-name-help" class="text-xs text-muted">Use the name mentees should see on your profile.</p>
        </div>
        <div class="space-y-1.5 sm:col-span-2">
          <label for="profile-biography" class="block text-xs font-semibold text-ink">Biography <span aria-hidden="true" class="text-red-600">*</span></label>
          <textarea id="profile-biography" name="biography" rows="6" minlength="50" maxlength="1000" required class="w-full resize-y rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none" aria-describedby="profile-bio-help"></textarea>
          <p id="profile-bio-help" class="text-xs text-muted">Write between 50 and 1,000 characters about your background and mentoring approach.</p>
        </div>
        <div class="space-y-1.5">
          <label for="profile-experience" class="block text-xs font-semibold text-ink">Years of experience <span aria-hidden="true" class="text-red-600">*</span></label>
          <input id="profile-experience" name="yearsExperience" type="number" min="0" max="80" step="0.1" required class="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none">
        </div>
        <div class="space-y-1.5">
          <label for="profile-github" class="block text-xs font-semibold text-ink">GitHub URL</label>
          <input id="profile-github" name="githubUrl" type="url" maxlength="500" placeholder="https://github.com/username" class="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none">
        </div>
        <div class="space-y-1.5">
          <label for="profile-linkedin" class="block text-xs font-semibold text-ink">LinkedIn URL</label>
          <input id="profile-linkedin" name="linkedinUrl" type="url" maxlength="500" placeholder="https://www.linkedin.com/in/username" class="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none">
        </div>
        <div class="space-y-1.5">
          <label for="profile-portfolio" class="block text-xs font-semibold text-ink">Portfolio URL</label>
          <input id="profile-portfolio" name="portfolioUrl" type="url" maxlength="500" placeholder="https://yourportfolio.com" class="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-none">
        </div>
      </div>
    </section>

    <section class="admin-panel p-5 sm:p-8" aria-labelledby="profile-skills-title">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="profile-skills-title" class="text-lg font-semibold text-ink">Teaching skills</h2>
          <p class="mt-1 text-sm text-muted">Choose at least one active skill from the shared catalog.</p>
        </div>
        <p id="profile-skill-count" class="text-xs font-semibold text-brand" aria-live="polite"></p>
      </div>
      <div id="profile-selected-skills" class="mt-4 flex flex-wrap gap-2" aria-label="Selected teaching skills"></div>
      <fieldset class="mt-6">
        <legend class="mb-3 text-xs font-semibold text-ink">Available skills</legend>
        <div id="profile-available-skills" class="grid gap-2 sm:grid-cols-2" aria-describedby="profile-skill-help"></div>
        <p id="profile-skill-help" class="mt-3 text-xs text-muted">Unselected skills will be removed from your active profile.</p>
      </fieldset>
    </section>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <a href="#/" class="btn btn-outline">Cancel</a>
      <button id="profile-save" type="submit" class="btn btn-primary" disabled>Save profile</button>
    </div>
  </form>
      </div>
    </div>
  `, authService.getCurrentUser(), 'profile');
}

export function initializeMentorProfilePage() {
  const pageRoot = document.querySelector('#app');
  const loading = document.querySelector('#profile-loading');
  const form = document.querySelector('#mentor-profile-form');
  const error = document.querySelector('#profile-error');
  const retry = document.querySelector('#profile-retry');
  const saveButton = document.querySelector('#profile-save');
  const success = document.querySelector('#profile-save-status');
  const selectedSkillIds = new Set();
  let availableSkills = [];
  let disposed = false;

  if (!form) return;
  const unbindLayout = bindMentorLayout(pageRoot);

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    retry.hidden = false;
  }

  function updateSelection() {
    const selected = document.querySelector('#profile-selected-skills');
    const count = document.querySelector('#profile-skill-count');
    selected.replaceChildren();

    for (const skill of availableSkills.filter(item => selectedSkillIds.has(item.id))) {
      const badge = document.createElement('span');
      badge.className = 'inline-flex max-w-full items-center gap-2 rounded-full bg-lilac px-3 py-1.5 text-xs font-semibold text-brand';
      const name = document.createElement('span');
      name.className = 'break-words';
      name.textContent = skill.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'rounded-full px-1 text-base leading-none text-brand focus-visible:outline';
      remove.setAttribute('aria-label', `Remove ${skill.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        selectedSkillIds.delete(skill.id);
        const checkbox = [...document.querySelectorAll('#profile-available-skills input[type="checkbox"]')]
          .find(input => input.value === String(skill.id));
        if (checkbox) checkbox.checked = false;
        updateSelection();
      });
      badge.append(name, remove);
      selected.append(badge);
    }

    count.textContent = `${selectedSkillIds.size} selected`;
    saveButton.disabled = selectedSkillIds.size === 0;
  }

  function renderAvailableSkills() {
    const container = document.querySelector('#profile-available-skills');
    container.replaceChildren();
    if (availableSkills.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-muted';
      empty.textContent = 'No active skills are available right now.';
      container.append(empty);
      return;
    }

    for (const skill of availableSkills) {
      const label = document.createElement('label');
      label.className = 'flex min-w-0 items-start gap-3 rounded-xl border border-line bg-cream p-3 text-sm text-ink hover:border-brand/40';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `profile-skill-${skill.id}`;
      checkbox.value = String(skill.id);
      checkbox.checked = selectedSkillIds.has(skill.id);
      checkbox.className = 'mt-0.5 h-4 w-4 shrink-0 accent-brand';
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedSkillIds.add(skill.id);
        else selectedSkillIds.delete(skill.id);
        updateSelection();
      });
      const name = document.createElement('span');
      name.className = 'min-w-0 break-words';
      name.textContent = skill.name;
      label.append(checkbox, name);
      container.append(label);
    }
  }

  async function loadProfile() {
    loading.hidden = false;
    error.hidden = true;
    retry.hidden = true;
    form.hidden = true;
    saveButton.disabled = true;
    success.textContent = '';

    try {
      const [profile, skills] = await Promise.all([
        mentorService.getMyProfile(),
        mentorService.getActiveSkills(),
      ]);
      if (disposed) return;
      form.querySelectorAll('input, textarea, button').forEach(control => {
        control.disabled = false;
      });
      availableSkills = skills;
      selectedSkillIds.clear();
      for (const item of profile.skills || []) {
        const id = item.skill?.id;
        if (availableSkills.some(skill => skill.id === id)) selectedSkillIds.add(id);
      }
      form.elements.fullName.value = profile.fullName || '';
      form.elements.biography.value = profile.biography || '';
      form.elements.yearsExperience.value = profile.yearsExperience ?? '';
      form.elements.githubUrl.value = profile.githubUrl || '';
      form.elements.linkedinUrl.value = profile.linkedinUrl || '';
      form.elements.portfolioUrl.value = profile.portfolioUrl || '';
      const displayName = profile.fullName || 'Mentor profile';
      document.querySelector('#profile-display-name').textContent = displayName;
      document.querySelector('#profile-avatar').textContent = getInitials(displayName);
      renderAvailableSkills();
      updateSelection();
      form.hidden = false;
    } catch (loadError) {
      if (disposed) return;
      showError(loadError.message || 'Unable to load your mentor profile. Please try again.');
    } finally {
      if (!disposed) loading.hidden = true;
    }
  }

  const handleRetry = () => {
    void loadProfile();
  };
  const handleSubmit = async event => {
    event.preventDefault();
    success.textContent = '';
    error.hidden = true;

    if (!form.reportValidity()) return;
    if (selectedSkillIds.size === 0) {
      showError('Choose at least one teaching skill before saving.');
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    try {
      const updated = await mentorService.updateMyProfile({
        fullName: form.elements.fullName.value.trim(),
        biography: form.elements.biography.value.trim(),
        yearsExperience: Number(form.elements.yearsExperience.value),
        githubUrl: form.elements.githubUrl.value.trim(),
        linkedinUrl: form.elements.linkedinUrl.value.trim(),
        portfolioUrl: form.elements.portfolioUrl.value.trim(),
        skillIds: [...selectedSkillIds],
      });
      success.textContent = 'Your mentor profile has been saved.';
      if (updated.skills) {
        selectedSkillIds.clear();
        for (const item of updated.skills) selectedSkillIds.add(item.skill.id);
        renderAvailableSkills();
        updateSelection();
      }
    } catch (saveError) {
      if (disposed) return;
      showError(saveError.message || 'Unable to save your profile. Please try again.');
    } finally {
      if (!disposed) {
        saveButton.textContent = 'Save profile';
        saveButton.disabled = selectedSkillIds.size === 0;
      }
    }
  };

  retry.addEventListener('click', handleRetry);
  form.addEventListener('submit', handleSubmit);
  void loadProfile();

  return () => {
    disposed = true;
    unbindLayout();
    retry.removeEventListener('click', handleRetry);
    form.removeEventListener('submit', handleSubmit);
  };
}

const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const profileHeader = () => {
  const user = authService.getCurrentUser();
  const displayName = user?.name || user?.email || '';
  return `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4"><a href="#/" class="flex shrink-0 items-center gap-2.5" aria-label="HappyProgramming home"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span><span class="text-[16px] font-semibold tracking-tight text-ink">Happy<span class="text-brand">Programming</span></span></a><nav class="flex items-center gap-6" aria-label="Main navigation">${BrowseAllMentorsLink()}${user ? renderUserDropdown({ currentUser: user, displayName, initials: getInitials(displayName) }) : '<a href="#/login" class="btn btn-outline btn-sm">Log in</a>'}</nav></div></header>`;
};
const layout = body => `${profileHeader()}<main class="profile-page"><div class="container py-8 sm:py-12">${body}</div></main>${Footer()}`;
export function ProfilePage(m) {
  return layout(`<nav class="mb-8 text-xs text-muted" aria-label="Breadcrumb"><a href="#/">Home</a> / <a href="?#/mentors" data-browse-all-mentors>Browse all mentors</a> / <span aria-current="page">${esc(m.name)}</span></nav>
    <div class="profile-columns"><div class="min-w-0">
      <section class="profile-intro">${MentorAvatar(m, 'profile-photo', 168)}<div><p class="eyebrow">PROGRAMMING MENTOR</p><h1 class="mt-3 font-display text-4xl sm:text-5xl">${esc(m.name)}</h1><p class="mt-3 text-base">${esc(m.role)}${m.company ? ` at <strong>${esc(m.company)}</strong>` : ''}</p><div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"><span>${esc(m.country)}</span><span>${esc(m.experience)}</span></div><p class="mt-4 text-sm text-brand">${m.acceptingMentees ? 'Accepting new mentees' : 'Not accepting new mentees'}</p><button type="button" class="save-btn profile-save-btn mt-5" data-profile-save data-mentor-id="${esc(m.id)}" aria-pressed="false" aria-label="Save ${esc(m.name)} to wishlist"><svg class="icon h-4 w-4" viewBox="0 0 24 24"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg><span>Save to wishlist</span></button></div></section>
      <nav class="profile-nav" aria-label="Profile sections"><a href="#profile-about">About</a><a href="#profile-experience">Experience</a><a href="#profile-skills">Skills</a><a href="#profile-reviews">Reviews</a></nav>
      <section class="profile-block" id="profile-about"><p class="eyebrow">MEET YOUR MENTOR</p><h2 class="mt-2">About ${esc(m.name)}</h2><p class="profile-copy">${esc(m.description)}</p></section>
      <section class="profile-block" id="profile-experience"><h2>Experience</h2><div class="profile-experience"><span class="profile-monogram" aria-hidden="true">${esc(m.initials)}</span><div><h3 class="font-semibold">${esc(m.role)}</h3><p class="mt-1 text-sm text-muted">${esc(m.company)}</p><p class="mt-2 text-sm text-brand">${esc(m.experience)}</p></div></div>${m.languages?.length ? `<p class="mt-5 text-sm text-muted">Languages: ${m.languages.map(esc).join(', ')}</p>` : ''}</section>
      <section class="profile-block" id="profile-skills"><h2>Skills</h2><div class="mt-5 flex flex-wrap gap-2">${(m.skills || []).map(s => `<a class="directory-skill" href="?${esc(new URLSearchParams({skills:s}).toString())}#/mentors">${esc(s)}</a>`).join('') || '<p class="text-sm text-muted">No skills shared yet.</p>'}</div></section>
      <section class="profile-block" id="profile-reviews"><h2>What mentees say</h2><div class="profile-empty"><span aria-hidden="true">☆</span><h3 class="font-semibold">Reviews are not available yet</h3><p class="mt-2 text-sm text-muted">Moderated learner reviews will appear here when available.</p></div></section>
    </div><aside class="profile-sidebar" aria-label="Mentorship services">
      ${MentorPricingCard({
        mentorName: m.name,
        mentorSlug: m.id,
        oneOffPrice: m.session || "500,000",
        currencyMode: "VND",
        onApplyClick: `window.location.hash = '#/apply/monthly?mentor=${encodeURIComponent(m.id)}&name=${encodeURIComponent(m.name)}'`
      })}
      <div class="profile-note mt-6"><h3 class="text-sm font-semibold">A thoughtful match comes first</h3><p class="mt-2 text-xs leading-6 text-muted">Monthly mentorship follows mentor approval before payment.</p></div>
    </aside></div>`);
}
export function ServiceDetail(m, type) {
  const monthly = type === 'MONTHLY';
  const price = monthly ? m.monthly : m.session;
  return `<p class="text-xs font-semibold uppercase tracking-wider text-muted">${monthly ? 'Monthly mentorship' : 'One-off session'}</p><p class="profile-price">${esc(price || 'Not available')} ${price ? '<span>VND</span>' : ''}</p><p class="text-xs text-muted">${monthly ? 'per month' : 'per session'}</p><div class="profile-service-description"><h3 class="font-semibold">${monthly ? 'Ongoing guidance' : 'A focused conversation'}</h3><p class="mt-2 text-sm leading-7 text-muted">${monthly ? 'Explore monthly support for your programming and learning goals.' : 'Explore individual guidance on a specific programming topic.'}</p></div>`;
}
export async function mountMentorProfile(app, id) {
  const state = (title, copy, retry=false) => layout(`<section class="profile-block text-center" role="status"><h1 class="font-display text-3xl">${title}</h1><p class="mt-4 text-muted">${copy}</p>${retry ? '<button id="profile-retry" class="btn btn-primary mt-6">Try again</button>' : '<a href="?#/mentors" data-browse-all-mentors class="btn btn-outline mt-6">Browse all mentors</a>'}</section>`);
  app.innerHTML = state('Loading mentor profile…','Getting the profile details.');
  const marker = app.firstElementChild;
  try {
    const m = await mentorService.getProfile(id);
    if (app.firstElementChild !== marker) return;
    if (!m) { app.innerHTML = state('Mentor not found','This profile is not available.'); return; }
    app.innerHTML = ProfilePage(m);
    bindMentorPricingCardEvents(app);
    bindUserDropdown(app, () => { location.hash = '#/'; location.reload(); });
    const saveButton = app.querySelector('[data-profile-save]');
    if (saveButton) {
      try { saveButton.setAttribute('aria-pressed', String((await wishlistService.list()).includes(String(m.id)))); } catch { /* guest or unavailable API */ }
      saveButton.addEventListener('click', async () => {
        if (!authService.getCurrentUser()) { location.hash = '#/login'; return; }
        const saved = saveButton.getAttribute('aria-pressed') === 'true';
        saveButton.disabled = true;
        try {
          if (saved) await wishlistService.remove(m.id); else await wishlistService.save(m.id);
          saveButton.setAttribute('aria-pressed', String(!saved));
          saveButton.querySelector('span').textContent = saved ? 'Save to wishlist' : 'Saved to wishlist';
        } catch (error) { saveButton.querySelector('span').textContent = error.message || 'Unable to update wishlist'; }
        finally { saveButton.disabled = false; }
      });
    }
    app.querySelectorAll('.profile-nav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); app.querySelector(a.getAttribute('href')).scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }));
  } catch {
    if (app.firstElementChild !== marker) return;
    app.innerHTML = state('Unable to load this profile','Please check your connection and try again.',true);
    app.querySelector('#profile-retry').addEventListener('click',() => mountMentorProfile(app,id));
  }
}
