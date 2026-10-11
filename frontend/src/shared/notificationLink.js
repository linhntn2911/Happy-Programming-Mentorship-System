export function safeNotificationHref(value) {
  return typeof value === 'string' && /^#\/[a-z0-9/?=&%._-]*$/i.test(value) ? value : '';
}

const MENTEE_REQUEST_NOTIFICATION_TYPES = new Set([
  'MENTORSHIP_REQUEST_SUBMITTED',
  'MENTORSHIP_REQUEST_ACCEPTED',
  'MENTORSHIP_REQUEST_REJECTED',
]);

export function notificationRelatedHref(notification) {
  if (MENTEE_REQUEST_NOTIFICATION_TYPES.has(notification?.type)) return '#/applications';
  return safeNotificationHref(notification?.actionUrl);
}
