lucide.createIcons();

function getInitials(name) {
  return (name || "")
    .split(" ")
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

let myInterviewsList = [];
let assignedCandidatesList = [];
let assignedPositionsList = [];

function switchInterviewerView(navEl, view) {
  document.querySelectorAll(".nav-menu .nav-item").forEach(el => el.classList.remove("active"));
  navEl.classList.add('active');

  document.getElementById('my-interviews-view').style.display = view === 'my-interviews' ? 'block' : 'none';
  document.getElementById('assigned-candidates-view').style.display = view === 'assigned-candidates' ? 'block' : 'none';
  document.getElementById('submit-feedback-list-view').style.display = view === 'submit-feedback-list' ? 'block' : 'none';
  document.getElementById('submit-feedback-view').style.display = 'none';

  if (view === 'assigned-candidates') {
    loadAssignedCandidates();
  } else if (view === 'submit-feedback-list') {
    loadMyInterviews();
  }
}

function loadInterviewerProfile() {
  fetch('../api/get_interviewer_profile.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        window.location.href = 'Interviewer_login.html';
        return;
      }
      const a = result.data;
      const fullName = `${a.first_name} ${a.last_name}`.trim();
      document.getElementById('sidebar-avatar').textContent = getInitials(fullName) || "?";
      document.getElementById('sidebar-name').textContent = fullName;
      document.getElementById('sidebar-email').textContent = a.email;
    })
    .catch(error => console.error('Error loading interviewer profile:', error));
}

function loadMyInterviews() {
  fetch('../api/get_my_interviews.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      myInterviewsList = result.data;
      renderMyInterviews();
      renderSubmitFeedbackList();
    })
    .catch(error => console.error('Error loading interviews:', error));
}

function formatMiDate(date, time) {
  const d = new Date(`${date}T${time}`);
  if (isNaN(d.getTime())) return { dateStr: date, timeStr: time };
  return {
    dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    timeStr: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  };
}

