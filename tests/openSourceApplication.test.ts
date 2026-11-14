import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPLICATION_TEXT_LIMIT,
  applicationTextFields,
  draftApplicationAnswers,
  formatApplication,
  initialApplication,
  validateApplication,
  type Application,
} from '../src/lib/openSourceApplication.ts';

function completeApplication(): Application {
  return {
    ...initialApplication,
    email: 'maintainer@example.com',
    securityInterest: 'Yes',
    licenseStatus: 'Has a public open-source license',
    ...draftApplicationAnswers({ ...initialApplication, licenseStatus: 'Has a public open-source license' }),
  };
}

test('long-form answer fields use the official 500 character limit', () => {
  assert.equal(APPLICATION_TEXT_LIMIT, 500);
  assert.ok(applicationTextFields.filter((field) => field.key !== 'additional').every((field) => field.required));
});

test('a verified complete profile passes the preparation checklist', () => {
  assert.deepEqual(validateApplication(completeApplication()), []);
});

test('license verification is required before the full application is ready', () => {
  const application = completeApplication();
  application.licenseStatus = 'No public license found';
  assert.ok(validateApplication(application).includes('licenseStatus'));
  application.licenseStatus = '';
  assert.ok(validateApplication(application).includes('licenseStatus'));
});

test('email and repository URL are validated instead of copied as complete', () => {
  const application = completeApplication();
  application.email = 'not-an-email';
  application.repositoryUrl = 'javascript:alert(1)';
  const missing = validateApplication(application);
  assert.ok(missing.includes('email'));
  assert.ok(missing.includes('repositoryUrl'));
});

test('suggested text reports current functionality without inventing adoption', () => {
  const draft = draftApplicationAnswers(completeApplication());
  assert.match(draft.qualifies, /social feed, messaging, voice rooms, games/);
  assert.match(draft.qualifies, /not represented as shipped/);
  assert.doesNotMatch(draft.qualifies, /stars|downloads|users|contributors/i);
});

test('formatted copy omits an unknown organization ID and marks no extra details', () => {
  const text = formatApplication(completeApplication());
  assert.match(text, /OpenAI Organization ID: \(not provided\)/);
  assert.match(text, /Additional information: \(none\)/);
  assert.doesNotMatch(text, /Repository license status:/);
});
