export function Header() {
  return `
<header class="relative z-10 hero-shell">
  <div class="container flex h-[86px] items-center justify-between gap-6">
    <a href="/" class="flex shrink-0 items-center gap-2.5" aria-label="HappyProgramming home">
      <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span>
      <span class="text-[16px] font-semibold tracking-tight">Happy<span class="text-brand">Programming</span></span>
    </a>
    <nav class="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
      <a class="nav-link" href="#how-it-works">How it works</a>
      <button class="nav-link" id="login-nav-btn">Log in</button>
      <a class="nav-link" href="#/mentor/dashboard">Mentor dashboard</a>
      <a class="nav-link" href="#/mentor/profile">Mentor profile</a>
      <a href="#mentors" class="btn btn-light !min-h-10 !px-5 !py-2.5">Browse all mentors <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></a>
    </nav>
    <a href="#/mentor/dashboard" class="btn btn-outline btn-sm lg:hidden">Mentor dashboard</a>
    <button id="menu-toggle" class="grid h-10 w-10 place-items-center rounded-lg border border-brand/20 bg-white text-brand lg:hidden" aria-label="Open menu"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
  </div>

  <!-- Centered Category Bar matching HappyProgramming tone -->
  <nav class="container" aria-label="Mentor categories">
    <div class="mc-category-bar relative border-t border-brand/10 py-2.5" style="display:flex; justify-content:center; align-items:center; width:100%;">
      <!-- Left Double Chevron Button -->
      <button id="cat-scroll-left" class="cat-nav-btn cat-nav-left mr-2.5 hidden" aria-label="Scroll categories left">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m11 17-5-5 5-5m7 10-5-5 5-5"/>
        </svg>
      </button>

      <!-- Scrollable Categories Track (Centered) -->
      <div id="cat-scroll-track" class="cat-scroll-track" style="display:flex; justify-content:center; align-items:center; gap:28px; width:100%; margin:0 auto;">
        <button class="cat-item" data-quick-search="Engineer">Engineering Mentors</button>
        <button class="cat-item" data-quick-search="Design">Design Mentors</button>
        <button class="cat-item" data-quick-search="System Design">Startup Mentor</button>
        <button class="cat-item" data-quick-search="AI">AI Mentors</button>
        <button class="cat-item" data-quick-search="Full-stack">Product Managers</button>
        <button class="cat-item" data-quick-search="Frontend">Marketing Coaches</button>
        <button class="cat-item" data-quick-search="Senior">Leadership Mentors</button>
        <button class="cat-item" data-quick-search="Software">Career Coaches</button>
        <button class="cat-item" data-quick-search="" data-reset-discovery>Top Mentors</button>
      </div>

      <!-- Right Double Chevron Button -->
      <button id="cat-scroll-right" class="cat-nav-btn cat-nav-right ml-2.5" aria-label="Scroll categories right">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m13 7 5 5-5 5M6 7l5 5-5 5"/>
        </svg>
      </button>
    </div>
  </nav>
</header>
  `;
}
