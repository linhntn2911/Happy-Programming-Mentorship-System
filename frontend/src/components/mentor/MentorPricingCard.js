/**
 * MentorPricingCard Component
 * Renders a mentor's published mentorship packages (Lite / Standard / Pro).
 * Tiers are supplied by the caller from real service-offering data — this
 * component contains no hardcoded package defaults.
 *
 * Design tokens: brand #8b46e8, lilac #f1e8ff, cream #fbf9ff, ink #25143f, line #e8e0f1.
 */

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatPrice = price => {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return String(price ?? '');
  return numeric.toLocaleString('en-US');
};

/**
 * Maps a backend MentorPlanResponse into the tier shape this card renders.
 * Feature bullets are derived from the plan's real fields, never mocked.
 */
export function planToTier(plan) {
  const calls = Number(plan.callsPerPeriod ?? 0);
  const minutes = Number(plan.sessionDurationMinutes ?? 0);
  const features = [];

  const callLabel = calls === 1 ? 'call' : 'calls';
  features.push({
    title: `${calls} × ${minutes}-min ${callLabel} per month`,
    description: plan.chatIncluded
      ? 'Scheduled calls plus unlimited async chat support.'
      : 'Scheduled monthly calls with your mentor.',
  });

  if (plan.responseTimeHours) {
    features.push({
      title: `Replies within ${plan.responseTimeHours} hours`,
      description: 'Typical response time for messages and code questions.',
    });
  }

  if (plan.trialDays) {
    features.push({
      title: `${plan.trialDays}-day free trial`,
      description: 'No charge during the trial. Cancel anytime with zero fees.',
    });
  }

  const displayName = plan.name || plan.planTier || 'Mentorship';
  const shortName = displayName.replace(/\s+Mentorship$/i, '');

  return {
    id: plan.planTier || String(plan.id),
    name: shortName,
    price: formatPrice(plan.price),
    currency: '₫',
    period: 'month',
    tagline: plan.description || 'Monthly mentorship, no long-term contract.',
    trialDays: plan.trialDays || 0,
    features,
  };
}

export function MentorPricingCard({
  tiers = [],
  activeTierId = '',
  oneOffPrice = '',
  onApplyClick = "window.location.hash = '#/apply'",
  onOneOffClick = "window.location.hash = '#/book'",
} = {}) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return `
<aside class="mentor-pricing-card w-full max-w-[420px] rounded-3xl border border-line bg-cream p-6 text-center text-ink shadow-sm" data-component="mentor-pricing-card">
  <h3 class="font-display text-xl text-ink">No packages published yet</h3>
  <p class="mt-2 text-sm text-muted">This mentor has not published mentorship packages. Check back soon or browse other mentors.</p>
</aside>`;
  }

  const currentTier = tiers.find(t => t.id === activeTierId) || tiers[0];
  const displayPrice = `${currentTier.price} ${currentTier.currency}`;
  const tierData = tier => escapeHtml(JSON.stringify(tier));

  return `
<aside class="mentor-pricing-card w-full max-w-[420px] rounded-3xl border border-line bg-cream shadow-sm overflow-hidden text-ink transition-all hover:shadow-md" data-component="mentor-pricing-card">
  <div class="p-6 pb-4">
    <div class="inline-flex w-full items-center justify-between rounded-full bg-white p-1.5 border border-line shadow-2xs" role="tablist" aria-label="Mentorship tiers">
      ${tiers.map(tier => {
        const isActive = tier.id === currentTier.id;
        return `
        <button
          type="button"
          role="tab"
          aria-selected="${isActive}"
          aria-controls="tier-panel-${escapeHtml(tier.id)}"
          data-tier-id="${escapeHtml(tier.id)}"
          data-tier='${tierData(tier)}'
          class="pricing-tier-tab flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-150 focus-visible:outline-brand ${
            isActive
              ? "bg-lilac text-brand border border-brand/40 shadow-xs"
              : "text-muted hover:text-ink hover:bg-cream"
          }">
          ${escapeHtml(tier.name)}
        </button>
        `;
      }).join("")}
    </div>

    <div class="mt-6">
      <div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
        <span class="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight" data-pricing-amount>
          ${displayPrice}
        </span>
        <span class="text-sm sm:text-base font-normal text-muted" data-pricing-period>
          / ${escapeHtml(currentTier.period)}
        </span>
      </div>
      <p class="mt-2 text-sm font-medium text-brand flex items-start gap-1.5" data-pricing-tagline>
        <svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
        <span>${escapeHtml(currentTier.tagline)}</span>
      </p>
    </div>

    <div class="mt-6 space-y-4" id="tier-panel-${escapeHtml(currentTier.id)}" role="tabpanel" data-pricing-features>
      ${currentTier.features.map((feature, idx) => `
      <div class="flex items-start gap-3.5">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-2xs">
          ${idx + 1}
        </span>
        <div class="text-left">
          <h4 class="text-sm font-bold text-ink leading-tight">${escapeHtml(feature.title)}</h4>
          <p class="mt-0.5 text-xs sm:text-sm text-muted leading-relaxed">${escapeHtml(feature.description)}</p>
        </div>
      </div>
      `).join("")}
    </div>
  </div>

  <div class="mt-2 border-t border-line/80 bg-lilac/40 p-6 text-center">
    <button
      type="button"
      onclick="${onApplyClick}"
      data-apply-tier="${escapeHtml(currentTier.id)}"
      class="btn btn-primary w-full py-3.5 text-base font-bold rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2">
      <span>Apply now</span>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>

    ${currentTier.trialDays ? `<p class="mt-3 text-xs text-muted">${currentTier.trialDays}-day free trial, cancel anytime.</p>` : ''}

    ${oneOffPrice ? `
    <div class="mt-5 border-t border-line/60 pt-4">
      <a
        href="#/book-session"
        onclick="${onOneOffClick}"
        class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-brand hover:text-brand-dark transition-colors group">
        <span>Just need one session? Book a one-off call (${escapeHtml(oneOffPrice)} ₫)</span>
        <span class="transition-transform group-hover:translate-x-0.5">→</span>
      </a>
    </div>` : ''}
  </div>
</aside>
  `;
}

