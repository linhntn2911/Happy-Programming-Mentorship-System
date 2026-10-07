import { Footer } from '../components/layout/Footer.js';
import { OtpVerificationForm } from '../components/auth/OtpVerificationForm.js';
import { authService } from '../services/authService.js';
import { mentorApplicationService, fileBase64 } from '../services/mentorApplicationService.js';
import { AuthShell } from './LoginPage.js';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const COUNTRIES = [
  '---------',
  'Vietnam',
  'United States',
  'Singapore',
  'United Kingdom',
  'Australia',
  'Canada',
  'Germany',
  'France',
  'Japan',
  'South Korea',
  'Netherlands',
  'Sweden',
  'India',
  'Taiwan',
  'Philippines',
  'Malaysia',
  'Indonesia',
  'Thailand',
  'Other'
];

const MENTOR_CATEGORIES_OPTIONS = [
  'Please select...',
  'Software Engineering & Architecture',
  'Backend Development',
  'Frontend Development',
  'Full-stack Development',
  'AI, Machine Learning & Data',
  'DevOps, Cloud & Infrastructure',
  'Mobile Application Development',
  'Cybersecurity & Systems',
  'Product & Technical Leadership'
];

export function mountMentorApplication(root) {
  document.title = 'Apply as a mentor | HappyProgramming';

  let currentUser = null;
  let application = null;
  let identityLocked = false;
  // Application form state preserving data across steps
  const state = {
    step: 1,
    // Step 1: About you
    photoDataUrl: '',
    photoFile: null,
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    jobTitle: '',
    company: '',
    location: '',
    // Step 2: Profile
    category: '',
    skills: '',
    bio: '',
    linkedin: '',
    twitter: '',
    website: '',
    // Step 3: Experience
    yearsExperience: '5',
    experienceSummary: '',
    cvFileName: '',
    cvFile: null
  };

  function render() {
    root.innerHTML = `
      <header class="border-b border-line bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div class="container max-w-4xl flex h-16 items-center justify-between">
          <a href="#/" class="flex items-center gap-2.5" aria-label="HappyProgramming home">
            <span class="grid h-8 w-8 place-items-center rounded-[9px] bg-brand font-mono text-base font-bold text-white">{h}</span>
            <span class="text-sm font-semibold tracking-tight text-ink">Happy<span class="text-brand">Programming</span></span>
          </a>
          <div class="flex items-center gap-4">
            <a href="#/login" class="text-xs font-semibold text-muted hover:text-ink transition-colors">Log in</a>
            <a href="#/" class="auth-back-btn" aria-label="Back to homepage">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
              <span class="auth-back-text">Back to homepage</span>
            </a>
          </div>
        </div>
      </header>

      <main class="min-h-[calc(100vh-160px)] bg-[#fdfcff] py-10 sm:py-14">
        <div class="container max-w-2xl px-4 sm:px-6">
          <!-- Main Title -->
          <h1 class="text-3xl sm:text-4xl font-bold font-display text-ink tracking-tight mb-8">
            Apply as a mentor
          </h1>

          <!-- Progress Stepper (About you -> Profile -> Experience) matching reference -->
          <nav class="mb-10" aria-label="Application progress">
            <div class="flex items-center justify-between max-w-md mx-auto relative">
              <!-- Step 1: About you -->
              <div class="flex flex-col items-center gap-2 z-10">
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 ${
                  state.step === 1
                    ? 'border-brand bg-white text-brand ring-4 ring-brand/15'
                    : state.step > 1
                    ? 'border-brand bg-brand text-white shadow-2xs'
                    : 'border-line bg-white text-muted'
                } transition-all">
                  ${
                    state.step > 1
                      ? `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`
                      : `<span class="h-2.5 w-2.5 rounded-full bg-brand"></span>`
                  }
                </span>
                <span class="text-xs font-semibold ${state.step === 1 ? 'text-brand' : state.step > 1 ? 'text-ink' : 'text-muted'}">About you</span>
              </div>

              <!-- Connecting Line 1-2 -->
              <div class="flex-1 h-0.5 mx-2 ${state.step > 1 ? 'bg-brand' : 'bg-line'} transition-colors"></div>

              <!-- Step 2: Profile -->
              <div class="flex flex-col items-center gap-2 z-10">
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 ${
                  state.step === 2
                    ? 'border-brand bg-white text-brand ring-4 ring-brand/15'
                    : state.step > 2
                    ? 'border-brand bg-brand text-white shadow-2xs'
                    : 'border-line bg-white text-muted'
                } transition-all">
                  ${
                    state.step > 2
                      ? `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`
                      : state.step === 2
                      ? `<span class="h-2.5 w-2.5 rounded-full bg-brand"></span>`
                      : ''
                  }
                </span>
                <span class="text-xs font-semibold ${state.step === 2 ? 'text-brand' : state.step > 2 ? 'text-ink' : 'text-muted'}">Profile</span>
              </div>

              <!-- Connecting Line 2-3 -->
              <div class="flex-1 h-0.5 mx-2 ${state.step > 2 ? 'bg-brand' : 'bg-line'} transition-colors"></div>

              <!-- Step 3: Experience -->
              <div class="flex flex-col items-center gap-2 z-10">
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 ${
                  state.step === 3
                    ? 'border-brand bg-white text-brand ring-4 ring-brand/15'
                    : state.step > 3
                    ? 'border-brand bg-brand text-white shadow-2xs'
                    : 'border-line bg-white text-muted'
                } transition-all">
                  ${
                    state.step > 3
                      ? `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`
                      : state.step === 3
                      ? `<span class="h-2.5 w-2.5 rounded-full bg-brand"></span>`
                      : ''
                  }
                </span>
                <span class="text-xs font-semibold ${state.step >= 3 ? 'text-brand' : 'text-muted'}">Experience</span>
              </div>
            </div>
          </nav>

          <!-- Step Content Container -->
          <div id="mentor-step-container">
            ${state.step === 1 ? renderStep1() : state.step === 2 ? renderStep2() : state.step === 3 ? renderStep3() : renderStep4()}
          </div>
        </div>
      </main>

      ${Footer()}
    `;

    bindEvents();
  }

  function renderStep1() {
    return `
      <form id="mentor-apply-form-1" class="space-y-6" novalidate>
        <!-- Info Callout Banner matching reference -->
        <div class="rounded-2xl bg-[#f0f8ff] border border-sky-100 p-5 flex items-start gap-3.5 shadow-2xs">
          <div class="grid h-5 w-5 place-items-center rounded-full bg-sky-500 text-white shrink-0 mt-0.5 font-bold text-[11px]" aria-hidden="true">
            i
          </div>
          <div class="text-xs leading-relaxed text-sky-950 space-y-2">
            <h2 class="font-bold text-sky-950 text-[13px]">Lovely to see you!</h2>
            <p class="text-sky-900/90 leading-normal">
              Filling out the form only takes a couple minutes. We'd love to learn more about your background and the ins-and-outs of why you'd like to become a mentor. Keep things personal and talk directly to us and your mentees. We don't need jargon and polished cover letters here!
            </p>
            <p class="text-sky-900/90 leading-normal">
              You agree to our <a href="#/how-it-works" class="font-semibold text-brand underline underline-offset-2 hover:text-brand-dark">code of conduct</a> and the <a href="#/how-it-works" class="font-semibold text-brand underline underline-offset-2 hover:text-brand-dark">mentor agreement</a> by sending the form, so be sure to have a look at those.
            </p>
          </div>
        </div>

        <!-- Photo Upload -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-ink">Photo</label>
          <div class="flex items-center gap-4">
            <div id="photo-preview-box" class="h-16 w-16 rounded-full bg-[#f1f3f7] border border-line flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              ${
                state.photoDataUrl
                  ? `<img src="${state.photoDataUrl}" class="h-full w-full object-cover" alt="Mentor avatar preview" />`
                  : `<svg class="h-8 w-8 text-muted/50" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
              }
            </div>
            <div>
              <label for="mentor-photo-input" class="btn btn-outline cursor-pointer !py-2 !px-4 !text-xs !font-medium inline-flex items-center gap-2 hover:border-brand hover:text-brand transition-colors">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Upload Photo</span>
              </label>
              <input type="file" id="mentor-photo-input" name="photo" accept="image/png, image/jpeg, image/webp" class="sr-only">
            </div>
          </div>
        </div>

        <!-- Row 1: First name | Last name -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="mentor-first-name" class="block text-xs font-semibold text-ink mb-1.5">First name <span class="text-rose-500">*</span></label>
            <input
              type="text"
              id="mentor-first-name"
              name="firstName"
              value="${escapeHtml(state.firstName)}"
              required
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="e.g. Linh"
            />
            <p id="first-name-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
          <div>
            <label for="mentor-last-name" class="block text-xs font-semibold text-ink mb-1.5">Last name <span class="text-rose-500">*</span></label>
            <input
              type="text"
              id="mentor-last-name"
              name="lastName"
              value="${escapeHtml(state.lastName)}"
              required
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="e.g. Nguyen"
            />
            <p id="last-name-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
        </div>

        <!-- Row 2: Email | Choose a Password -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="mentor-email" class="block text-xs font-semibold text-ink mb-1.5">Email <span class="text-rose-500">*</span></label>
            <input
              type="email"
              id="mentor-email"
              name="email"
              value="${escapeHtml(state.email)}"
              required
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="name@example.com"
            />
            <p id="email-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
          <div>
            <label for="mentor-password" class="block text-xs font-semibold text-ink mb-1.5">Choose a Password <span class="text-rose-500">*</span></label>
            <div class="relative">
              <input
                type="password"
                id="mentor-password"
                name="password"
                value="${escapeHtml(state.password)}"
                required
                minlength="8"
                class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 pr-10 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                id="toggle-mentor-password"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink transition-colors cursor-pointer"
                aria-label="Toggle password visibility"
              >
                <svg id="eye-icon-show" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg id="eye-icon-hide" class="h-4 w-4 hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              </button>
            </div>
            <p id="password-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
        </div>

        <!-- Row 3: Job title | Company (optional) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="mentor-job-title" class="block text-xs font-semibold text-ink mb-1.5">Job title <span class="text-rose-500">*</span></label>
            <input
              type="text"
              id="mentor-job-title"
              name="jobTitle"
              value="${escapeHtml(state.jobTitle)}"
              required
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="e.g. Senior Backend Engineer"
            />
            <p id="job-title-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
          <div>
            <label for="mentor-company" class="block text-xs font-semibold text-ink mb-1.5">Company <span class="text-muted font-normal">(optional)</span></label>
            <input
              type="text"
              id="mentor-company"
              name="company"
              value="${escapeHtml(state.company)}"
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="e.g. Google, FPT Software"
            />
          </div>
        </div>

        <!-- Row 4: Location -->
        <div>
          <label for="mentor-location" class="block text-xs font-semibold text-ink mb-1.5">Location <span class="text-rose-500">*</span></label>
          <div class="relative">
            <select
              id="mentor-location"
              name="location"
              required
              class="w-full appearance-none rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 pr-10 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
            >
              ${COUNTRIES.map(c => `
                <option value="${c === '---------' ? '' : escapeHtml(c)}" ${state.location === c ? 'selected' : ''}>
                  ${escapeHtml(c)}
                </option>
              `).join('')}
            </select>
            <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <p id="location-error" class="mt-1 text-xs text-rose-500 hidden"></p>
        </div>

        <!-- Feedback alert -->
        <div id="step1-global-error" class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 hidden" role="alert"></div>

        <!-- Next Step Button (Right-aligned pill button matching reference) -->
        <div class="flex justify-end pt-4">
          <button
            type="submit"
            id="btn-next-step-1"
            class="btn btn-primary !rounded-full !px-8 !py-2.5 !text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Next step
          </button>
        </div>
      </form>
    `;
  }

  function renderStep2() {
    return `
      <form id="mentor-apply-form-2" class="space-y-6" novalidate>
        <!-- Category Dropdown matching Image 3 -->
        <div>
          <label for="mentor-category" class="block text-xs font-semibold text-ink mb-1.5">Category <span class="text-rose-500">*</span></label>
          <div class="relative">
            <select
              id="mentor-category"
              name="category"
              required
              class="w-full appearance-none rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 pr-10 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
            >
              ${MENTOR_CATEGORIES_OPTIONS.map(cat => `
                <option value="${cat === 'Please select...' ? '' : escapeHtml(cat)}" ${state.category === cat ? 'selected' : ''}>
                  ${escapeHtml(cat)}
                </option>
              `).join('')}
            </select>
            <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <p id="category-error" class="mt-1 text-xs text-rose-500 hidden"></p>
        </div>

        <!-- Skills matching Image 3 -->
        <div>
          <label for="mentor-skills" class="block text-xs font-semibold text-ink mb-1.5">Skills <span class="text-rose-500">*</span></label>
          <input
            type="text"
            id="mentor-skills"
            name="skills"
            value="${escapeHtml(state.skills)}"
            required
            class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            placeholder="Add a new skill..."
          />
          <p class="mt-1.5 text-xs text-muted leading-relaxed">
            Describe your expertise to connect with mentees who have similar interests.<br>
            Comma-separated list of your skills (keep it below 10). Mentees will use this to find you.
          </p>
          <p id="skills-error" class="mt-1 text-xs text-rose-500 hidden"></p>
        </div>

        <!-- Bio matching Image 3 -->
        <div>
          <label for="mentor-bio" class="block text-xs font-semibold text-ink mb-1.5">Bio <span class="text-rose-500">*</span></label>
          <textarea
            id="mentor-bio"
            name="bio"
            rows="6"
            required
            class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] p-3.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-y min-h-[140px]"
            placeholder=""
          >${escapeHtml(state.bio)}</textarea>
          <p class="mt-1.5 text-xs text-muted leading-relaxed">
            Tell us (and your mentees) a little bit about yourself. Talk about yourself in the first person, as if you'd directly talk to a mentee. This will be public.
          </p>
          <p id="bio-error" class="mt-1 text-xs text-rose-500 hidden"></p>
        </div>

        <!-- Row: LinkedIn URL | Twitter Handle (optional) matching Image 3 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="mentor-linkedin" class="block text-xs font-semibold text-ink mb-1.5">LinkedIn URL <span class="text-rose-500">*</span></label>
            <input
              type="url"
              id="mentor-linkedin"
              name="linkedin"
              value="${escapeHtml(state.linkedin)}"
              required
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder=""
            />
            <p id="linkedin-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
          <div>
            <label for="mentor-twitter" class="block text-xs font-semibold text-ink mb-1.5">Twitter Handle (optional) <span class="text-muted font-normal">(optional)</span></label>
            <input
              type="text"
              id="mentor-twitter"
              name="twitter"
              value="${escapeHtml(state.twitter)}"
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder=""
            />
            <p class="mt-1.5 text-xs text-muted">Omit the "@" - e.g. "dqmonn"</p>
            <p id="twitter-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
        </div>

        <!-- Row: Personal Website (optional) matching Image 3 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="mentor-website" class="block text-xs font-semibold text-ink mb-1.5">Personal Website (optional) <span class="text-muted font-normal">(optional)</span></label>
            <input
              type="url"
              id="mentor-website"
              name="website"
              value="${escapeHtml(state.website)}"
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink transition-all focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder=""
            />
            <p class="mt-1.5 text-xs text-muted">You can add your blog, GitHub profile or similar here</p>
            <p id="website-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
        </div>

        <!-- Action Buttons (Previous step on left, Next step on right matching Image 3) -->
        <div class="flex items-center justify-between pt-6">
          <button
            type="button"
            id="btn-prev-step-2"
            class="btn btn-primary !rounded-full !px-8 !py-2.5 !text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Previous step
          </button>
          <button
            type="submit"
            id="btn-next-step-2"
            class="btn btn-primary !rounded-full !px-8 !py-2.5 !text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Next step
          </button>
        </div>
      </form>
    `;
  }

  function renderStep3() {
    return `
      <form id="mentor-apply-form-3" class="space-y-6" novalidate>
        <div class="space-y-5">
          <div>
            <label for="mentor-years" class="block text-xs font-semibold text-ink mb-1.5">Years of practical development experience <span class="text-rose-500">*</span></label>
            <input
              type="number"
              id="mentor-years"
              name="yearsExperience"
              min="0"
              max="80"
              value="${escapeHtml(state.yearsExperience)}"
              required
              class="w-full max-w-xs rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] px-3.5 py-2.5 text-sm text-ink focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <p id="years-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>

          <div>
            <label for="mentor-summary" class="block text-xs font-semibold text-ink mb-1.5">Comprehensive Career Summary & Technical Milestones <span class="text-rose-500">*</span></label>
            <textarea
              id="mentor-summary"
              name="experienceSummary"
              rows="5"
              required
              class="w-full rounded-lg border border-[#ddd5e6] bg-[#fbf9ff] p-3.5 text-sm text-ink focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-y"
              placeholder="Highlight key engineering roles, major systems architected, production achievements, and teams mentored..."
            >${escapeHtml(state.experienceSummary)}</textarea>
            <p id="summary-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-ink mb-1.5">Resume / CV Document (PDF, up to 10 MB) <span class="text-rose-500">*</span></label>
            <div class="rounded-xl border-2 border-dashed border-line bg-[#fbf9ff] p-6 text-center hover:border-brand/40 transition-colors">
              <svg class="mx-auto h-8 w-8 text-brand/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <p class="mt-2 text-xs font-semibold text-ink">
                ${state.cvFileName ? escapeHtml(state.cvFileName) : 'Upload your resume / CV (PDF)'}
              </p>
              <label for="mentor-cv-input" class="btn btn-outline btn-sm mt-3 inline-block cursor-pointer">
                Choose file
              </label>
              <input type="file" id="mentor-cv-input" accept="application/pdf" class="sr-only">
            </div>
            <p id="cv-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>

          <div class="rounded-lg bg-lilac/30 p-4 text-xs text-ink leading-relaxed">
            <label class="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" id="mentor-terms" required class="mt-0.5 rounded text-brand focus:ring-brand">
              <span>I certify that all details submitted are accurate and agree to HappyProgramming's Code of Conduct and Escrow Mentorship Agreement.</span>
            </label>
            <p id="terms-error" class="mt-1 text-xs text-rose-500 hidden"></p>
          </div>
          <div id="step3-global-error" class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 hidden" role="alert"></div>

          <div class="flex items-center justify-between pt-6">
            <button type="button" id="btn-prev-step-3" class="btn btn-primary !rounded-full !px-8 !py-2.5 !text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer">
              Previous step
            </button>
            <button type="submit" id="btn-submit-app" class="btn btn-primary !rounded-full !px-8 !py-2.5 !text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer">
              Submit Application
            </button>
          </div>
        </div>
      </form>
    `;
  }

  function renderStep4() {
    return `
      <div class="rounded-2xl border border-line bg-white p-6 sm:p-10 shadow-lg animate-fade-in max-w-lg mx-auto">
        ${OtpVerificationForm({ email: escapeHtml(state.email) })}
        <p class="text-xs text-muted mt-4">Your code expires after 15 minutes. Verification sends your application to Staff for review.</p>
      </div>
    `;
  }

  function bindEvents() {
    if (state.step === 1) {
      const form = root.querySelector('#mentor-apply-form-1');
      if (!form) return;

      const photoInput = root.querySelector('#mentor-photo-input');
      const photoPreviewBox = root.querySelector('#photo-preview-box');
      const togglePassword = root.querySelector('#toggle-mentor-password');
      const passwordInput = root.querySelector('#mentor-password');
      if (identityLocked) {
        ['mentor-email', 'mentor-first-name', 'mentor-last-name'].forEach(id => {
          const input = root.querySelector('#' + id);
          if (input) input.readOnly = true;
        });
        passwordInput.required = false;
        passwordInput.closest('div.space-y-1, div.space-y-2')?.setAttribute('hidden', '');
        const passwordLabel = root.querySelector('label[for="mentor-password"]');
        if (passwordLabel) passwordLabel.parentElement.hidden = true;
      }
      const eyeShow = root.querySelector('#eye-icon-show');
      const eyeHide = root.querySelector('#eye-icon-hide');

      photoInput?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (file) {
          if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            photoInput.setCustomValidity('Choose a PNG, JPEG or WebP photo no larger than 2 MB.');
            photoInput.reportValidity();
            photoInput.value = '';
            return;
          }
          photoInput.setCustomValidity('');
          state.photoFile = file;
          const reader = new FileReader();
          reader.onload = ev => {
            state.photoDataUrl = ev.target.result;
            if (photoPreviewBox) {
              photoPreviewBox.innerHTML = `<img src="${state.photoDataUrl}" class="h-full w-full object-cover" alt="Mentor avatar preview" />`;
            }
          };
          reader.readAsDataURL(file);
        }
      });

      togglePassword?.addEventListener('click', () => {
        if (!passwordInput) return;
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        eyeShow?.classList.toggle('hidden', isPassword);
        eyeHide?.classList.toggle('hidden', !isPassword);
      });

      form.addEventListener('submit', e => {
        e.preventDefault();

        const firstName = form.querySelector('#mentor-first-name').value.trim();
        const lastName = form.querySelector('#mentor-last-name').value.trim();
        const email = form.querySelector('#mentor-email').value.trim();
        const password = form.querySelector('#mentor-password').value;
        const jobTitle = form.querySelector('#mentor-job-title').value.trim();
        const company = form.querySelector('#mentor-company').value.trim();
        const location = form.querySelector('#mentor-location').value;

        root.querySelectorAll('[id$="-error"]').forEach(el => { el.classList.add('hidden'); el.textContent = ''; });

        let hasError = false;

        if (!firstName) {
          showFieldError('first-name', 'Please enter your first name.');
          hasError = true;
        } else if (firstName.length > 50) {
          showFieldError('first-name', 'First name cannot exceed 50 characters.');
          hasError = true;
        }

        if (!lastName) {
          showFieldError('last-name', 'Please enter your last name.');
          hasError = true;
        } else if (lastName.length > 50) {
          showFieldError('last-name', 'Last name cannot exceed 50 characters.');
          hasError = true;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showFieldError('email', 'Please enter a valid email address.');
          hasError = true;
        }

        if (!identityLocked && (!password || password.length < 8)) {
          showFieldError('password', 'Password must be at least 8 characters long.');
          hasError = true;
        } else if (!identityLocked && (!/(?=.*[a-z])(?=.*[A-Z])/.test(password) || new TextEncoder().encode(password).length > 72)) {
          showFieldError('password', 'Use uppercase and lowercase letters, with a maximum of 72 bytes.');
          hasError = true;
        }

        if (!jobTitle) {
          showFieldError('job-title', 'Please specify your current job title.');
          hasError = true;
        } else if (jobTitle.length > 100) {
          showFieldError('job-title', 'Job title cannot exceed 100 characters.');
          hasError = true;
        }

        if (company && company.length > 100) {
          showFieldError('company', 'Company name cannot exceed 100 characters.');
          hasError = true;
        }

        if (!location || location === '---------') {
          showFieldError('location', 'Please select your country or location.');
          hasError = true;
        }

        if (hasError) return;

        state.firstName = firstName;
        state.lastName = lastName;
        state.email = email;
        state.password = password;
        state.jobTitle = jobTitle;
        state.company = company;
        state.location = location;

        state.step = 2;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else if (state.step === 2) {
      const form = root.querySelector('#mentor-apply-form-2');
      const prevBtn = root.querySelector('#btn-prev-step-2');

      prevBtn?.addEventListener('click', () => {
        // Save current inputs before returning to step 1
        state.category = form?.querySelector('#mentor-category')?.value || '';
        state.skills = form?.querySelector('#mentor-skills')?.value.trim() || '';
        state.bio = form?.querySelector('#mentor-bio')?.value.trim() || '';
        state.linkedin = form?.querySelector('#mentor-linkedin')?.value.trim() || '';
        state.twitter = form?.querySelector('#mentor-twitter')?.value.trim() || '';
        state.website = form?.querySelector('#mentor-website')?.value.trim() || '';

        state.step = 1;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      form?.addEventListener('submit', e => {
        e.preventDefault();

        const category = form.querySelector('#mentor-category').value;
        const skills = form.querySelector('#mentor-skills').value.trim();
        const bio = form.querySelector('#mentor-bio').value.trim();
        let linkedin = form.querySelector('#mentor-linkedin').value.trim();
        let twitter = form.querySelector('#mentor-twitter').value.trim();
        let website = form.querySelector('#mentor-website').value.trim();

        root.querySelectorAll('[id$="-error"]').forEach(el => { el.classList.add('hidden'); el.textContent = ''; });

        let hasError = false;

        if (!category || category === 'Please select...') {
          showFieldError('category', 'Please select your primary mentoring category.');
          hasError = true;
        }

        // Skills validation: comma-separated, max 10
        const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
        if (skillList.length === 0) {
          showFieldError('skills', 'Please list your core teaching skills (comma-separated).');
          hasError = true;
        } else if (skillList.length > 10) {
          showFieldError('skills', `Please keep your skills below 10 (currently ${skillList.length} skills).`);
          hasError = true;
        }

        // Bio validation: minimum 50 characters per SRS Section 1.2.2, max 1000 per database
        if (!bio || bio.length < 50) {
          showFieldError('bio', `Bio must be at least 50 characters (currently ${bio.length} characters).`);
          hasError = true;
        } else if (bio.length > 1000) {
          showFieldError('bio', `Bio cannot exceed 1000 characters (currently ${bio.length} characters).`);
          hasError = true;
        }

        // LinkedIn URL validation: must be a valid profile URL
        if (!linkedin) {
          showFieldError('linkedin', 'Please enter your LinkedIn profile URL.');
          hasError = true;
        } else {
          let normalizedLinkedin = linkedin;
          if (!/^https?:\/\//i.test(normalizedLinkedin)) {
            normalizedLinkedin = 'https://' + normalizedLinkedin;
          }
          const linkedinRegex = /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|company|profile)\/[a-zA-Z0-9_\-\.%]+\/?$/i;
          if (!linkedinRegex.test(normalizedLinkedin)) {
            showFieldError('linkedin', 'Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username).');
            hasError = true;
          } else {
            linkedin = normalizedLinkedin;
          }
        }

        // Twitter Handle validation (optional)
        if (twitter) {
          if (twitter.startsWith('@')) {
            showFieldError('twitter', "Please omit the '@' prefix (e.g. 'dqmonn').");
            hasError = true;
          } else if (!/^[A-Za-z0-9_]{1,15}$/.test(twitter)) {
            showFieldError('twitter', 'Twitter handle must be 1-15 characters and contain only letters, numbers, and underscores.');
            hasError = true;
          }
        }

        // Personal Website validation (optional)
        if (website) {
          let normalizedWebsite = website;
          if (!/^https?:\/\//i.test(normalizedWebsite)) {
            normalizedWebsite = 'https://' + normalizedWebsite;
          }
          try {
            const parsed = new URL(normalizedWebsite);
            if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
              throw new Error();
            }
            website = normalizedWebsite;
          } catch {
            showFieldError('website', 'Please enter a valid personal website or GitHub URL (e.g. https://github.com/username).');
            hasError = true;
          }
        }

        if (hasError) return;

        state.category = category;
        state.skills = skills;
        state.bio = bio;
        state.linkedin = linkedin;
        state.twitter = twitter;
        state.website = website;

        state.step = 3;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else if (state.step === 3) {
      const form = root.querySelector('#mentor-apply-form-3');
      const prevBtn = root.querySelector('#btn-prev-step-3');
      const cvInput = root.querySelector('#mentor-cv-input');

      cvInput?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        root.querySelector('#cv-error')?.classList.add('hidden');
        if (file) {
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          if (!isPdf) {
            showFieldError('cv', 'Only PDF format is accepted for Resume/CV.');
            state.cvFile = null;
            state.cvFileName = '';
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            showFieldError('cv', `File size exceeds 10 MB limit (currently ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
            state.cvFile = null;
            state.cvFileName = '';
            return;
          }
          state.cvFile = file;
          state.cvFileName = file.name;
          render();
        }
      });

      prevBtn?.addEventListener('click', () => {
        state.step = 2;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      form?.addEventListener('submit', async e => {
        e.preventDefault();

        const yearsStr = form.querySelector('#mentor-years')?.value.trim();
        const experienceSummary = form.querySelector('#mentor-summary')?.value.trim();
        const terms = form.querySelector('#mentor-terms');

        root.querySelectorAll('[id$="-error"]').forEach(el => { el.classList.add('hidden'); el.textContent = ''; });

        let hasError = false;

        const years = parseFloat(yearsStr);
        if (isNaN(years) || years < 0 || years > 80) {
          showFieldError('years', 'Please enter valid years of experience (between 0 and 80).');
          hasError = true;
        }

        if (!experienceSummary || experienceSummary.length < 30) {
          showFieldError('summary', `Career summary must be at least 30 characters (currently ${experienceSummary ? experienceSummary.length : 0}).`);
          hasError = true;
        } else if (experienceSummary.length > 5000) {
          showFieldError('summary', 'Career summary cannot exceed 5000 characters.');
          hasError = true;
        }

        if (!state.cvFile && !state.cvFileName) {
          showFieldError('cv', 'Please upload your Resume / CV document in PDF format.');
          hasError = true;
        }

        if (!terms.checked) {
          showFieldError('terms', 'You must agree to HappyProgramming Code of Conduct and Escrow Mentorship Agreement.');
          hasError = true;
        }

        if (hasError) return;

        state.yearsExperience = yearsStr;
        state.experienceSummary = experienceSummary;

        const submitBtn = form.querySelector('#btn-submit-app');
        const prevBtnStep3 = form.querySelector('#btn-prev-step-3');
        const originalText = submitBtn.innerHTML;

        submitBtn.disabled = true;
        if (prevBtnStep3) prevBtnStep3.disabled = true;
        submitBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Submitting...
        `;

        try {
          application = await mentorApplicationService.submit({
            firstName: state.firstName,
            lastName: state.lastName,
            email: state.email,
            password: identityLocked ? null : state.password,
            jobTitle: state.jobTitle,
            company: state.company || '',
            location: state.location,
            category: state.category,
            skills: state.skills,
            bio: state.bio,
            linkedin: state.linkedin,
            twitter: state.twitter || '',
            website: state.website || '',
            yearsExperience: parseFloat(state.yearsExperience),
            experienceSummary: state.experienceSummary,
            cvFileName: state.cvFileName || '',
            cvBase64: await fileBase64(state.cvFile),
            photoDataUrl: state.photoDataUrl || null,
            acceptedTerms: terms.checked
          });

          identityLocked = true;
          state.password = '';
          // Transition to OTP verification step
          state.step = 4;
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          const globalError = form.querySelector('#step3-global-error');
          if (globalError) {
            globalError.textContent = err.message || 'Unable to submit application. Please check your information and try again.';
            globalError.classList.remove('hidden');
          }
          submitBtn.disabled = false;
          if (prevBtnStep3) prevBtnStep3.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
    } else if (state.step === 4) {
      const otpForm = root.querySelector('#otp-form');
      const otpInput = otpForm?.querySelector('#otp-code');
      const otpFeedback = otpForm?.querySelector('#otp-feedback');
      const otpSuccess = otpForm?.querySelector('#otp-success');
      const otpSubmit = otpForm?.querySelector('#otp-submit');
      const resendBtn = otpForm?.querySelector('#resend-otp-btn');
      const resendTimer = otpForm?.querySelector('#resend-timer');
      const backBtn = otpForm?.querySelector('#back-to-signup-btn');

      if (backBtn) {
        backBtn.textContent = '← Back to edit application';
      }

      otpSubmit.textContent = 'Verify and submit';
      let busy = false;
      let cooldown = 60;
      let timerId = null;

      function startCooldown() {
        cooldown = Math.max(0, Math.ceil((Date.parse(application?.resendAvailableAt + 'Z') - Date.now()) / 1000)) || 0;
        if (!resendBtn || !resendTimer) return;
        resendBtn.disabled = true;
        resendBtn.classList.add('opacity-50', 'pointer-events-none');
        resendTimer.classList.remove('hidden');
        resendTimer.textContent = `(${cooldown}s)`;

        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => {
          if (!otpForm.isConnected) { clearInterval(timerId); return; }
          cooldown -= 1;
          if (cooldown <= 0) {
            clearInterval(timerId);
            resendBtn.disabled = false;
            resendBtn.classList.remove('opacity-50', 'pointer-events-none');
            resendTimer.classList.add('hidden');
          } else {
            resendTimer.textContent = `(${cooldown}s)`;
          }
        }, 1000);
      }

      startCooldown();
      otpInput?.focus();

      otpForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const code = otpInput?.value.trim();
        if (!code || code.length !== 6 || busy) return;

        busy = true;
        otpSubmit.disabled = true;
        otpSubmit.textContent = 'Verifying…';
        otpFeedback.hidden = true;
        otpSuccess.hidden = true;

        try {
          application = await mentorApplicationService.verify(code);
          currentUser = await authService.me().catch(() => null);
          if (timerId) clearInterval(timerId);
          showStatus(application);
        } catch (err) {
          otpFeedback.textContent = err.message || 'Invalid or expired verification code. Please check and try again.';
          otpFeedback.hidden = false;
          otpInput?.select();
        } finally {
          busy = false;
          otpSubmit.disabled = false;
          otpSubmit.textContent = 'Verify and submit';
        }
      });

      resendBtn?.addEventListener('click', async () => {
        if (resendBtn.disabled || busy) return;
        otpFeedback.hidden = true;
        otpSuccess.hidden = true;
        try {
          application = await mentorApplicationService.resend();
          otpSuccess.textContent = 'A fresh 6-digit verification code has been sent to your email!';
          otpSuccess.hidden = false;
          startCooldown();
        } catch (err) {
          otpFeedback.textContent = err.message || 'Unable to resend code. Please try again later.';
          otpFeedback.hidden = false;
        }
      });

      backBtn?.addEventListener('click', () => {
        if (timerId) clearInterval(timerId);
        state.step = 3;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function showFieldError(field, message) {
    const errorEl = root.querySelector(`#${field}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  function showStatus(a) {
    const approved = a.status === 'APPROVED';
    const rejected = a.status === 'REJECTED';
    root.innerHTML = AuthShell(`
      <h1 class="font-display auth-title">Mentor application</h1>
      <div class="rounded-2xl border border-line bg-white p-6 space-y-5">
        <span class="badge">${escapeHtml(a.status)}</span>
        <h2 class="text-xl font-semibold">${approved ? 'Your application is approved' : rejected ? 'Please update your application' : 'Your application is awaiting Staff review'}</h2>
        <p class="text-muted text-sm">${approved ? 'You can now log in as a mentor. Your mentee access is still available.' : rejected ? escapeHtml(a.rejectionReason) : 'Your email is verified and your application has been submitted. You can continue using your mentee account while we review it.'}</p>
        ${rejected ? '<button id="edit-application" class="btn btn-primary">Edit and resubmit</button>' : ''}
        ${approved ? '<a href="#/login" class="btn btn-primary">Log in as mentor</a>' : ''}
        <button id="refresh-status" class="btn btn-outline">Refresh status</button>
        <a href="#/" class="auth-link">Back to homepage</a>
      </div>`);
    root.querySelector('#edit-application')?.addEventListener('click', () => { state.step = 1; render(); });
    root.querySelector('#refresh-status').addEventListener('click', initialise);
  }

  function emailGate() {
    root.innerHTML = AuthShell(`
      <h1 class="font-display auth-title">Become a mentor</h1>
      <p class="text-muted mb-6">Start with your email. Already a mentee? Log in to apply with your existing account.</p>
      <form id="application-email-gate" class="auth-form">
        <label for="application-email">Email address</label>
        <input id="application-email" class="w-full rounded-lg border border-line bg-cream p-3" type="email" maxlength="254" autocomplete="email" required>
        <p id="gate-feedback" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">Continue</button>
        <a class="auth-link" href="#/login?return=mentor">Already have an account? Please log in</a>
      </form>`);
    const form = root.querySelector('form');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button');
      if (button.disabled) return;
      button.disabled = true;
      const feedback = form.querySelector('#gate-feedback');
      feedback.hidden = true;
      try {
        const email = form.querySelector('input').value.trim();
        const result = await mentorApplicationService.checkEmail(email);
        if (!form.isConnected) return;
        if (result.loginRequired) {
          feedback.textContent = 'An account already uses this email. Please log in below to continue your mentor application.';
          feedback.hidden = false;
          form.querySelector('a').focus();
        } else { state.email = email; render(); }
      } catch (error) {
        feedback.textContent = error.message; feedback.hidden = false;
      } finally { button.disabled = false; }
    });
  }

  async function initialise() {
    root.innerHTML = AuthShell('<p id="application-loading" role="status">Loading your application…</p>');
    const loading = root.querySelector('#application-loading');
    try {
      currentUser = await authService.me().catch(error => { if (error.status === 401) return null; throw error; });
      if (!loading.isConnected) return;
      application = await mentorApplicationService.mine();
      if (!loading.isConnected) return;
      if (application) {
        Object.assign(state, application.profile || {}, { cvFileName: application.cvFileName, password: '' });
        identityLocked = true;
        if (application.status === 'DRAFT') { state.step = 4; render(); }
        else showStatus(application);
      } else if (currentUser) {
        if (currentUser.roles?.includes('MENTOR') || currentUser.role === 'MENTOR') {
          showStatus({ status: 'APPROVED' }); return;
        }
        state.email = currentUser.email;
        const names = currentUser.name.trim().split(/\s+/);
        state.firstName = names.shift() || '';
        state.lastName = names.join(' ') || state.firstName;
        identityLocked = true;
        render();
      } else emailGate();
    } catch (error) {
      if (!loading.isConnected) return;
      root.innerHTML = AuthShell(`<p role="alert">${escapeHtml(error.message)}</p><button id="application-retry" class="btn btn-outline mt-4">Try again</button>`);
      root.querySelector('#application-retry').onclick = initialise;
    }
  }

  initialise();
}
