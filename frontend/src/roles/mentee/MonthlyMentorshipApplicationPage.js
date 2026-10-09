import { mentorshipRequestService } from './mentorshipRequestService.js';

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const GOALS = ['Do not wish to disclose.', "I'm a student and looking for help with my studies.", 'I just graduated and need help with my career start.', 'I want to change careers or get a new job.', 'I want to enhance or extend my skillset.', 'I need mentorship for a personal project.', 'I need mentorship for my business / product.'];
const TIMELINES = ["I don't have a timeline in mind.", "I'm looking to reach this goal in a few weeks.", "I'm looking to reach this goal in a month or so.", "I'm looking at a timeline of around three months.", "I'm looking to reach this goal in around half a year.", "I'd like to reach this goal in a year or more."];
const EXPERIENCE = [{ value: 'BEGINNER', label: 'Beginner — just starting out' }, { value: 'JUNIOR', label: 'Junior — some experience' }, { value: 'MID', label: 'Mid-level — working professionally' }, { value: 'SENIOR', label: 'Senior — deep experience' }];
const TERMS_VERSION = 'v1';
const MIN_GOALS_LENGTH = 50;
const keyFor = id => 'hpms.monthly-application-draft.v1.' + (id || 'unknown');
function readDraft(id, fallback) { try { const value = JSON.parse(sessionStorage.getItem(keyFor(id)) || 'null'); return value && value.mentorId === id ? { ...fallback, ...value } : fallback; } catch { return fallback; } }
function writeDraft(state) { try { sessionStorage.setItem(keyFor(state.mentorId), JSON.stringify(state)); } catch { /* memory fallback */ } }
function clearDraft(id) { try { sessionStorage.removeItem(keyFor(id)); } catch { /* memory fallback */ } }
function shell(content, mentorId) {
  return '<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-3"><a href="#/" class="font-semibold text-brand" aria-label="HappyProgramming home">{h} HappyProgramming</a><a href="#/mentors/' + encodeURIComponent(mentorId || '') + '" class="btn btn-outline btn-sm">Back to profile</a></div></header><main class="min-h-[calc(100vh-76px)] bg-cream py-10 sm:py-16"><div class="container max-w-2xl px-5 sm:px-8">' + content + '</div></main>';
}
function progress(step) {
  return '<div class="mb-10 grid grid-cols-3 gap-1.5" aria-label="Application progress">' + [1,2,3].map(n => '<span class="h-1.5 rounded-full ' + (n <= step ? 'bg-brand' : 'bg-line') + '" aria-label="Step ' + n + (n === step ? ', current' : '') + '"></span>').join('') + '</div>';
}
function choice(text, selected) {
  return '<button type="button" class="monthly-choice ' + (selected === text ? 'is-selected' : '') + '" data-value="' + esc(text) + '" aria-pressed="' + (selected === text) + '">' + esc(text) + '</button>';
}
function experienceChoice(item, selected) {
  return '<button type="button" class="monthly-choice ' + (selected === item.value ? 'is-selected' : '') + '" data-experience="' + esc(item.value) + '" aria-pressed="' + (selected === item.value) + '">' + esc(item.label) + '</button>';
}
const canSubmit = state => state.message.trim().length >= MIN_GOALS_LENGTH && state.termsAccepted;
export function mountMonthlyMentorshipApplication(root, mentorId, mentorName) {
  const fallback = { mentorId, mentorName: mentorName || 'your mentor', goal: '', timeline: '', experienceLevel: '', message: '', termsAccepted: false, step: 1, complete: false };
  const state = readDraft(mentorId, fallback);
  state.mentorName = mentorName || state.mentorName || 'your mentor';
  let formError = '';
  const render = () => {
    if (state.complete) return shell('<section class="monthly-application-card text-center"><span class="monthly-success-icon" aria-hidden="true">✓</span><p class="eyebrow mt-5">Request submitted</p><h1 class="mt-2 font-display text-3xl sm:text-4xl">Waiting for ' + esc(state.mentorName) + ' to respond</h1><p class="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">Your mentorship request has been sent and your mentor has been notified. They have 48 hours to respond. Once they accept, you can complete payment to activate your monthly mentorship.</p><div class="mt-8 flex flex-wrap justify-center gap-3"><a href="#/mentors/' + encodeURIComponent(state.mentorId || '') + '" class="btn btn-primary">Back to profile</a><a href="#/account" class="btn btn-outline">Go to account</a></div></section>', state.mentorId);
    const step = state.step;
    let body = '';
    if (step === 1) body = '<p class="text-sm text-muted">What best describes the goal of your mentorship?</p><div class="mt-5 grid gap-3" role="group" aria-label="Mentorship goal">' + GOALS.map(item => choice(item, state.goal)).join('') + '</div><p class="mt-8 text-sm text-muted">What is your current experience level?</p><div class="mt-5 grid gap-3" role="group" aria-label="Experience level">' + EXPERIENCE.map(item => experienceChoice(item, state.experienceLevel)).join('') + '</div>';
    if (step === 2) body = '<p class="text-sm text-muted">When would you like to reach that goal?</p><div class="mt-5 grid gap-3" role="group" aria-label="Goal timeline">' + TIMELINES.map(item => choice(item, state.timeline)).join('') + '</div>';
    if (step === 3) body = '<label for="monthly-message" class="text-sm font-medium text-ink">Write a message to ' + esc(state.mentorName) + '</label><div class="mt-2 relative"><textarea id="monthly-message" maxlength="1000" rows="6" class="monthly-message" placeholder="Tell your mentor about your background, your goal and the help you are looking for.">' + esc(state.message) + '</textarea><span id="monthly-message-count" class="absolute right-3 top-3 text-xs text-muted">' + state.message.length + '/1000 characters</span></div><div class="monthly-help-box mt-3"><strong>What to include in your message</strong><ol class="mt-2 list-decimal space-y-1 pl-5"><li><b>Introduce yourself:</b> Describe your background and professional journey.</li><li><b>State your goal:</b> Share your aspirations and the steps you have taken so far.</li><li><b>Express your needs:</b> Tell your mentor about the challenges you are facing and the kind of help you are looking for.</li></ol><p class="mt-2 text-xs text-muted">At least ' + MIN_GOALS_LENGTH + ' characters are required.</p></div><label for="monthly-terms" class="mt-6 flex items-start gap-3 text-sm text-ink"><input id="monthly-terms" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand" ' + (state.termsAccepted ? 'checked' : '') + '><span>I agree to the mentorship terms. Payment is completed after the mentor accepts my request.</span></label>' + (formError ? '<div id="monthly-error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">' + esc(formError) + '</div>' : '');
    const disabled = step === 1 ? (!state.goal || !state.experienceLevel) : step === 2 ? !state.timeline : !canSubmit(state);
    return shell('<section class="monthly-application-card">' + progress(step) + '<p class="eyebrow">Monthly mentorship</p><h1 class="mt-3 font-display text-3xl sm:text-4xl">Apply to ' + esc(state.mentorName) + '</h1><div class="mt-8">' + body + '</div><div class="mt-12 flex items-center justify-between gap-3"><button type="button" id="monthly-back" class="btn btn-outline">' + (step === 1 ? '← Back to profile' : '← Back') + '</button><button type="button" id="monthly-next" class="btn btn-primary" ' + (disabled ? 'disabled' : '') + '>' + (step === 3 ? 'Submit request' : 'Next') + ' <span aria-hidden="true">→</span></button></div></section>', state.mentorId);
  };
  const submit = async button => {
    const goals = state.message.trim();
    if (goals.length < MIN_GOALS_LENGTH) { formError = 'Please write at least ' + MIN_GOALS_LENGTH + ' characters so your mentor understands your goals.'; mount(); return; }
    if (!state.termsAccepted) { formError = 'Please accept the mentorship terms to continue.'; mount(); return; }
    formError = '';
    button.disabled = true;
    button.textContent = 'Submitting…';
    try {
      await mentorshipRequestService.createRequest({
        mentorSlug: state.mentorId,
        learningGoals: goals,
        experienceLevel: state.experienceLevel,
        background: state.goal,
        expectations: state.timeline,
        termsVersion: TERMS_VERSION,
      });
      clearDraft(state.mentorId);
      state.complete = true;
      mount();
    } catch (error) {
      if (error?.status === 401) { location.hash = '#/login'; return; }
      formError = error?.message || 'We could not submit your request. Please try again.';
      mount();
    }
  };
  const mount = () => {
    root.innerHTML = render();
    root.querySelectorAll('.monthly-choice').forEach(button => button.addEventListener('click', () => { if (button.dataset.experience) state.experienceLevel = button.dataset.experience; else if (state.step === 1) state.goal = button.dataset.value; else state.timeline = button.dataset.value; writeDraft(state); mount(); }));
    const message = root.querySelector('#monthly-message');
    message?.addEventListener('input', () => { state.message = message.value; writeDraft(state); root.querySelector('#monthly-message-count').textContent = state.message.length + '/1000 characters'; root.querySelector('#monthly-next').disabled = !canSubmit(state); });
    root.querySelector('#monthly-terms')?.addEventListener('change', event => { state.termsAccepted = event.target.checked; writeDraft(state); root.querySelector('#monthly-next').disabled = !canSubmit(state); });
    root.querySelector('#monthly-back')?.addEventListener('click', () => { if (state.step === 1) location.hash = '#/mentors/' + encodeURIComponent(state.mentorId || ''); else { state.step -= 1; writeDraft(state); mount(); } });
    root.querySelector('#monthly-next')?.addEventListener('click', event => { if (state.step < 3) { state.step += 1; writeDraft(state); mount(); } else void submit(event.currentTarget); });
  };
  mount();
}
