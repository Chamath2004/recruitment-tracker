lucide.createIcons();

const ROLES = {
  candidate: {
    label: 'Candidate',
    endpoint: 'login_candidate.php',
    redirect: 'Candidate.html',
    heading: 'Start your journey with top companies.',
    subtext: 'Create your candidate profile, upload your resume, and track your job applications all in one place.',
    demoEmail: 'demo.candidate@altrium.local',
    showRegister: true
  },
  hr: {
    label: 'HR Administrator',
    endpoint: 'login_hr.php',
    redirect: 'HR.html',
    heading: 'Manage hiring with confidence.',
    subtext: 'Oversee vacancies, hiring workflows, feedback, and team access from one place.',
    demoEmail: 'demo.hr@altrium.local',
    showRegister: false
  },
  interviewer: {
    label: 'Interviewer',
    endpoint: 'login_interviewer.php',
    redirect: 'Interviewer.html',
    heading: 'Review candidates, share your feedback.',
    subtext: 'See your scheduled interviews and submit structured feedback after each one.',
    demoEmail: 'demo.interviewer@altrium.local',
    showRegister: false
  },
  hiring_manager: {
    label: 'Hiring Manager',
    endpoint: 'login_hiring_manager.php',
    redirect: 'HiringManager.html',
    heading: 'Track shortlisted candidates end to end.',
    subtext: 'Follow shortlisted candidates through your pipeline and make hiring decisions faster.',
    demoEmail: 'demo.hm@altrium.local',
    showRegister: false
  }
};

const DEMO_PASSWORD = 'Demo@1234';
let activeRole = 'candidate';

function isQuickLoginAllowed() {
  return ['localhost', '127.0.0.1', '::1', 'altrium.page.gd'].includes(window.location.hostname);
}

function setActiveRole(role) {
  activeRole = role;
  const config = ROLES[role];

  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.role === role);
  });

  document.getElementById('subtitle-role').textContent = config.label;
  document.getElementById('brand-role-label').textContent = config.label;
  document.getElementById('brand-heading').textContent = config.heading;
  document.getElementById('brand-subtext').textContent = config.subtext;
  document.getElementById('register-footer').style.display = config.showRegister ? 'block' : 'none';
  document.getElementById('quick-login-role-label').textContent = config.label;

  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
}

function performLogin(role, email, password) {
  const config = ROLES[role];

  return fetch('../api/' + config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        window.location.href = config.redirect;
      } else {
        alert(result.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while signing in.');
    });
}

function submitUnifiedLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  performLogin(activeRole, email, password);
}

function submitQuickLogin() {
  const config = ROLES[activeRole];
  performLogin(activeRole, config.demoEmail, DEMO_PASSWORD);
}

document.querySelectorAll('.role-tab').forEach(tab => {
  tab.addEventListener('click', () => setActiveRole(tab.dataset.role));
});

if (isQuickLoginAllowed()) {
  document.getElementById('quick-login-section').style.display = 'block';
}

setActiveRole('candidate');
