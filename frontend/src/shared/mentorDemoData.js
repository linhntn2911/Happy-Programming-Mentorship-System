export const developmentMentorProfile = {
  userId: 42,
  fullName: 'Alex Morgan',
  biography: 'I help developers build reliable backend services and grow their engineering practice through practical, supportive mentorship.',
  yearsExperience: 7,
  githubUrl: 'https://github.com/alex-morgan',
  linkedinUrl: 'https://www.linkedin.com/in/alex-morgan',
  portfolioUrl: 'https://alex-morgan.dev',
  skills: [
    {
      skill: {
        id: 1,
        categoryId: 1,
        name: 'Java',
        slug: 'java',
        description: 'Java application development',
      },
      yearsExperience: 7,
      verified: true,
      displayOrder: 0,
    },
    {
      skill: {
        id: 2,
        categoryId: 1,
        name: 'Spring Boot',
        slug: 'spring-boot',
        description: 'Spring Boot services and APIs',
      },
      yearsExperience: 5,
      verified: false,
      displayOrder: 1,
    },
  ],
};

export const developmentActiveSkills = developmentMentorProfile.skills.map(
  ({ skill }) => skill
);

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
