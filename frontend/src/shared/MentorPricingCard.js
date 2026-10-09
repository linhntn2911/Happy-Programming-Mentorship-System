/**
 * MentorPricingCard Component
 * Displays interactive monthly mentorship tiers (Lite, Standard, Pro)
 * along with one-off session CTA and feature benefits.
 *
 * Adheres to HappyProgramming Design System:
 * - Brand Purple: #8b46e8, Lilac: #f1e8ff, Cream: #fbf9ff, Ink: #25143f, Line: #e8e0f1
 * - User-facing copy in English
 */

export const DEFAULT_MENTOR_TIERS = [
  {
    id: "lite",
    name: "Lite",
    price: "2,500,000",
    currency: "₫",
    usdPrice: "$120",
    period: "month",
    tagline: "Flexible monthly mentorship",
    callsPerMonth: 1,
    callDuration: 60,
    responseTimeHours: 24,
    features: [
      {
        title: "Pay after acceptance",
        description: "Your mentor reviews your application before any payment is requested."
      },
      {
        title: "Ongoing calls + chat",
        description: "1 × 60-min call per month, unlimited async Q&A. Replies in 24 hours or less."
      },
      {
        title: "No lock-in",
        description: "Month to month mentorship, no long-term contract."
      }
    ]
  },
  {
    id: "standard",
    name: "Standard",
    isPopular: true,
    price: "4,500,000",
    currency: "₫",
    usdPrice: "$220",
    period: "month",
    tagline: "Most popular for steady career growth",
    callsPerMonth: 2,
    callDuration: 60,
    responseTimeHours: 12,
    features: [
      {
        title: "Pay after acceptance",
        description: "Payment is requested only after your mentor accepts your application."
      },
      {
        title: "Bi-weekly calls + priority chat",
        description: "2 × 60-min calls per month, priority code review. Replies in 12 hours or less."
      },
      {
        title: "Personalized roadmap",
        description: "Tailored milestones, curated homework, and interview readiness."
      }
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: "8,000,000",
    currency: "₫",
    usdPrice: "$390",
    period: "month",
    tagline: "Intensive 1-on-1 career acceleration",
    callsPerMonth: 4,
    callDuration: 60,
    responseTimeHours: 6,
    features: [
      {
        title: "Pay after acceptance",
        description: "Start your high-touch mentorship after your mentor accepts and payment is verified."
      },
      {
        title: "Weekly calls + VIP chat",
        description: "4 × 60-min calls per month, direct architectural reviews. Replies in 6 hours."
      },
      {
        title: "Fast-track outcomes",
        description: "Mock interviews, resume overhaul, and production pull request audits."
      }
    ]
  }
];

export function MentorPricingCard({
  mentorName = "the mentor",
  mentorSlug = "",
  tiers = DEFAULT_MENTOR_TIERS,
  activeTierId = "lite",
  currencyMode = "VND", // "VND" or "USD"
  oneOffPrice = "600,000",
  oneOffUsdPrice = "$30",
  onApplyClick = "window.location.hash = '#/apply'",
  onOneOffClick = "window.location.hash = '#/book'"
} = {}) {
  const currentTier = tiers.find(t => t.id === activeTierId) || tiers[0];
  const displayPrice = currencyMode === "USD" ? currentTier.usdPrice : `${currentTier.price} ${currentTier.currency}`;
  const displayOneOffPrice = currencyMode === "USD" ? oneOffUsdPrice : `${oneOffPrice} ₫`;

  return `
<aside class="mentor-pricing-card w-full max-w-[420px] rounded-3xl border border-line bg-cream shadow-sm overflow-hidden text-ink transition-all hover:shadow-md" data-component="mentor-pricing-card">
  <!-- Top Tier Switcher Tabs -->
  <div class="p-6 pb-4">
    <div class="inline-flex w-full items-center justify-between rounded-full bg-white p-1.5 border border-line shadow-2xs" role="tablist" aria-label="Mentorship tiers">
      ${tiers.map(tier => {
        const isActive = tier.id === currentTier.id;
        return `
        <button
          type="button"
          role="tab"
          aria-selected="${isActive}"
          aria-controls="tier-panel-${tier.id}"
          data-tier-id="${tier.id}"
          class="pricing-tier-tab flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-150 focus-visible:outline-brand ${
            isActive
              ? "bg-lilac text-brand border border-brand/40 shadow-xs"
              : "text-muted hover:text-ink hover:bg-cream"
          }">
          ${tier.name}
        </button>
        `;
      }).join("")}
    </div>

    <!-- Price Section -->
    <div class="mt-6">
      <div class="flex items-baseline gap-2">
        <span class="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink" data-pricing-amount>
          ${displayPrice}
        </span>
        <span class="text-base font-normal text-muted" data-pricing-period>
          / ${currentTier.period}
        </span>
      </div>
      <p class="mt-2 text-sm font-medium text-brand flex items-center gap-1.5" data-pricing-tagline>
        <svg class="h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
        <span>${currentTier.tagline}</span>
      </p>
    </div>

    <!-- Numbered Benefits List -->
    <div class="mt-6 space-y-4" id="tier-panel-${currentTier.id}" role="tabpanel">
      ${currentTier.features.map((feature, idx) => `
      <div class="flex items-start gap-3.5">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-2xs">
          ${idx + 1}
        </span>
        <div class="text-left">
          <h4 class="text-sm font-bold text-ink leading-tight">${feature.title}</h4>
          <p class="mt-0.5 text-xs sm:text-sm text-muted leading-relaxed">${feature.description}</p>
        </div>
      </div>
      `).join("")}
    </div>
  </div>

  <!-- Bottom CTA Container with Tinted Surface -->
  <div class="mt-2 border-t border-line/80 bg-lilac/40 p-6 text-center">
    <button
      type="button"
      onclick="${onApplyClick}"
      data-apply-tier="${currentTier.id}"
      class="btn btn-primary w-full py-3.5 text-base font-bold rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2">
      <span>Apply now</span>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>

    <p class="mt-3 text-xs text-muted">
      Pay after your mentor accepts. Cancel anytime between billing cycles.
      <a href="#/what-is-included" class="font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand">What's included?</a>
    </p>

    <!-- One-Off Call Alternate Option -->
    <div class="mt-5 border-t border-line/60 pt-4">
      <a
        href="#/book-session"
        onclick="${onOneOffClick}"
        class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-brand hover:text-brand-dark transition-colors group">
        <span>Just need one session? Book a one-off call (${displayOneOffPrice})</span>
        <span class="transition-transform group-hover:translate-x-0.5">→</span>
      </a>
    </div>
  </div>
</aside>
  `;
}

