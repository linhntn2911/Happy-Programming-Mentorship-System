export const developmentMentorDashboard = {
  summary: {
    netEarnings: 1_250_000,
    pendingInvitations: 1,
    averageRating: 4.8,
    reviewCount: 12,
    currency: 'VND',
  },
  incomingRequests: [
    {
      id: 9001,
      menteeName: 'Taylor Nguyen',
      packageName: 'Backend Foundations',
      learningGoals: 'Build confidence with Java, REST API design, and practical testing.',
      submittedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      responseDeadline: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
    },
  ],
  systemNotices: [],
};

function isDevelopmentFallbackEligible(error) {
  const status = error?.status;
  return status == null || status === 401 || status === 403 || status >= 500;
}

function copyData(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function loadWithDevelopmentFallback(
  request,
  fallbackData,
  { development = import.meta.env?.DEV === true } = {}
) {
  try {
    return { data: await request(), isMock: false };
  } catch (error) {
    if (!development || !isDevelopmentFallbackEligible(error)) {
      throw error;
    }
    return { data: copyData(fallbackData), isMock: true };
  }
}
