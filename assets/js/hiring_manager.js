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

function starDisplay(rating) {
  const r = Math.round(rating || 0);
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function recommendationLabel(rec) {
  const map = { strong_yes: 'Strong Yes', yes: 'Yes', no: 'No', strong_no: 'Strong No' };
  return map[rec] || rec;
}

function recommendationPillClass(rec) {
  const map = { strong_yes: 'offer', yes: 'in-review', no: 'rejected', strong_no: 'rejected' };
  return map[rec] || 'submitted';
}

function formatHmDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const STAGE_ORDER = ['submitted', 'interview', 'in-review', 'offer', 'hired', 'rejected'];
const STAGE_LABELS = {
  'submitted': 'Shortlisted',
  'in-review': 'In Review',
  'interview': 'Interview',
  'offer': 'Offer',
  'hired': 'Hired',
  'rejected': 'Rejected'
};

let pipelineApplications = [];
let activeVacancies = [];
let feedbackData = [];
let selectedFeedbackJob = 'all';
let pipelineLoaded = false;
let feedbackLoaded = false;

// ================= NAVIGATION =================

function switchHmView(navEl, view) {
  document.querySelectorAll(".nav-menu .nav-item").forEach(el => el.classList.remove("active"));
  navEl.classList.add('active');

  document.getElementById('pipeline-view').style.display = view === 'pipeline' ? 'block' : 'none';
  document.getElementById('review-candidates-view').style.display = view === 'review-candidates' ? 'block' : 'none';
  document.getElementById('review-feedback-view').style.display = view === 'review-feedback' ? 'block' : 'none';
  document.getElementById('hiring-decisions-view').style.display = view === 'hiring-decisions' ? 'block' : 'none';
  document.getElementById('notifications-view').style.display = view === 'notifications' ? 'block' : 'none';

  if (view === 'review-candidates') {
    renderReviewCandidates();
  } else if (view === 'review-feedback') {
    renderReviewFeedbackFilters();
    renderReviewFeedback();
  } else if (view === 'hiring-decisions') {
    renderDecisions();
  } else if (view === 'notifications') {
    loadHmNotifications();
  }
}

// ================= PROFILE =================

function loadHiringManagerProfile() {
  fetch('../api/get_hiring_manager_profile.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        window.location.href = 'HiringManager_login.html';
        return;
      }
      const a = result.data;
      const fullName = `${a.first_name} ${a.last_name}`.trim();
      document.getElementById('sidebar-avatar').textContent = getInitials(fullName) || "?";
      document.getElementById('sidebar-name').textContent = fullName;
      document.getElementById('sidebar-email').textContent = a.email;
    })
    .catch(error => console.error('Error loading hiring manager profile:', error));
}

// ================= PIPELINE (SHARED DATA) =================

function loadPipeline(callback) {
  fetch('../api/get_hm_pipeline.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      pipelineApplications = result.data;
      activeVacancies = result.vacancies;
      pipelineLoaded = true;
      populateVacancySelect();
      renderKanban();
      renderReviewCandidates();
      renderDecisions();
      if (typeof callback === 'function') callback();
    })
    .catch(error => console.error('Error loading pipeline:', error));
}

function populateVacancySelect() {
  const select = document.getElementById('pipeline-vacancy-select');
  const current = select.value;
  select.innerHTML = '<option value="all">All Positions</option>' +
    activeVacancies.map(v => `<option value="${v.title}">${v.title}</option>`).join('');
  if (current && [...select.options].some(o => o.value === current)) {
    select.value = current;
  }
}

// ================= KANBAN BOARD =================

