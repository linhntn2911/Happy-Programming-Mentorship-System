import test from 'node:test';
import assert from 'node:assert/strict';
import { mountSupportContact, supportContactMarkup } from './SupportContact.js';
import { Footer } from './Footer.js';

function host() {
  return { innerHTML: '', hidden: false, listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type) { delete this.listeners[type]; },
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('footer includes one live contact and opens the saved address in Gmail Compose', async () => {
  const footer = Footer();
  assert.equal((footer.match(/<hp-support-contact>/g) || []).length, 1);
  assert.doesNotMatch(footer, /data-support-email/);
  const el = host();
  mountSupportContact(el, async () => ({ supportEmail: ' help@example.com ' }));
  assert.match(el.innerHTML, /Loading/);
  await tick();
  assert.match(el.innerHTML, /https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=help%40example\.com/);
  assert.match(el.innerHTML, /target="_blank"/);
  assert.match(el.innerHTML, /rel="noopener noreferrer"/);
  assert.match(el.innerHTML, /Contact support: help@example.com/);
  assert.equal(el.hidden, false);
});

test('empty address hides contact; external data cannot inject markup or URI parameters', async () => {
  const el = host();
  mountSupportContact(el, async () => ({ supportEmail: '' }));
  await tick();
  assert.equal(el.hidden, true);
  assert.equal(el.innerHTML, '');
  const markup = supportContactMarkup('<img src=x>@example.com?subject=bad');
  assert.doesNotMatch(markup, /<img/);
  assert.match(markup, /%3Fsubject%3D/);
});

test('failure exposes retry and retry loads current configuration', async () => {
  let calls = 0;
  const el = host();
  mountSupportContact(el, async () => { if (++calls === 1) throw new Error('offline'); return { supportEmail: 'new@example.com' }; });
  await tick();
  assert.match(el.innerHTML, /Try again/);
  el.listeners.click({ target: { closest: () => true } });
  await tick();
  assert.match(el.innerHTML, /new@example.com/);
  assert.equal(calls, 2);
});

test('disposed footer ignores a late response', async () => {
  let resolve;
  const el = host();
  const dispose = mountSupportContact(el, () => new Promise(r => { resolve = r; }));
  dispose();
  el.innerHTML = 'new page';
  resolve({ supportEmail: 'old@example.com' });
  await tick();
  assert.equal(el.innerHTML, 'new page');
  assert.equal(el.listeners.click, undefined);
});
