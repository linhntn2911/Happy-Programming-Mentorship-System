export function canPayApplication(application) {
  return application?.status === 'ACCEPTED' && !application?.fundedAt;
}

export function applicationDisplayStatus(application) {
  if (!application) return 'UNKNOWN';
  const status = (application.status || '').toUpperCase();
  if (['COMPLETED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'DISPUTED'].includes(status)) {
    return status;
  }
  if (application.fundedAt) return 'CONFIRMED';
  return status || 'UNKNOWN';
}
