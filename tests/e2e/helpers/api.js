/**
 * Thin wrapper around the real endpoints, used only to seed/verify data
 * for E2E tests without duplicating app logic in JS.
 */
const BASE_URL = 'http://localhost/recruitment_tracker';

async function registerCandidate({ email, password, firstName = 'QA', lastName = 'Candidate' }) {
  const res = await fetch(`${BASE_URL}/api/register_candidate.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      phone: '', location: '', linkedin: '', headline: '',
    }),
  });
  return res.json();
}

module.exports = { registerCandidate, BASE_URL };
