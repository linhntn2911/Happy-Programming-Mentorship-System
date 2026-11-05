import test from 'node:test';
import assert from 'node:assert/strict';
import { bindMentorPricingCardEvents, MentorPricingCard, planToTier } from './MentorPricingCard.js';

const lite = planToTier({ id: 101, name: 'Lite Mentorship', planTier: 'LITE', price: 1200000, currency: 'VND', sessionDurationMinutes: 11, callsPerPeriod: 1, responseTimeHours: 24, chatIncluded: true });
const standard = planToTier({ id: 102, name: 'Standard Mentorship', planTier: 'STANDARD', price: 2000000, currency: 'VND', sessionDurationMinutes: 45, callsPerPeriod: 2, responseTimeHours: 12, chatIncluded: true });

test('pricing tier keeps its service offering ID for the application request', () => {
  assert.equal(lite.serviceOfferingId, 101);
  assert.match(MentorPricingCard({ tiers: [lite, standard] }), /data-apply-offering-id="101"/);
});

test('switching pricing tiers updates the application offering ID', () => {
  const tabs = [lite, standard].map(tier => ({
    attributes: { 'data-tier': JSON.stringify(tier) },
    setAttribute(name, value) { this.attributes[name] = value; this[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    addEventListener(name, handler) { if (name === 'click') this.onClick = handler; },
  }));
  const applyButton = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const card = {
    querySelectorAll: selector => selector === '.pricing-tier-tab' ? tabs : [],
    querySelector: selector => selector === '[data-pricing-amount]' ? { textContent: '' }
      : selector === '[data-pricing-tagline] span' ? { textContent: '' }
        : selector === '[data-pricing-features]' ? { innerHTML: '', id: '' }
          : selector === '[data-apply-tier]' ? applyButton : null,
  };

  bindMentorPricingCardEvents({ querySelectorAll: () => [card] });
  tabs[1].onClick();

  assert.equal(applyButton.attributes['data-apply-offering-id'], 102);
});

test('one-off sessions remain reachable when no monthly package is published', () => {
  const html = MentorPricingCard({ tiers: [], oneOffPrice: '500,000', showOneOff: true, onOneOffClick: "window.location.hash='#/sessions'" });
  assert.match(html, /Book a one-off session from 500,000/);
  assert.match(html, /#\/sessions/);
});

test('one-off entry remains visible without fabricating a price', () => {
  const html = MentorPricingCard({ tiers: [lite], showOneOff: true, onOneOffClick: "window.location.hash='#/sessions'" });
  assert.match(html, /Book a one-off call/);
  assert.doesNotMatch(html, /Book a one-off call \(/);
});