function renderKanban() {
  if (!pipelineLoaded) return;
  const board = document.getElementById('kanban-board');
  const selectedVacancy = document.getElementById('pipeline-vacancy-select').value || 'all';

  const scoped = selectedVacancy === 'all'
    ? pipelineApplications
    : pipelineApplications.filter(a => a.job_title === selectedVacancy);

  board.innerHTML = STAGE_ORDER.map(stage => {
    const stageApps = scoped.filter(a => a.status === stage);
    return `
      <div class="kanban-column">
        <div class="kanban-column-header">
          <span class="kanban-dot ${stage}"></span>
          <span class="kanban-column-title">${STAGE_LABELS[stage]}</span>
          <span class="kanban-column-count">${stageApps.length}</span>
        </div>
        <div class="kanban-column-body" data-stage="${stage}">
          ${stageApps.length === 0
            ? `<div class="kanban-empty">No candidates</div>`
            : stageApps.map(a => `
              <div class="kanban-card">
                <div class="kanban-card-name">${a.full_name || a.email}</div>
                <div class="kanban-card-sub">${a.job_title}</div>
                <div class="kanban-card-date"><i data-lucide="calendar"></i>Applied ${formatHmDate(a.created_at)}</div>
                ${stage === 'offer'
                  ? `<button class="kanban-card-action hire" onclick="moveApplicationStatus(${a.id}, 'hired')"><i data-lucide="check"></i>Hire</button>`
                  : ['submitted', 'interview', 'in-review'].includes(stage)
                    ? `<button class="kanban-card-action offer" onclick="moveApplicationStatus(${a.id}, 'offer')"><i data-lucide="arrow-right"></i>Move to Offer</button>`
                    : ''}
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function moveApplicationStatus(applicationId, status) {
  const app = pipelineApplications.find(a => a.id === applicationId);
  if (!app || app.status === status) return;
  const previousStatus = app.status;
  app.status = status;
  renderKanban();

  fetch('../api/update_application_status.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_id: applicationId, status: status })
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        app.status = previousStatus;
        renderKanban();
        alert(result.message || 'Failed to update status.');
        return;
      }
      renderReviewCandidates();
      renderDecisions();
    })
    .catch(error => {
      console.error('Error updating status:', error);
      app.status = previousStatus;
      renderKanban();
    });
}

// ================= REVIEW CANDIDATES =================

function getFeedbackForApplication(applicationId) {
  return feedbackData.filter(f => f.application_id === applicationId && f.feedback_id !== null);
}

function avgRating(items) {
  if (items.length === 0) return 0;
  return items.reduce((sum, f) => sum + (f.rating || 0), 0) / items.length;
}

function renderReviewCandidates() {
  const container = document.getElementById('review-candidates-list');
  if (!container || !pipelineLoaded) return;

  const inReview = pipelineApplications.filter(a => a.status === 'in-review');
  const withFeedback = inReview.filter(a => getFeedbackForApplication(a.id).length > 0);
  const awaitingFeedback = inReview.filter(a => getFeedbackForApplication(a.id).length === 0);

  document.getElementById('review-candidates-stat-grid').innerHTML = `
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon amber"><i data-lucide="star"></i></div></div>
      <div class="metric-value">${inReview.length}</div>
      <div class="metric-label">Total In Review</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon green"><i data-lucide="message-square"></i></div></div>
      <div class="metric-value">${withFeedback.length}</div>
      <div class="metric-label">With Feedback</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon purple"><i data-lucide="check-circle-2"></i></div></div>
      <div class="metric-value">${awaitingFeedback.length}</div>
      <div class="metric-label">Awaiting Feedback</div>
    </div>
  `;

  container.innerHTML = inReview.length === 0
    ? `<div class="hm-empty-state"><i data-lucide="user-check"></i><p>No candidates in review yet — candidates move here once an interviewer submits feedback.</p></div>`
    : inReview.map(a => {
      const fb = getFeedbackForApplication(a.id);
      const avg = avgRating(fb);
      return `
        <div class="hm-card">
          <div class="hm-card-body">
            <div class="hm-card-left">
              <div class="hm-card-avatar">${getInitials(a.full_name || a.email) || '?'}</div>
              <div>
                <div class="hm-card-name-row">
                  <span class="hm-card-name">${a.full_name || a.email}</span>
                </div>
                <div class="hm-card-role">${a.job_title}</div>
                <div class="hm-card-meta">
                  ${a.email ? `<span><i data-lucide="mail"></i>${a.email}</span>` : ''}
                  ${a.phone ? `<span><i data-lucide="phone"></i>${a.phone}</span>` : ''}
                  ${a.linkedin ? `<a href="${a.linkedin}" target="_blank" rel="noopener noreferrer"><i data-lucide="linkedin"></i>LinkedIn</a>` : ''}
                </div>
              </div>
            </div>
            <div class="hm-card-right">
              <span class="stage-pill ${a.status}">${STAGE_LABELS[a.status]}</span>
              ${avg > 0 ? `<span class="feedback-stars">${starDisplay(avg)}</span>` : ''}
              ${a.status !== 'hired' && a.status !== 'rejected' ? `
                <div class="hm-actions">
                  <button class="hm-btn hm-btn-reject" onclick="moveApplicationStatus(${a.id}, 'rejected')"><i data-lucide="thumbs-down"></i>Reject</button>
                  <button class="hm-btn hm-btn-approve" onclick="moveApplicationStatus(${a.id}, '${a.status === 'offer' ? 'hired' : 'offer'}')"><i data-lucide="thumbs-up"></i>${a.status === 'offer' ? 'Hire' : 'Move to Offer'}</button>
                </div>
              ` : ''}
            </div>
          </div>
          ${fb.length > 0 ? `
            <div class="hm-feedback-section">
              <div class="hm-feedback-section-title">Interview Feedback (${fb.length})</div>
              ${fb.slice(0, 2).map(f => `
                <div class="hm-feedback-chip"><strong>${f.submitted_by_name || 'Interviewer'}:</strong> ${f.comments || 'No comments provided.'}</div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  lucide.createIcons();
}

// ================= REVIEW FEEDBACK =================

function loadFeedback() {
  fetch('../api/get_hm_feedback.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      feedbackData = result.data;
      feedbackLoaded = true;
      renderReviewFeedbackFilters();
      renderReviewFeedback();
      renderReviewCandidates();
      renderDecisions();
    })
    .catch(error => console.error('Error loading feedback:', error));
}

function renderReviewFeedbackFilters() {
  const jobs = [...new Set(feedbackData.filter(f => f.feedback_id !== null).map(f => f.job_title))];
  const pills = document.getElementById('review-feedback-filter-pills');
  pills.innerHTML = [`<button class="filter-pill ${selectedFeedbackJob === 'all' ? 'active' : ''}" onclick="setFeedbackJobFilter('all')">All Positions</button>`]
    .concat(jobs.map(j => `<button class="filter-pill ${selectedFeedbackJob === j ? 'active' : ''}" onclick="setFeedbackJobFilter('${j.replace(/'/g, "\\'")}')">${j}</button>`))
    .join('');
}

function setFeedbackJobFilter(job) {
  selectedFeedbackJob = job;
  renderReviewFeedbackFilters();
  renderReviewFeedback();
}

function renderReviewFeedback() {
  const container = document.getElementById('review-feedback-list');
  if (!container || !feedbackLoaded) return;

  let withFeedback = feedbackData.filter(f => f.feedback_id !== null);
  if (selectedFeedbackJob !== 'all') {
    withFeedback = withFeedback.filter(f => f.job_title === selectedFeedbackJob);
  }

  const byCandidate = {};
  withFeedback.forEach(f => {
    const key = f.application_id;
    if (!byCandidate[key]) {
      byCandidate[key] = { candidate_name: f.candidate_name, job_title: f.job_title, items: [] };
    }
    byCandidate[key].items.push(f);
  });

  const groups = Object.values(byCandidate);

  container.innerHTML = groups.length === 0
    ? `<div class="hm-empty-state"><i data-lucide="message-square"></i><p>No feedback available yet.</p></div>`
    : groups.map(group => `
      <div class="hm-card">
        <div class="hm-feedback-header">
          <div class="hm-card-avatar" style="width:36px;height:36px;font-size:12px;">${getInitials(group.candidate_name) || '?'}</div>
          <div class="hm-feedback-header-body">
            <div class="hm-feedback-header-name">${group.candidate_name}</div>
            <div class="hm-feedback-header-sub">${group.job_title} · ${group.items.length} feedback item${group.items.length > 1 ? 's' : ''}</div>
          </div>
        </div>
        ${group.items.map(f => {
          const wasEdited = f.feedback_created_at && f.feedback_updated_at && f.feedback_updated_at !== f.feedback_created_at;
          return `
          <div class="hm-feedback-item">
            <div class="hm-feedback-item-top">
              <span class="hm-feedback-item-name">${f.submitted_by_name || 'Interviewer'} · ${f.interview_type}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                ${f.recommendation ? `<span class="stage-pill ${recommendationPillClass(f.recommendation)}">${recommendationLabel(f.recommendation)}</span>` : ''}
                <span class="feedback-stars">${starDisplay(f.rating)}</span>
              </div>
            </div>
            <div class="hm-feedback-item-meta" style="display:flex;align-items:center;gap:6px;margin-top:4px;">
              ${wasEdited ? `<span class="stage-pill in-review">Feedback edited</span><span style="font-size:12px;color:var(--text-muted);">${timeAgo(f.feedback_updated_at)}</span>` : `<span style="font-size:12px;color:var(--text-muted);">Submitted ${timeAgo(f.feedback_created_at)}</span>`}
            </div>
            <p class="hm-feedback-notes">${f.comments || 'No comments provided.'}</p>
          </div>
        `;
        }).join('')}
      </div>
    `).join('');

  lucide.createIcons();
}

// ================= HIRING DECISIONS =================

function renderDecisions() {
  const container = document.getElementById('decisions-list');
  if (!container || !pipelineLoaded) return;

  const finalists = pipelineApplications.filter(a => ['offer', 'hired', 'rejected'].includes(a.status));
  const pending = finalists.filter(a => a.status === 'offer');
  const hired = finalists.filter(a => a.status === 'hired');
  const rejected = finalists.filter(a => a.status === 'rejected');

  document.getElementById('decisions-stat-grid').innerHTML = `
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon amber"><i data-lucide="clock"></i></div></div>
      <div class="metric-value">${pending.length}</div>
      <div class="metric-label">Pending Decision</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon green"><i data-lucide="check-circle-2"></i></div></div>
      <div class="metric-value">${hired.length}</div>
      <div class="metric-label">Hired</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon red"><i data-lucide="x-circle"></i></div></div>
      <div class="metric-value">${rejected.length}</div>
      <div class="metric-label">Rejected</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon purple"><i data-lucide="star"></i></div></div>
      <div class="metric-value">${finalists.length}</div>
      <div class="metric-label">Total Finalists</div>
    </div>
  `;

  container.innerHTML = finalists.length === 0
    ? `<div class="hm-empty-state"><i data-lucide="clipboard-list"></i><p>No candidates on offer yet — move a shortlisted candidate to Offer to make a decision.</p></div>`
    : finalists.map(a => {
      const fb = getFeedbackForApplication(a.id);
      const avg = avgRating(fb);
      const decidedClass = a.status === 'hired' ? 'decided-hired' : (a.status === 'rejected' ? 'decided-rejected' : '');
      return `
        <div class="hm-card ${decidedClass}">
          <div class="hm-card-body">
            <div class="hm-card-left">
              <div class="hm-card-avatar">${getInitials(a.full_name || a.email) || '?'}</div>
              <div>
                <div class="hm-card-name-row">
                  <span class="hm-card-name">${a.full_name || a.email}</span>
                  ${a.status === 'hired' ? `<i data-lucide="check-circle-2" style="width:15px;height:15px;color:#34d399;"></i>` : ''}
                  ${a.status === 'rejected' ? `<i data-lucide="x-circle" style="width:15px;height:15px;color:#f87171;"></i>` : ''}
                </div>
                <div class="hm-card-role">${a.job_title}</div>
                <div class="hm-card-meta">
                  ${a.email ? `<span><i data-lucide="mail"></i>${a.email}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="hm-card-right">
              <div class="hm-card-scores">
                <div class="hm-score">
                  <span class="feedback-stars">${starDisplay(avg)}</span>
                  <div class="hm-score-label">Avg Rating: ${avg.toFixed(1)}</div>
                </div>
                <div class="hm-score">
                  <div class="hm-score-value">${fb.length}</div>
                  <div class="hm-score-label">Feedback Items</div>
                </div>
              </div>
              ${a.status === 'offer' ? `
                <div class="hm-actions">
                  <button class="hm-btn hm-btn-reject" onclick="moveApplicationStatus(${a.id}, 'rejected')"><i data-lucide="thumbs-down"></i>Reject</button>
                  <button class="hm-btn hm-btn-approve" onclick="moveApplicationStatus(${a.id}, 'hired')"><i data-lucide="thumbs-up"></i>Hire</button>
                </div>
              ` : `
                <div class="hm-actions">
                  <span class="hm-decision-tag ${a.status}">${a.status === 'hired' ? '✓ Hired' : '✕ Rejected'}</span>
                  <button class="hm-btn hm-btn-neutral" onclick="moveApplicationStatus(${a.id}, 'offer')">Undo</button>
                </div>
              `}
            </div>
          </div>
          ${fb.length > 0 ? `
            <div class="hm-feedback-section">
              <div class="hm-feedback-section-title">Key Feedback</div>
              ${fb.map(f => `<div class="hm-feedback-chip"><strong>${f.submitted_by_name || 'Interviewer'}:</strong> ${(f.comments || 'No comments provided.').slice(0, 100)}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  lucide.createIcons();
}

// ================= INIT =================

loadHiringManagerProfile();
loadPipeline();
loadFeedback();

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

// ================= NOTIFICATIONS =================

function timeAgo(mysqlDatetime) {
  const then = new Date(mysqlDatetime.replace(" ", "T"));
  const diffSec = Math.floor((Date.now() - then.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return then.toLocaleDateString();
}

const notifTypeIcon = {
  info: "info",
  success: "check-circle-2",
  warning: "alert-triangle",
  reminder: "bell"
};

function refreshHmNotifBadge() {
  fetch('../api/get_hm_notifications.php')
    .then(response => response.json())
    .then(result => {
      const badge = document.getElementById('notif-badge');
      if (!result.success || !badge) return;
      if (result.unread_count > 0) {
        badge.textContent = result.unread_count;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    })
    .catch(error => console.error('Error loading notification count:', error));
}

refreshHmNotifBadge();

function loadHmNotifications() {
  const container = document.getElementById('notifications-container');
  fetch('../api/get_hm_notifications.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        container.innerHTML = `<p class="notif-empty">Failed to load notifications.</p>`;
        return;
      }
      renderHmNotifications(result.data);
    })
    .catch(error => console.error('Error loading notifications:', error));
}

function renderHmNotifications(notifs) {
  const container = document.getElementById('notifications-container');
  const unreadCount = notifs.filter(n => !n.is_read).length;

  let html = `
    <div class="notif-header">
      <div>
        <h1>Notifications</h1>
        <p>${unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}</p>
      </div>
      ${unreadCount > 0 ? `
        <button class="notif-mark-all-btn" onclick="markAllHmNotificationsRead()">
          <i data-lucide="check"></i> Mark all as read
        </button>
      ` : ""}
    </div>
    <div class="notif-list">
  `;

  if (notifs.length === 0) {
    html += `
      <div class="notif-empty">
        <i data-lucide="bell" style="width: 48px; height: 48px;"></i>
        <p>No notifications</p>
      </div>
    `;
  } else {
    notifs.forEach(notif => {
      html += `
        <div class="notif-card ${notif.is_read ? "" : "unread"}">
          <div class="notif-icon ${notif.type}">
            <i data-lucide="${notifTypeIcon[notif.type] || "info"}"></i>
          </div>
          <div class="notif-body">
            <p class="notif-message ${notif.is_read ? "" : "unread"}">${notif.message}</p>
            <p class="notif-timestamp">${timeAgo(notif.created_at)}</p>
          </div>
          <div class="notif-actions">
            ${!notif.is_read ? `
              <button class="notif-action-btn" title="Mark as read" onclick="markHmNotificationRead(${notif.id})">
                <i data-lucide="check"></i>
              </button>
            ` : ""}
            <button class="notif-action-btn delete" title="Delete" onclick="deleteHmNotificationItem(${notif.id})">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;
    });
  }

  html += `</div>`;
  container.innerHTML = html;
  lucide.createIcons();
}

function markHmNotificationRead(id) {
  fetch('../api/mark_hm_notification_read.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(response => response.json())
    .then(() => {
      loadHmNotifications();
      refreshHmNotifBadge();
    })
    .catch(error => console.error('Error marking notification read:', error));
}

function markAllHmNotificationsRead() {
  fetch('../api/mark_all_hm_notifications_read.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
    .then(response => response.json())
    .then(() => {
      loadHmNotifications();
      refreshHmNotifBadge();
    })
    .catch(error => console.error('Error marking all notifications read:', error));
}

function deleteHmNotificationItem(id) {
  fetch('../api/delete_hm_notification.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(response => response.json())
    .then(() => {
      loadHmNotifications();
      refreshHmNotifBadge();
    })
    .catch(error => console.error('Error deleting notification:', error));
}
