export function Footer() {
  return `
<footer class="border-t border-line bg-white pt-12">
  <div class="container">
    <div class="grid gap-9 pb-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
      <div>
        <a href="/" class="flex items-center gap-2 text-[16px] font-semibold">
          <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-lg text-white">{h}</span>
          HappyProgramming
        </a>
        <p class="mt-4 max-w-[280px] text-[12px] leading-6 text-muted">A more personal way to learn programming.<br>The right guidance for your next chapter.</p>
      </div>
      <div>
        <h2 class="text-xs font-semibold">Find your direction</h2>
        <div class="mt-5 flex flex-col gap-3 text-[11px] text-muted">
          <a href="#/mentors" class="hover:text-brand">Browse mentors</a>
          <a href="#services" class="hover:text-brand">Monthly mentorship</a>
          <a href="#sessions" class="hover:text-brand">One-off sessions</a>
        </div>
      </div>
      <div>
        <h2 class="text-xs font-semibold">Share your experience</h2>
        <div class="mt-5 flex flex-col gap-3 text-[11px] text-muted">
          <a href="#become-mentor" class="hover:text-brand">Become a mentor</a>
          <a href="#how-it-works" class="hover:text-brand">How it works</a>
        </div>
      </div>
      <div>
        <h2 class="text-xs font-semibold">Good to know</h2>
        <div class="mt-5 flex flex-col gap-3 text-[11px] text-muted">
          <a href="#faq" class="hover:text-brand">Frequently asked questions</a>
          <a href="#/components" class="hover:text-brand font-medium text-brand">UI Component Showcase</a>
        </div>
      </div>
    </div>
    <div class="flex flex-col justify-between gap-3 border-t border-line py-6 text-[10px] text-muted sm:flex-row">
      <p>© 2026 HappyProgramming. HPMS Monorepo.</p>
      <p>Grow together. Code better. <span class="ml-2 text-brand">&lt;/&gt;</span></p>
    </div>
  </div>
</footer>
  `;
}