const TAB_ACTIVE_CLASS = 'pricing-tier-tab flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-150 focus-visible:outline-brand bg-lilac text-brand border border-brand/40 shadow-xs';
const TAB_INACTIVE_CLASS = 'pricing-tier-tab flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-150 focus-visible:outline-brand text-muted hover:text-ink hover:bg-cream';

/**
 * Binds tier tab switching using the tier payload embedded on each tab button.
 */
export function bindMentorPricingCardEvents(container = document) {
  const cards = container.querySelectorAll('[data-component="mentor-pricing-card"]');
  cards.forEach(card => {
    const tabs = card.querySelectorAll('.pricing-tier-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        let selectedTier;
        try {
          selectedTier = JSON.parse(tab.getAttribute('data-tier') || 'null');
        } catch {
          selectedTier = null;
        }
        if (!selectedTier) return;

        tabs.forEach(t => {
          const isActive = t === tab;
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
          t.className = isActive ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS;
        });

        const priceEl = card.querySelector('[data-pricing-amount]');
        if (priceEl) priceEl.textContent = `${selectedTier.price} ${selectedTier.currency}`;

        const taglineEl = card.querySelector('[data-pricing-tagline] span');
        if (taglineEl) taglineEl.textContent = selectedTier.tagline;

        const panelEl = card.querySelector('[data-pricing-features]');
        if (panelEl) {
          panelEl.id = `tier-panel-${selectedTier.id}`;
          panelEl.innerHTML = (selectedTier.features || []).map((feature, idx) => `
            <div class="flex items-start gap-3.5 animate-fadeIn">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-2xs">
                ${idx + 1}
              </span>
              <div class="text-left">
                <h4 class="text-sm font-bold text-ink leading-tight">${escapeHtml(feature.title)}</h4>
                <p class="mt-0.5 text-xs sm:text-sm text-muted leading-relaxed">${escapeHtml(feature.description)}</p>
              </div>
            </div>
          `).join('');
        }

        const applyBtn = card.querySelector('[data-apply-tier]');
        if (applyBtn) applyBtn.setAttribute('data-apply-tier', selectedTier.id);
      });
    });
  });
}