/**
 * Client-side script helper to bind tier tab switching on any pricing card in the DOM.
 */
export function bindMentorPricingCardEvents(container = document) {
  const cards = container.querySelectorAll('[data-component="mentor-pricing-card"]');
  cards.forEach(card => {
    const tabs = card.querySelectorAll('.pricing-tier-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tierId = tab.getAttribute('data-tier-id');
        const selectedTier = DEFAULT_MENTOR_TIERS.find(t => t.id === tierId);
        if (!selectedTier) return;

        // Update active tab styles
        tabs.forEach(t => {
          const isActive = t === tab;
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
          if (isActive) {
            t.className = 'pricing-tier-tab flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-150 focus-visible:outline-brand bg-lilac text-brand border border-brand/40 shadow-xs';
          } else {
            t.className = 'pricing-tier-tab flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-150 focus-visible:outline-brand text-muted hover:text-ink hover:bg-cream';
          }
        });

        // Update price display
        const priceEl = card.querySelector('[data-pricing-amount]');
        if (priceEl) {
          priceEl.textContent = `${selectedTier.price} ${selectedTier.currency}`;
        }

        // Update tagline
        const taglineEl = card.querySelector('[data-pricing-tagline] span');
        if (taglineEl) {
          taglineEl.textContent = selectedTier.tagline;
        }

        // Update feature list
        const panelEl = card.querySelector('[role="tabpanel"]');
        if (panelEl) {
          panelEl.id = `tier-panel-${selectedTier.id}`;
          panelEl.innerHTML = selectedTier.features.map((feature, idx) => `
            <div class="flex items-start gap-3.5 animate-fadeIn">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-2xs">
                ${idx + 1}
              </span>
              <div class="text-left">
                <h4 class="text-sm font-bold text-ink leading-tight">${feature.title}</h4>
                <p class="mt-0.5 text-xs sm:text-sm text-muted leading-relaxed">${feature.description}</p>
              </div>
            </div>
          `).join('');
        }

        // Update apply button data attribute
        const applyBtn = card.querySelector('[data-apply-tier]');
        if (applyBtn) {
          applyBtn.setAttribute('data-apply-tier', selectedTier.id);
        }
      });
    });
  });
}