function starDisplay(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function recommendationLabel(rec) {
  const map = { strong_yes: 'Strong Yes', yes: 'Yes', no: 'No', strong_no: 'Strong No' };
  return map[rec] || rec;
}

function recommendationPillClass(rec) {
  const map = { strong_yes: 'offer', yes: 'in-review', no: 'rejected', strong_no: 'rejected' };
  return map[rec] || 'submitted';
}

function renderMyInterviews() {
  const upcoming = myInterviewsList.filter(iv => iv.status === 'scheduled');
  const pendingFeedback = myInterviewsList.filter(iv => iv.status === 'completed' && !iv.feedback_id);
  const completed = myInterviewsList.filter(iv => iv.status === 'completed' && iv.feedback_id);

  document.getElementById('mi-stat-grid').innerHTML = `
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon blue"><i data-lucide="calendar"></i></div></div>
      <div class="metric-value">${upcoming.length}</div>
      <div class="metric-label">Upcoming</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon amber"><i data-lucide="alert-circle"></i></div></div>
      <div class="metric-value">${pendingFeedback.length}</div>
      <div class="metric-label">Pending Feedback</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon green"><i data-lucide="check-circle-2"></i></div></div>
      <div class="metric-value">${completed.length}</div>
      <div class="metric-label">Completed</div>
    </div>
  `;

  const banner = document.getElementById('mi-alert-banner');
  if (pendingFeedback.length > 0) {
    banner.style.display = '';
    banner.innerHTML = `
      <i data-lucide="alert-circle"></i>
      <div>
        <div class="feedback-alert-title">Feedback Required</div>
        <div class="feedback-alert-desc">You have ${pendingFeedback.length} interview${pendingFeedback.length > 1 ? 's' : ''} awaiting feedback submission.</div>
      </div>
    `;
  } else {
    banner.style.display = 'none';
  }

  document.getElementById('mi-upcoming-count').textContent = upcoming.length;
  document.getElementById('mi-pending-count').textContent = pendingFeedback.length;
  document.getElementById('mi-completed-count').textContent = completed.length;

  document.getElementById('mi-pending-section').style.display = pendingFeedback.length > 0 ? '' : 'none';

  document.getElementById('mi-upcoming-list').innerHTML = upcoming.length === 0
    ? `<div class="panel-empty">No upcoming interviews scheduled.</div>`
    : upcoming.map(iv => {
      const { dateStr, timeStr } = formatMiDate(iv.interview_date, iv.interview_time);
      const hasVideoLink = iv.mode === 'video' && /^https?:\/\//i.test(iv.meeting_link || '');
      return `
        <div class="mi-card">
          <div class="mi-card-left">
            <div class="mi-avatar blue">${getInitials(iv.candidate_name) || '?'}</div>
            <div>
              <div class="mi-card-name">${iv.candidate_name}</div>
              <div class="mi-card-sub">${iv.job_title}</div>
              <div class="mi-card-sub2">${iv.interview_type}</div>
            </div>
          </div>
          <div class="mi-card-right">
            <div class="mi-datetime">
              <div class="mi-datetime-date"><i data-lucide="calendar"></i>${dateStr}</div>
              <div class="mi-datetime-time"><i data-lucide="clock"></i>${timeStr}</div>
            </div>
            ${hasVideoLink ? `
              <a class="feedback-add-btn" href="${iv.meeting_link}" target="_blank" rel="noopener noreferrer">
                <i data-lucide="video"></i> Join
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  document.getElementById('mi-pending-list').innerHTML = pendingFeedback.map(iv => {
    const { dateStr } = formatMiDate(iv.interview_date, iv.interview_time);
    return `
      <div class="mi-card pending">
        <div class="mi-card-left">
          <div class="mi-avatar amber">${getInitials(iv.candidate_name) || '?'}</div>
          <div>
            <div class="mi-card-name">${iv.candidate_name}</div>
            <div class="mi-card-sub">${iv.job_title} · ${iv.interview_type}</div>
            <div class="mi-card-sub2 amber">Interviewed on ${dateStr}</div>
          </div>
        </div>
        <button class="feedback-add-btn" onclick="openFeedbackPage(${iv.id})">
          <i data-lucide="message-square-plus"></i> Submit Feedback
        </button>
      </div>
    `;
  }).join('');

  document.getElementById('mi-completed-list').innerHTML = completed.length === 0
    ? `<div class="panel-empty">No completed interviews yet.</div>`
    : completed.map(iv => `
      <div class="mi-card completed">
        <div class="mi-card-left">
          <div class="mi-avatar emerald"><i data-lucide="check-circle-2"></i></div>
          <div>
            <div class="mi-card-name">${iv.candidate_name}</div>
            <div class="mi-card-sub">${iv.job_title} · ${iv.interview_type}</div>
          </div>
        </div>
        <div class="mi-card-right">
          <span class="feedback-stars">${starDisplay(iv.rating)}</span>
          <span class="stage-pill ${recommendationPillClass(iv.recommendation)}">${recommendationLabel(iv.recommendation)}</span>
        </div>
      </div>
    `).join('');

  lucide.createIcons();
}

// ================= SUBMIT FEEDBACK =================

let feedbackPageRatingValue = 0;
let feedbackPageRecommendationValue = '';
let feedbackPageInterviewId = null;
let feedbackPageOrigin = 'my-interviews';

const RECOMMENDATION_OPTIONS = [
  { value: 'strong_yes', label: 'Strong Yes' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'strong_no', label: 'Strong No' }
];

function renderSubmitFeedbackList() {
  const container = document.getElementById('sf-list');
  if (!container) return;

  const completed = myInterviewsList.filter(iv => iv.status === 'completed');

  container.innerHTML = completed.length === 0
    ? `<div class="panel-empty ac-empty"><i data-lucide="file-text"></i><p>No completed interviews yet.</p></div>`
    : completed.map(iv => {
      const { dateStr } = formatMiDate(iv.interview_date, iv.interview_time);
      const hasFeedback = !!iv.feedback_id;
      return `
        <div class="mi-card ${hasFeedback ? 'completed' : 'pending'} sf-clickable" onclick="openFeedbackPage(${iv.id}, 'submit-feedback-list')">
          <div class="mi-card-left">
            <div class="mi-avatar ${hasFeedback ? 'emerald' : 'amber'}">${getInitials(iv.candidate_name) || '?'}</div>
            <div>
              <div class="mi-card-name">${iv.candidate_name}</div>
              <div class="mi-card-sub">${iv.job_title} · ${iv.interview_type}</div>
              <div class="mi-card-sub2 ${hasFeedback ? '' : 'amber'}">Interviewed on ${dateStr}</div>
            </div>
          </div>
          <div class="mi-card-right">
            ${hasFeedback ? `
              <span class="feedback-stars">${starDisplay(iv.rating)}</span>
              <span class="stage-pill ${recommendationPillClass(iv.recommendation)}">${recommendationLabel(iv.recommendation)}</span>
              <span class="mi-view-edit-link"><i data-lucide="pencil"></i> Edit</span>
            ` : `<span class="stage-pill pending">Needs Feedback</span>`}
          </div>
        </div>
      `;
    }).join('');

  lucide.createIcons();
}

function openFeedbackPage(interviewId, origin) {
  const iv = myInterviewsList.find(item => Number(item.id) === Number(interviewId));
  if (!iv) return;

  feedbackPageInterviewId = interviewId;
  feedbackPageOrigin = origin || 'my-interviews';
  feedbackPageRatingValue = iv.rating || 0;
  feedbackPageRecommendationValue = iv.recommendation || '';

  const { dateStr, timeStr } = formatMiDate(iv.interview_date, iv.interview_time);

  document.getElementById('fb-page-title').textContent = iv.feedback_id ? 'Edit Feedback' : 'Submit Feedback';
  document.getElementById('fb-page-subtitle').textContent = `${iv.interview_type} for ${iv.job_title}`;
  document.getElementById('fb-page-form-title').textContent = iv.feedback_id ? 'Update Your Feedback' : 'Your Feedback';
  document.getElementById('fb-page-submit-btn').textContent = iv.feedback_id ? 'Update Feedback' : 'Submit Feedback';
  document.getElementById('fb-page-comments').value = iv.comments || '';

  document.getElementById('fb-candidate-info').innerHTML = `
    <div class="ac-card-left">
      <div class="ac-avatar">${getInitials(iv.candidate_name) || '?'}</div>
      <div>
        <div class="ac-card-name">${iv.candidate_name}</div>
        <div class="ac-card-role">${iv.job_title}</div>
        <div class="ac-card-meta">
          <span><i data-lucide="calendar"></i>${dateStr}</span>
          <span><i data-lucide="clock"></i>${timeStr}</span>
        </div>
      </div>
    </div>
  `;

  renderFeedbackPageRatingPicker();
  renderFeedbackPageRecommendationPills();

  document.getElementById('fb-back-label').textContent =
    feedbackPageOrigin === 'submit-feedback-list' ? 'Back to Submit Feedback' : 'Back to Interviews';

  document.querySelectorAll('.nav-menu .nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('my-interviews-view').style.display = 'none';
  document.getElementById('assigned-candidates-view').style.display = 'none';
  document.getElementById('submit-feedback-list-view').style.display = 'none';
  document.getElementById('submit-feedback-view').style.display = 'block';
  lucide.createIcons();
}

function closeFeedbackPage() {
  feedbackPageInterviewId = null;
  document.getElementById('submit-feedback-view').style.display = 'none';

  if (feedbackPageOrigin === 'submit-feedback-list') {
    document.getElementById('submit-feedback-list-view').style.display = 'block';
    document.getElementById('nav-submit-feedback').classList.add('active');
  } else {
    document.getElementById('my-interviews-view').style.display = 'block';
    document.getElementById('nav-my-interviews').classList.add('active');
  }
}

function renderFeedbackPageRatingPicker() {
  document.getElementById('fb-page-rating-picker').innerHTML = [1, 2, 3, 4, 5].map(n => `
    <button type="button" class="${n <= feedbackPageRatingValue ? 'filled' : ''}" data-star="${n}" onclick="setFeedbackPageRating(${n})">
      <i data-lucide="star"></i>
    </button>
  `).join('');
}

function renderFeedbackPageRecommendationPills() {
  document.getElementById('fb-page-recommendation-pills').innerHTML = RECOMMENDATION_OPTIONS.map(opt => `
    <button type="button" class="filter-pill ${feedbackPageRecommendationValue === opt.value ? 'active' : ''}" data-value="${opt.value}" onclick="setFeedbackPageRecommendation('${opt.value}')">${opt.label}</button>
  `).join('');
}

function setFeedbackPageRating(value) {
  feedbackPageRatingValue = value;
  document.querySelectorAll('#fb-page-rating-picker button').forEach(btn => {
    btn.classList.toggle('filled', parseInt(btn.dataset.star, 10) <= value);
  });
}

function setFeedbackPageRecommendation(value) {
  feedbackPageRecommendationValue = value;
  document.querySelectorAll('#fb-page-recommendation-pills .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

function submitFeedbackPage() {
  if (feedbackPageRatingValue < 1 || !feedbackPageRecommendationValue) {
    alert('Please select a rating and a recommendation.');
    return;
  }

  fetch('../api/save_my_feedback.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      interview_id: feedbackPageInterviewId,
      rating: feedbackPageRatingValue,
      recommendation: feedbackPageRecommendationValue,
      comments: document.getElementById('fb-page-comments').value.trim()
    })
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to save feedback.');
        return;
      }
      closeFeedbackPage();
      loadMyInterviews();
    })
    .catch(error => console.error('Error saving feedback:', error));
}

function stagePillClass(status) {
  const map = {
    submitted: 'submitted',
    'in-review': 'in-review',
    interview: 'interview',
    offer: 'offer',
    hired: 'hired',
    rejected: 'rejected'
  };
  return map[status] || 'submitted';
}

function stageLabel(status) {
  const map = {
    submitted: 'Submitted',
    'in-review': 'In Review',
    interview: 'Interview',
    offer: 'Offer',
    hired: 'Hired',
    rejected: 'Rejected'
  };
  return map[status] || status;
}

function loadAssignedCandidates() {
  fetch('../api/get_assigned_candidates.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      assignedCandidatesList = result.data;
      assignedPositionsList = result.assigned_positions;
      renderAssignedCandidates();
    })
    .catch(error => console.error('Error loading assigned candidates:', error));
}

function renderAssignedCandidates() {
  document.getElementById('ac-positions-list').innerHTML = assignedPositionsList.length === 0
    ? `<span class="panel-empty">No positions assigned yet.</span>`
    : assignedPositionsList.map(title => `<span class="ac-position-pill">${title}</span>`).join('');

  document.getElementById('ac-candidates-list').innerHTML = assignedCandidatesList.length === 0
    ? `<div class="panel-empty ac-empty"><i data-lucide="file-text"></i><p>No candidates assigned to you yet.</p></div>`
    : assignedCandidatesList.map(c => {
      const canView = c.resume_path && c.resume_name && c.resume_name.toLowerCase().endsWith('.pdf');
      return `
        <div class="ac-card">
          <div class="ac-card-top">
            <div class="ac-card-left">
              <div class="ac-avatar">${getInitials(c.full_name) || '?'}</div>
              <div>
                <div class="ac-card-name">${c.full_name}</div>
                <div class="ac-card-role">${c.job_title}</div>
                <div class="ac-card-meta">
                  ${c.email ? `<span><i data-lucide="mail"></i>${c.email}</span>` : ''}
                  ${c.phone ? `<span><i data-lucide="phone"></i>${c.phone}</span>` : ''}
                  ${c.linkedin ? `<a href="${c.linkedin}" target="_blank" rel="noopener noreferrer"><i data-lucide="linkedin"></i>LinkedIn</a>` : ''}
                </div>
              </div>
            </div>
            <div class="ac-card-right">
              <span class="stage-pill ${stagePillClass(c.status)}">${stageLabel(c.status)}</span>
              <div class="ac-interviews">
                <p class="ac-interviews-label">Your Interviews</p>
                ${c.interviews.map(iv => {
                  const { dateStr, timeStr } = formatMiDate(iv.date, iv.time);
                  return `<p class="ac-interviews-item">${dateStr} at ${timeStr} · ${iv.type}</p>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="ac-cv-strip">
            <div class="ac-cv-strip-label"><i data-lucide="file-text"></i> Resume</div>
            ${c.resume_path ? `
              <div class="ac-cv-strip-actions">
                <span class="ac-cv-filename">${c.resume_name}</span>
                ${canView ? `<a class="ac-cv-btn" href="../api/download_resume.php?application_id=${c.application_id}&mode=view" target="_blank" rel="noopener noreferrer"><i data-lucide="eye"></i> View</a>` : ''}
                <a class="ac-cv-btn primary" href="../api/download_resume.php?application_id=${c.application_id}"><i data-lucide="download"></i> Download</a>
              </div>
            ` : `<span class="ac-cv-strip-empty">No resume uploaded</span>`}
          </div>
        </div>
      `;
    }).join('');

  lucide.createIcons();
}

loadInterviewerProfile();
loadMyInterviews();

// ================= SIDEBAR COLLAPSE =================

const sidebar = document.querySelector('.sidebar');
const collapseBtn = document.querySelector('.collapse-btn');

collapseBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');

  const isCollapsed = sidebar.classList.contains('collapsed');
  collapseBtn.querySelector('i').setAttribute(
    'data-lucide',
    isCollapsed ? 'chevron-right' : 'chevron-left'
  );

  lucide.createIcons();
});
