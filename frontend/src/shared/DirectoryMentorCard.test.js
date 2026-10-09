import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DirectoryMentorCard } from './DirectoryMentorCard.js';
import { MentorAvatar } from './MentorAvatar.js';

test('unreviewed mentor has initials and no fabricated five-star rating or stock portrait', () => {
  const html = DirectoryMentorCard({ id: 'linh', name: 'Linh Nguyễn', rating: 5, reviewCount: 0, skills: [] });
  assert.match(html, />LN</);
  assert.match(html, /No reviews yet/);
  assert.doesNotMatch(html, /★|<img/);
});
test('published ratings and uploaded avatar are displayed; sample portrait stays available', () => {
  const html = DirectoryMentorCard({ id: 'linh', name: 'Linh Nguyễn', rating: 4.5, reviewCount: 2, portrait: '/api/mentors/linh/avatar', skills: [] });
  assert.match(html, /★ 4.5/);
  assert.match(html, /2 reviews/);
  assert.match(html, /src="\/api\/mentors\/linh\/avatar"/);
  assert.match(MentorAvatar({ name: 'Linh Nguyễn', portrait: 'mentor-1.jpg' }), /src="\/images\/mentor-1.jpg"/);
  assert.match(MentorAvatar({ id: 'thao-linh', name: 'Thao Linh Tran' }), /src="\/images\/mentor-2.jpg"/);
});
