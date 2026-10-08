export function safeNotificationHref(value) {
  return typeof value === 'string' && /^#\/[a-z0-9/?=&%._-]*$/i.test(value) ? value : '';
}
