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

function loadInterviewerProfile() {
  fetch('get_interviewer_profile.php')
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
  fetch('get_my_interviews.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      myInterviewsList = result.data;
      renderMyInterviews();
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
        <button class="feedback-add-btn" onclick="alert('Submitting feedback from the Interviewer Portal is coming in the next update.')">
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
