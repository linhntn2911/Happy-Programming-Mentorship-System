import { mentorService } from '../services/mentorService.js';

export function MentorProfilePage() {
  return `
<main class="container max-w-4xl py-10 sm:py-14">
  <a href="#/" class="btn btn-ghost mb-6 !px-0" aria-label="Back to mentor discovery">← Back to mentors</a>
  <header class="mb-8">
    <p class="eyebrow">MENTOR SPACE</p>
    <h1 class="section-title mt-2">Your mentor profile</h1>
    <p class="section-copy mt-3">Keep your background and teaching skills up to date for mentees.</p>
  </header>

  <div id="profile-demo-notice" class="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status" hidden>
    Development preview: sample profile data is read-only and has not been saved to the backend.
  </div>
  <div id="profile-loading" class="rounded-xl border border-line bg-white p-6 text-sm text-muted" role="status">
    Loading your profile…
  </div>
  <div id="profile-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>
  <button id="profile-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>
  <p id="profile-save-status" class="mb-5 text-sm font-medium text-brand" role="status" aria-live="polite"></p>

  <form id="mentor-profile-form" class="space-y-6" hidden novalidate>
    <section class="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8" aria-labelledby="profile-details-title">
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

    <section class="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8" aria-labelledby="profile-skills-title">
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
</main>
  `;
}

export function initializeMentorProfilePage() {
  const loading = document.querySelector('#profile-loading');
  const form = document.querySelector('#mentor-profile-form');
  const error = document.querySelector('#profile-error');
  const retry = document.querySelector('#profile-retry');
  const saveButton = document.querySelector('#profile-save');
  const success = document.querySelector('#profile-save-status');
  const demoNotice = document.querySelector('#profile-demo-notice');
  const selectedSkillIds = new Set();
  let availableSkills = [];
  let disposed = false;

  if (!form) return;

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
    saveButton.disabled = selectedSkillIds.size === 0 || form.dataset.readOnly === 'true';
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
      const [profileResult, skillsResult] = await Promise.all([
        mentorService.getMyProfile(),
        mentorService.getActiveSkills(),
      ]);
      if (disposed) return;
      const profile = profileResult.data;
      const skills = skillsResult.data;
      const readOnly = profileResult.isMock || skillsResult.isMock;
      demoNotice.hidden = !readOnly;
      form.dataset.readOnly = String(readOnly);
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
      renderAvailableSkills();
      updateSelection();
      if (readOnly) {
        form.querySelectorAll('input, textarea, button').forEach(control => {
          control.disabled = true;
        });
      }
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
    if (form.dataset.readOnly === 'true') {
      showError('Development sample data is read-only. Start the backend to save profile changes.');
      return;
    }

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
        saveButton.disabled = selectedSkillIds.size === 0 || form.dataset.readOnly === 'true';
      }
    }
  };

  retry.addEventListener('click', handleRetry);
  form.addEventListener('submit', handleSubmit);
  void loadProfile();

  return () => {
    disposed = true;
    retry.removeEventListener('click', handleRetry);
    form.removeEventListener('submit', handleSubmit);
  };
}
