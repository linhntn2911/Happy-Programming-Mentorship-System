import test from 'node:test';
import assert from 'node:assert/strict';
import { Footer } from './Footer.js';

test('public footer links to customer guidance instead of the internal component showcase', () => {
  const html = Footer();
  assert.match(html, /href="#faq"[^>]*>Frequently asked questions<\/a>/);
  assert.doesNotMatch(html, /#\/components|UI Component Showcase/);
});
