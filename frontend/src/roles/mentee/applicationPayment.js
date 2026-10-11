export function canPayApplication(application) {
  return application?.status === 'ACCEPTED' && !application?.fundedAt;
}

export function applicationDisplayStatus(application) {
  if (application?.fundedAt) return 'PAID';
  return application?.status || 'UNKNOWN';
}
