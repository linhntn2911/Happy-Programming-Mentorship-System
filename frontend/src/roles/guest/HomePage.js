import { MENTOR_CATEGORIES } from './mentorDiscovery.js';
import { Header } from '../../shared/Header.js';
import { Footer } from '../../shared/Footer.js';
import { MentorCard } from '../../shared/MentorCard.js';
import { MentorAvatar } from '../../shared/MentorAvatar.js';
import { escapeHtml as e } from '../../shared/html.js';

export function HomePage(mentors = [], user = null, navigationMentors = mentors) {
  const mentorCardsHtml = mentors.length > 0
    ? mentors.map(m => MentorCard(m)).join('')
    : '<div class="col-span-full py-12 text-center text-muted">Loading mentors...</div>';

  const spotlightCardsHtml = mentors.map(mentor => `
    <button class="spotlight-card" data-mentor-id="${e(mentor.id)}" aria-label="View profile of ${e(mentor.name)}">
      ${MentorAvatar(mentor, 'spotlight-image', 185)}
      <span class="mt-4 block font-display text-[21px]">${e(mentor.name)}</span>
      <span class="mt-1 block text-[10px] leading-5 text-muted">${e(mentor.role)}</span>
      <span class="mt-3 flex items-center justify-between border-t border-line pt-3 text-[10px]">
        <span class="text-muted">${e(mentor.specialty)}</span>
        <span class="inline-flex items-center gap-1.5 text-brand">View profile <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></span>
      </span>
    </button>
  `).join('');

  return `
<a href="#main" class="sr-only z-50 rounded-lg bg-brand p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
<div class="hero-shell relative z-20">
  ${Header(navigationMentors, user)}
</div>
<main id="main">
  <div class="hero-shell relative overflow-hidden">
    <section class="relative z-10 pb-8 pt-12 sm:pt-16" aria-labelledby="hero-title">
      <div class="container text-center">
        <p class="mb-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">A HUMAN CONNECTION. A BETTER WAY TO LEARN.</p>
        <h1 id="hero-title" class="hero-title">1-on-1 mentorship for<br><em>your next chapter in code.</em></h1>
        <p class="mx-auto mt-6 max-w-xl text-[14px] leading-7 text-muted">Build your skills. Get unstuck. Bring your ideas to life.<br class="hidden sm:block"> Find a programming mentor who gets where you want to go.</p>
        <form id="mentor-search" data-search-form class="search-form mx-auto mt-7 max-w-[640px] border-brand/20 bg-white text-ink shadow-lg shadow-brand/10" role="search" action="#/mentors">
          <span class="ml-3 text-muted"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></span>
          <label class="sr-only" for="search-input">Search by skill, name or role</label>
          <input id="search-input" data-search-input name="q" type="search" placeholder="Try Java, React, or a mentor's name" class="placeholder:text-muted" maxlength="100" autocomplete="off">
          <button class="btn btn-light shrink-0 !px-4 sm:!px-6" type="submit">Find mentors <span class="hidden sm:inline-flex"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></span></button>
        </form>
        <div class="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
          ${MENTOR_CATEGORIES.map(({ label }) => `<a class="topic-pill" href="?${new URLSearchParams({ categories: label })}#/mentors">${label.replaceAll('&', '&amp;')}</a>`).join('') }
        </div>
      </div>
      <div class="mt-6 sm:mt-9">
        <div id="spotlight-rail" class="spotlight-rail" aria-label="Featured mentor profiles" tabindex="0">
          ${spotlightCardsHtml}
        </div>
        <div class="container mt-2 flex items-center justify-between gap-4">
          <p class="text-[9px] text-muted">Meet your possibilities. Profiles shown are illustrative.</p>
          <div class="flex gap-2">
            <button id="rail-prev" class="rail-control" aria-label="Previous mentors" aria-controls="spotlight-rail"><span class="rotate-180"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></span></button>
            <button id="rail-next" class="rail-control" aria-label="Next mentors" aria-controls="spotlight-rail"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div id="homepage-content">
    <section class="border-b border-line bg-white py-7" aria-label="Programming skills">
      <div class="container flex flex-col items-center justify-between gap-5 md:flex-row">
        <p class="text-[10px] text-muted">YOUR AMBITION. YOUR TECH STACK.</p>
        <div class="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
          <button data-quick-search="Java" class="font-mono text-lg font-semibold text-[#7f718e] hover:text-brand">{ } Java</button>
          <button data-quick-search="React" class="text-lg font-semibold text-[#7f718e] hover:text-brand">⚛ React</button>
          <button data-quick-search="Python" class="text-lg font-semibold text-[#7f718e] hover:text-brand">Python</button>
          <button data-quick-search="Spring Boot" class="text-lg font-semibold text-[#7f718e] hover:text-brand">Spring Boot</button>
          <button data-quick-search="Docker" class="text-lg font-semibold text-[#7f718e] hover:text-brand">Docker</button>
        </div>
      </div>
    </section>

    <section class="py-16 sm:py-24" aria-labelledby="benefits-title">
      <div class="container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p class="eyebrow">REAL PEOPLE. PERSONAL GUIDANCE.</p>
          <h2 id="benefits-title" class="section-title mt-4">A mentor in your corner.<br>A clear path forward.</h2>
          <p class="section-copy mt-5">Tutorials can show you how. A mentor helps you understand why. Work through the challenges that matter to you with someone who can turn feedback into your next step.</p>
          <ul class="mt-6 grid gap-4 text-[12px] sm:grid-cols-2">
            <li class="flex items-center gap-2.5"><span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>Personal learning goals</li>
            <li class="flex items-center gap-2.5"><span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>Practical code reviews</li>
            <li class="flex items-center gap-2.5"><span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>Direct 1-on-1 conversations</li>
            <li class="flex items-center gap-2.5"><span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>Flexible ways to learn</li>
          </ul>
          <a href="#mentors" data-reset-discovery class="btn btn-primary mt-7">Meet your mentor <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></a>
        </div>
        <div class="workspace-demo" aria-label="Illustrative mentorship workspace">
          <div class="workspace-panel">
            <div class="flex items-center gap-3 border-b border-line px-5 py-4">
              <img src="/images/mentor-1.jpg" alt="" width="36" height="36" class="h-9 w-9 rounded-full">
              <div>
                <p class="text-[11px] font-semibold">Your mentorship workspace</p>
                <p class="mt-1 text-[9px] text-muted">A little support goes a long way</p>
              </div>
              <span class="ml-auto text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M7 9h10m-10 4h6"/></svg></span>
            </div>
            <div class="space-y-4 px-5 py-5">
              <p class="ml-auto max-w-[240px] rounded-xl rounded-br-sm bg-lilac px-4 py-3 text-[10px] leading-5">I've built my first API. Could we review the way I handle errors?</p>
              <p class="max-w-[245px] rounded-xl rounded-bl-sm bg-[#f7f6f8] px-4 py-3 text-[10px] leading-5">Absolutely. Let's walk through it together and make your responses more consistent.</p>
              <div class="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[9px] text-muted"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/></svg> project-review.java <span class="ml-auto text-brand">Ready to review</span></div>
              <p class="text-[8px] uppercase tracking-[.14em] text-muted">Workspace preview</p>
            </div>
          </div>
          <div class="call-badge">
            <p class="flex items-center gap-2 text-[10px] font-semibold"><span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="12" height="14" rx="3"/><path d="m15 10 6-4v12l-6-4"/></svg></span> Your next breakthrough</p>
            <p class="mt-2 text-[9px] leading-5 text-muted">A focused conversation.<br>Feedback you can put to work.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="border-y border-line bg-white py-16 sm:py-20" aria-labelledby="steps-title">
      <div class="container">
        <p class="eyebrow text-center">FROM WHERE YOU ARE TO WHAT'S NEXT</p>
        <h2 id="steps-title" class="section-title mx-auto mt-4 max-w-2xl text-center">Good progress starts<br>with a great connection.</h2>
        <div class="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          <article>
            <div class="step-art text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></div>
            <h3 class="mt-5 text-[15px] font-semibold"><span class="mr-2 text-brand/50">01</span> Find your person</h3>
            <p class="mt-3 text-[12px] leading-6 text-muted">Explore skills, experience, and plans. Choose a mentor who fits your goals and the way you want to learn.</p>
          </article>
          <article>
            <div class="step-art text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2z"/></svg></div>
            <h3 class="mt-5 text-[15px] font-semibold"><span class="mr-2 text-brand/50">02</span> Share your goals</h3>
            <p class="mt-3 text-[12px] leading-6 text-muted">Apply for monthly mentorship with your learning goals. Your mentor has 48 hours to respond.</p>
          </article>
          <article>
            <div class="step-art text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></svg></div>
            <h3 class="mt-5 text-[15px] font-semibold"><span class="mr-2 text-brand/50">03</span> Make it official</h3>
            <p class="mt-3 text-[12px] leading-6 text-muted">Pay only after your mentor accepts. Your mentorship starts after payment is verified.</p>
          </article>
          <article>
            <div class="step-art text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z"/></svg></div>
            <h3 class="mt-5 text-[15px] font-semibold"><span class="mr-2 text-brand/50">04</span> Keep moving forward</h3>
            <p class="mt-3 text-[12px] leading-6 text-muted">Share your work, ask questions, and put feedback into practice. Build confidence with every step.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="mentors" class="py-16 sm:py-24" aria-labelledby="mentors-title">
      <div class="container">
        <div class="text-center">
          <p class="eyebrow">THE RIGHT EXPERIENCE, ON YOUR SIDE</p>
          <h2 id="mentors-title" class="section-title mt-4">Find the mentor for your next step.</h2>
          <p class="section-copy mx-auto mt-4 max-w-xl">A fresh perspective on your code. A roadmap for your learning.<br class="hidden sm:block"> Explore the people who can help you get there.</p>
        </div>
        <div class="mb-5 mt-8 flex items-center justify-between gap-4 text-[10px] text-muted">
          <p id="results-status" aria-live="polite" aria-atomic="true">${mentors.length} mentors to explore</p>
          <span>Sample profiles & prices</span>
        </div>
        <div id="mentor-grid" class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          ${mentorCardsHtml}
        </div>
        <div id="empty-results" class="rounded-xl border border-dashed border-line bg-white px-5 py-12 text-center" hidden>
          <span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></span>
          <h3 class="mt-3 font-semibold">No mentors found just yet</h3>
          <p class="mt-2 text-sm text-muted">Try another skill or clear your filters to explore again.</p>
          <button id="reset-search" class="btn btn-outline mt-5">Clear filters</button>
        </div>
        <p id="saved-note" class="mt-4 text-xs text-muted" hidden>Your saved mentors are linked to your account and available from the Wishlist page.</p>
      </div>
    </section>

    <section id="services" class="trust-band py-16 sm:py-20" aria-labelledby="plans-title">
      <div class="container">
        <div class="mx-auto max-w-2xl text-center">
          <p class="eyebrow">MAKE ROOM FOR YOUR GROWTH</p>
          <h2 id="plans-title" class="section-title mt-4">A little support, for the long run.</h2>
          <p class="section-copy mt-5">Monthly mentorship gives you space to ask, build, reflect, and improve. Start with clear goals and a mentor who is ready to work with you.</p>
        </div>
        <div class="mt-10 grid gap-8 text-center sm:grid-cols-3">
          <article>
            <span class="inline-grid h-12 w-12 place-items-center rounded-full bg-white text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/></svg></span>
            <h3 class="mt-4 text-[15px] font-semibold">Flexible monthly payments</h3>
            <p class="mx-auto mt-3 max-w-[275px] text-[12px] leading-6 text-muted">Pay after acceptance and manage your monthly mentorship without a long-term contract.</p>
          </article>
          <article>
            <span class="inline-grid h-12 w-12 place-items-center rounded-full bg-white text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M7 9h10m-10 4h6"/></svg></span>
            <h3 class="mt-4 text-[15px] font-semibold">Your own learning space</h3>
            <p class="mx-auto mt-3 max-w-[275px] text-[12px] leading-6 text-muted">Share code, discuss challenges, and keep your conversations together in your mentorship workspace.</p>
          </article>
          <article>
            <span class="inline-grid h-12 w-12 place-items-center rounded-full bg-white text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></svg></span>
            <h3 class="mt-4 text-[15px] font-semibold">Clear payment protection</h3>
            <p class="mx-auto mt-3 max-w-[275px] text-[12px] leading-6 text-muted">Pay through VNPay. Funds are held until the service completion requirements have been met.</p>
          </article>
        </div>
        <div class="mt-9 text-center">
          <a href="#mentors" data-reset-discovery class="btn btn-primary">Find my mentor <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></a>
          <p class="mt-4 text-[10px] text-muted">Monthly mentorship: pay only after your mentor accepts.</p>
        </div>
      </div>
    </section>

    <section id="sessions" class="py-16 sm:py-24" aria-labelledby="sessions-title">
      <div class="container">
        <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div class="max-w-[580px]">
            <p class="eyebrow">A SMALLER STEP IS STILL A STEP</p>
            <h2 id="sessions-title" class="section-title mt-4">One question. One session.<br>A fresh perspective.</h2>
          </div>
          <p class="section-copy max-w-[380px]">Need help with something specific? Book a one-off conversation around your code, your project, or your next learning goal.</p>
        </div>
        <div class="mt-10 grid gap-5 md:grid-cols-3">
          <article class="flex flex-col rounded-xl border border-line bg-white p-7">
            <span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/></svg></span>
            <h3 class="mt-5 font-display text-2xl">Code & project review</h3>
            <p class="mt-3 text-[12px] leading-6 text-muted">Walk through your code with an experienced developer. Get a second pair of eyes on structure, bugs, and the decisions behind your solution.</p>
            <button class="mt-auto flex items-center justify-between gap-2 pt-6 text-[12px] font-semibold text-brand" data-quick-search="Backend">Explore backend mentors <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button>
          </article>
          <article class="flex flex-col rounded-xl border border-line bg-white p-7">
            <span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2z"/></svg></span>
            <h3 class="mt-5 font-display text-2xl">A personal study plan</h3>
            <p class="mt-3 text-[12px] leading-6 text-muted">Turn a long list of things to learn into a practical next step. Talk through your background, priorities, and the skills worth focusing on.</p>
            <button class="mt-auto flex items-center justify-between gap-2 pt-6 text-[12px] font-semibold text-brand" data-quick-search="Full-stack">Explore full-stack mentors <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button>
          </article>
          <article class="flex flex-col rounded-xl border border-line bg-white p-7">
            <span class="text-brand"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="12" height="14" rx="3"/><path d="m15 10 6-4v12l-6-4"/></svg></span>
            <h3 class="mt-5 font-display text-2xl">Portfolio feedback</h3>
            <p class="mt-3 text-[12px] leading-6 text-muted">Make your work tell a better story. Get feedback on your web projects, user experience, and the skills your portfolio communicates.</p>
            <button class="mt-auto flex items-center justify-between gap-2 pt-6 text-[12px] font-semibold text-brand" data-quick-search="Frontend">Explore frontend mentors <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button>
          </article>
        </div>
        <p class="mt-6 text-center text-[10px] leading-6 text-muted">Choose an available slot at least 2 hours ahead. Your session is confirmed after verified payment.<br>Session topics depend on the mentor's offering.</p>
      </div>
    </section>

    <section id="become-mentor" class="bg-night py-14 text-cream sm:py-16" aria-labelledby="become-title">
      <div class="container flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
        <div class="max-w-[680px]">
          <p class="text-[10px] font-medium uppercase tracking-[.18em] text-[#c9a6f6]">YOU'VE LEARNED A LOT. PASS IT ON.</p>
          <h2 id="become-title" class="section-title mt-4">Someone's next step<br>could start with your experience.</h2>
          <p class="mt-5 max-w-xl text-[13px] leading-7 text-white/65">Help another developer find their footing. Share what you know, give meaningful feedback, and grow alongside the people you mentor.</p>
        </div>
        <a href="#/apply/mentor" class="btn btn-light shrink-0">Become a mentor <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>
      </div>
    </section>

    <section id="faq" class="py-16 sm:py-24" aria-labelledby="faq-title">
      <div class="container grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
        <div>
          <p class="eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</p>
          <h2 id="faq-title" class="section-title mt-4">Great questions.<br>Let's clear them up.</h2>
          <p class="section-copy mt-5">Know what to expect before you start your mentorship journey.</p>
        </div>
        <div>
          <details class="faq-item" open>
            <summary>Is mentorship right for a beginner?</summary>
            <p>Yes. Search for the skill you want to learn and share your current experience and goals in your application. Your mentor will review whether they are a good fit before accepting monthly mentorship.</p>
          </details>
          <details class="faq-item">
            <summary>When do I pay for monthly mentorship?</summary>
            <p>Apply first. Your mentor has 48 hours to respond. You pay only after they accept, and your mentorship and workspace access begin after payment is verified.</p>
          </details>
          <details class="faq-item" id="refund-faq">
            <summary>How do cancellations and refunds work?</summary>
            <p>For monthly mentorship, cancellation stops renewal while access continues until the end of the paid period. For one-off sessions, cancel at least 24 hours ahead for a full refund; later cancellations retain a 50% reservation fee.</p>
          </details>
          <details class="faq-item">
            <summary>Where do I meet and talk with my mentor?</summary>
            <p>Once your service is activated, use your private workspace to exchange messages, code, and files. Scheduled calls use Google Meet. The join button becomes available 10 minutes before your session.</p>
          </details>
          <details class="faq-item">
            <summary>How are mentors approved?</summary>
            <p>Mentor applicants submit their background, teaching skills, CV, and qualifications for Staff review. Only approved and active mentor profiles appear publicly. The profiles on this homepage are illustrative examples.</p>
          </details>
        </div>
      </div>
    </section>
  </div>
</main>
${Footer()}

<dialog id="mentor-dialog" class="modal" aria-labelledby="mentor-dialog-title">
  <button class="modal-close" data-close aria-label="Close profile"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
  <p class="eyebrow !pr-8">ILLUSTRATIVE MENTOR PROFILE</p>
  <h2 id="mentor-dialog-title" class="mt-4 font-display text-3xl"></h2>
  <p id="mentor-dialog-role" class="mt-2 text-sm text-muted"></p>
  <p id="mentor-dialog-description" class="mt-5 text-sm leading-7 text-muted"></p>
  <div id="mentor-dialog-skills" class="mt-4 flex flex-wrap gap-2"></div>
  <div class="mt-6 grid grid-cols-2 gap-3">
    <div class="rounded-xl bg-lilac p-4"><p class="text-xs text-muted">Monthly mentorship</p><p id="mentor-dialog-monthly" class="mt-2 text-sm font-semibold"></p></div>
    <div class="rounded-xl bg-[#f7f5fa] p-4"><p class="text-xs text-muted">One-off session</p><p id="mentor-dialog-session" class="mt-2 text-sm font-semibold"></p></div>
  </div>
  <p class="mt-5 text-xs leading-6 text-muted">This is a sample profile. Applications and session bookings will be available in a future release.</p>
  <button class="btn btn-primary mt-5" data-close>Keep exploring <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button>
</dialog>

<dialog id="become-dialog" class="modal" aria-labelledby="become-dialog-title">
  <button class="modal-close" data-close aria-label="Close"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
  <p class="eyebrow !pr-8">BECOME A MENTOR</p>
  <h2 id="become-dialog-title" class="mt-4 font-display text-3xl">Put your experience to work.</h2>
  <p class="mt-4 text-sm leading-7 text-muted">Prepare your profile to help the next generation of developers move forward.</p>
  <ol class="mt-5 space-y-4 text-sm leading-6">
    <li><strong class="text-brand">01.</strong> Share your biography, experience, and area of expertise.</li>
    <li><strong class="text-brand">02.</strong> Select at least one active teaching skill.</li>
    <li><strong class="text-brand">03.</strong> Prepare your CV and qualifications as PDF files, up to 10 MB.</li>
    <li><strong class="text-brand">04.</strong> Submit your application for Staff review before your profile goes public.</li>
  </ol>
  <p class="mt-6 rounded-xl bg-lilac p-4 text-xs leading-6 text-muted">Applications will open in a future release. This homepage introduces the process and mentorship options.</p>
  <button class="btn btn-primary mt-5" data-close>Got it <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>
</dialog>

<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
  `;
}
