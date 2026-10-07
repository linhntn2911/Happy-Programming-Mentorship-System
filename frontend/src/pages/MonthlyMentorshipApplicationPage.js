const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const GOALS = ['Do not wish to disclose.', "I'm a student and looking for help with my studies.", 'I just graduated and need help with my career start.', 'I want to change careers or get a new job.', 'I want to enhance or extend my skillset.', 'I need mentorship for a personal project.', 'I need mentorship for my business / product.'];
const TIMELINES = ["I don't have a timeline in mind.", "I'm looking to reach this goal in a few weeks.", "I'm looking to reach this goal in a month or so.", "I'm looking at a timeline of around three months.", "I'm looking to reach this goal in around half a year.", "I'd like to reach this goal in a year or more."];
const keyFor = id => 'hpms.monthly-application-draft.v1.' + (id || 'unknown');
function readDraft(id, fallback) { try { const value = JSON.parse(sessionStorage.getItem(keyFor(id)) || 'null'); return value && value.mentorId === id ? { ...fallback, ...value } : fallback; } catch { return fallback; } }
function writeDraft(state) { try { sessionStorage.setItem(keyFor(state.mentorId), JSON.stringify(state)); } catch { /* memory fallback */ } }
function shell(content, mentorId) {
  return '<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-3"><a href="#/" class="font-semibold text-brand" aria-label="HappyProgramming home">{h} HappyProgramming</a><a href="#/mentors/' + encodeURIComponent(mentorId || '') + '" class="btn btn-outline btn-sm">Back to profile</a></div></header><main class="min-h-[calc(100vh-76px)] bg-cream py-10 sm:py-16"><div class="container max-w-2xl px-5 sm:px-8">' + content + '</div></main>';
}
function progress(step) {
  return '<div class="mb-10 grid grid-cols-3 gap-1.5" aria-label="Application progress">' + [1,2,3].map(n => '<span class="h-1.5 rounded-full ' + (n <= step ? 'bg-brand' : 'bg-line') + '" aria-label="Step ' + n + (n === step ? ', current' : '') + '"></span>').join('') + '</div>';
}
function choice(text, selected) {
  return '<button type="button" class="monthly-choice ' + (selected === text ? 'is-selected' : '') + '" data-value="' + esc(text) + '" aria-pressed="' + (selected === text) + '">' + esc(text) + '</button>';
}
export function mountMonthlyMentorshipApplication(root, mentorId, mentorName) {
  const fallback = { mentorId, mentorName: mentorName || 'your mentor', goal: '', timeline: '', message: '', step: 1, complete: false };
  const state = readDraft(mentorId, fallback);
  state.mentorName = mentorName || state.mentorName || 'your mentor';
  const render = () => {
    if (state.complete) return shell('<section class="monthly-application-card text-center"><span class="monthly-success-icon" aria-hidden="true">✓</span><p class="eyebrow mt-5">Draft saved</p><h1 class="mt-2 font-display text-3xl sm:text-4xl">Your application is ready to review</h1><p class="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">This is only a saved draft for ' + esc(state.mentorName) + '. It has not been sent to the mentor, and no request or payment has been created.</p><div class="mt-8 flex flex-wrap justify-center gap-3"><button type="button" id="edit-monthly-draft" class="btn btn-outline">Edit draft</button><a href="#/mentors/' + encodeURIComponent(state.mentorId || '') + '" class="btn btn-primary">Back to profile</a></div></section>', state.mentorId);
    const step = state.step;
    let body = '';
    if (step === 1) body = '<p class="text-sm text-muted">What best describes the goal of your mentorship?</p><div class="mt-5 grid gap-3" role="group" aria-label="Mentorship goal">' + GOALS.map(item => choice(item, state.goal)).join('') + '</div>';
    if (step === 2) body = '<p class="text-sm text-muted">When would you like to reach that goal?</p><div class="mt-5 grid gap-3" role="group" aria-label="Goal timeline">' + TIMELINES.map(item => choice(item, state.timeline)).join('') + '</div>';
    if (step === 3) body = '<label for="monthly-message" class="text-sm font-medium text-ink">Write a message to ' + esc(state.mentorName) + '</label><div class="mt-2 relative"><textarea id="monthly-message" maxlength="1000" rows="6" class="monthly-message" placeholder="Tell your mentor about your background, your goal and the help you are looking for.">' + esc(state.message) + '</textarea><span id="monthly-message-count" class="absolute right-3 top-3 text-xs text-muted">' + state.message.length + '/1000 characters</span></div><div class="monthly-help-box mt-3"><strong>What to include in your message</strong><ol class="mt-2 list-decimal space-y-1 pl-5"><li><b>Introduce yourself:</b> Describe your background and professional journey.</li><li><b>State your goal:</b> Share your aspirations and the steps you have taken so far.</li><li><b>Express your needs:</b> Tell your mentor about the challenges you are facing and the kind of help you are looking for.</li></ol></div>';
    const disabled = step === 1 ? !state.goal : step === 2 ? !state.timeline : !state.message.trim();
    return shell('<section class="monthly-application-card">' + progress(step) + '<p class="eyebrow">Monthly mentorship</p><h1 class="mt-3 font-display text-3xl sm:text-4xl">Apply to ' + esc(state.mentorName) + '</h1><div class="mt-8">' + body + '</div><div class="mt-12 flex items-center justify-between gap-3"><button type="button" id="monthly-back" class="btn btn-outline">' + (step === 1 ? '← Back to profile' : '← Back') + '</button><button type="button" id="monthly-next" class="btn btn-primary" ' + (disabled ? 'disabled' : '') + '>' + (step === 3 ? 'Save draft' : 'Next') + ' <span aria-hidden="true">→</span></button></div></section>', state.mentorId);
  };
  const mount = () => {
    root.innerHTML = render();
    root.querySelectorAll('.monthly-choice').forEach(button => button.addEventListener('click', () => { if (state.step === 1) state.goal = button.dataset.value; else state.timeline = button.dataset.value; writeDraft(state); mount(); }));
    const message = root.querySelector('#monthly-message');
    message?.addEventListener('input', () => { state.message = message.value; writeDraft(state); root.querySelector('#monthly-message-count').textContent = state.message.length + '/1000 characters'; root.querySelector('#monthly-next').disabled = !state.message.trim(); });
    root.querySelector('#monthly-back')?.addEventListener('click', () => { if (state.step === 1) location.hash = '#/mentors/' + encodeURIComponent(state.mentorId || ''); else { state.step -= 1; writeDraft(state); mount(); } });
    root.querySelector('#monthly-next')?.addEventListener('click', () => { if (state.step < 3) { state.step += 1; writeDraft(state); mount(); } else if (state.message.trim()) { state.complete = true; writeDraft(state); mount(); } });
    root.querySelector('#edit-monthly-draft')?.addEventListener('click', () => { state.complete = false; state.step = 1; writeDraft(state); mount(); });
  };
  mount();
}
