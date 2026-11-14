export const APPLICATION_TEXT_LIMIT = 500;
export const OFFICIAL_APPLICATION_URL = 'https://openai.com/form/codex-for-oss/';
export const DEEP_SIGNAL_REPOSITORY_URL = 'https://github.com/youssef890-afk/deep-signal-3o';

export type Application = {
  firstName: string;
  lastName: string;
  email: string;
  githubUsername: string;
  repositoryUrl: string;
  role: string;
  qualifies: string;
  securityInterest: string;
  organizationId: string;
  creditUse: string;
  additional: string;
  licenseStatus: string;
};

export const initialApplication: Application = {
  firstName: 'YOUSSEF',
  lastName: 'EL AMYN',
  email: '',
  githubUsername: 'youssef890-afk',
  repositoryUrl: DEEP_SIGNAL_REPOSITORY_URL,
  role: 'Maintainer',
  qualifies: '',
  securityInterest: '',
  organizationId: '',
  creditUse: '',
  additional: '',
  licenseStatus: '',
};

export const applicationTextFields: { key: keyof Application; label: string; required?: boolean; hint?: string }[] = [
  { key: 'qualifies', label: 'Why does this repository qualify?', required: true, hint: 'Describe your role and the project accurately. Confirm the repository has a suitable public license before claiming eligibility.' },
  { key: 'creditUse', label: 'How would you use API credits?', required: true, hint: 'Explain the specific development work credits would support.' },
  { key: 'additional', label: 'Additional information', hint: 'Share context that helps reviewers understand the project. Leave blank if you have nothing to add.' },
];

export const applicationFieldLabels: Record<keyof Application, string> = {
  firstName: 'First name', lastName: 'Last name', email: 'ChatGPT account email',
  githubUsername: 'GitHub username', repositoryUrl: 'Repository URL', role: 'Maintainer role',
  qualifies: 'Why does this repository qualify?', securityInterest: 'Interest in Codex Security',
  organizationId: 'OpenAI Organization ID', creditUse: 'How would you use API credits?',
  additional: 'Additional information', licenseStatus: 'Repository license status',
};

export function draftApplicationAnswers(application: Application): Pick<Application, 'qualifies' | 'creditUse'> {
  const licenseLine = application.licenseStatus === 'Has a public open-source license'
    ? 'The repository uses a public open-source license; I will verify the license name and terms before submitting.'
    : application.licenseStatus === 'No public license found'
      ? 'I have not found a public license in the repository yet, so I will verify and address that before making an eligibility claim.'
      : 'I will confirm the repository license and eligibility requirements before submitting.';
  return {
    qualifies: `I maintain Deep-Signal, a solo-developed application. The repository contains a React and TypeScript platform with a social feed, messaging, voice rooms, games, and a Jokal AI proposal workflow. ${licenseLine} Planned features are still in development and are not represented as shipped.`,
    creditUse: 'I would use API credits to develop and evaluate the AI-assisted features in Deep-Signal, including Jokal project proposals and safe, structured game specifications. I would use the credits for implementation, testing, and improving reliability, while keeping provider keys server-side and tracking usage.',
  };
}

export function validateApplication(application: Application): (keyof Application)[] {
  const required: (keyof Application)[] = ['firstName', 'lastName', 'email', 'githubUsername', 'repositoryUrl', 'role', 'qualifies', 'securityInterest', 'creditUse', 'licenseStatus'];
  const missing = required.filter((key) => !application[key].trim());
  if (application.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) missing.push('email');
  if (application.repositoryUrl && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(application.repositoryUrl.trim())) missing.push('repositoryUrl');
  if (application.licenseStatus !== 'Has a public open-source license') missing.push('licenseStatus');
  return [...new Set(missing)];
}

export function formatApplication(application: Application): string {
  return [
    `${applicationFieldLabels.firstName}: ${application.firstName}`,
    `${applicationFieldLabels.lastName}: ${application.lastName}`,
    `${applicationFieldLabels.email}: ${application.email}`,
    `${applicationFieldLabels.githubUsername}: ${application.githubUsername}`,
    `${applicationFieldLabels.repositoryUrl}: ${application.repositoryUrl}`,
    `${applicationFieldLabels.role}: ${application.role}`,
    `${applicationFieldLabels.qualifies}: ${application.qualifies}`,
    `${applicationFieldLabels.securityInterest}: ${application.securityInterest}`,
    `${applicationFieldLabels.organizationId}: ${application.organizationId || '(not provided)'}`,
    `${applicationFieldLabels.creditUse}: ${application.creditUse}`,
    `${applicationFieldLabels.additional}: ${application.additional || '(none)'}`,
  ].join('\n\n');
}
