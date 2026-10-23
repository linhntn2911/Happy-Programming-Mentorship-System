import test from 'node:test';
import assert from 'node:assert/strict';
import { getPageNumbers, renderPagination } from './pagination.js';

test('getPageNumbers returns all pages for 7 or fewer pages', () => {
  assert.deepEqual(getPageNumbers(0, 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(getPageNumbers(3, 7), [0, 1, 2, 3, 4, 5, 6]);
});

test('getPageNumbers inserts ellipsis correctly for more than 7 pages', () => {
  // Near start: 0, 1, ..., 9
  assert.deepEqual(getPageNumbers(0, 10), [0, 1, 'ellipsis', 9]);
  // In middle: 0, ..., 4, 5, 6, ..., 9
  assert.deepEqual(getPageNumbers(5, 10), [0, 'ellipsis', 4, 5, 6, 'ellipsis', 9]);
  // Near end: 0, ..., 8, 9
  assert.deepEqual(getPageNumbers(9, 10), [0, 'ellipsis', 8, 9]);
});

test('renderPagination returns empty string for 1 or fewer pages', () => {
  assert.equal(renderPagination(0, 1), '');
  assert.equal(renderPagination(0, 0), '');
});

test('renderPagination renders previous/next buttons, numbered buttons, and jump select', () => {
  const html = renderPagination(2, 5, { idPrefix: 'test-jump', ariaLabel: 'Test pages' });
  assert.match(html, /aria-label="Test pages"/);
  assert.match(html, /data-page="previous"/);
  assert.match(html, /data-page="next"/);
  assert.match(html, /data-page-jump="2"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /id="test-jump-select"/);
  assert.match(html, /<option value="2" selected>Page 3<\/option>/);
  assert.match(html, /of 5 pages/);
});

test('renderPagination supports 1-indexed pagination options', () => {
  const html = renderPagination(3, 5, { zeroIndexed: false });
  assert.match(html, /data-page-jump="3"/);
  assert.match(html, /<option value="3" selected>Page 3<\/option>/);
});
