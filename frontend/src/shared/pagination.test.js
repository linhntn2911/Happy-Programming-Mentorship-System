import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPagination } from './pagination.js';

test('renderPagination returns nothing for a single page', () => {
  assert.equal(renderPagination({ page: 1, totalPages: 1 }), '');
  assert.equal(renderPagination({ page: 1, totalPages: 0 }), '');
});

test('renderPagination renders previous, numbers, next and a go-to select', () => {
  const html = renderPagination({ page: 2, totalPages: 3, label: 'Feedback pages' });
  assert.match(html, /aria-label="Feedback pages"/);
  assert.match(html, /data-page="prev"/);
  assert.match(html, /data-page="next"/);
  assert.match(html, /data-goto="1"/);
  assert.match(html, /data-goto="3"/);
  assert.match(html, /data-goto="2"[^>]*aria-current="page"/);
  assert.match(html, /data-page-select/);
  assert.match(html, /<option value="2" selected>Page 2 of 3<\/option>/);
  assert.doesNotMatch(html, /data-page="prev"[^>]*disabled/);
});

test('renderPagination disables previous on the first page and next on the last', () => {
  assert.match(renderPagination({ page: 1, totalPages: 4 }), /data-page="prev" disabled/);
  assert.match(renderPagination({ page: 4, totalPages: 4 }), /data-page="next" disabled/);
});

test('renderPagination clamps an out-of-range current page', () => {
  const html = renderPagination({ page: 99, totalPages: 3 });
  assert.match(html, /<option value="3" selected>Page 3 of 3<\/option>/);
  assert.match(html, /data-page="next" disabled/);
});

test('renderPagination windowed numbers use ellipsis for many pages', () => {
  const html = renderPagination({ page: 10, totalPages: 20 });
  assert.match(html, /data-goto="1"/);
  assert.match(html, /data-goto="20"/);
  assert.match(html, /…/);
});
