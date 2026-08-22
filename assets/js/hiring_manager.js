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

function formatHmDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const STAGE_ORDER = ['submitted', 'in-review', 'interview', 'offer', 'hired', 'rejected'];
const STAGE_LABELS = {
  'submitted': 'Submitted',
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
  document.getElementById('shortlisted-view').style.display = view === 'shortlisted' ? 'block' : 'none';
  document.getElementById('review-feedback-view').style.display = view === 'review-feedback' ? 'block' : 'none';
  document.getElementById('hiring-decisions-view').style.display = view === 'hiring-decisions' ? 'block' : 'none';

  if (view === 'shortlisted') {
    renderShortlisted();
  } else if (view === 'review-feedback') {
    renderReviewFeedbackFilters();
    renderReviewFeedback();
  } else if (view === 'hiring-decisions') {
    renderDecisions();
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
      renderShortlisted();
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

let draggedApplicationId = null;

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
        <div class="kanban-column-body" data-stage="${stage}"
             ondragover="handleKanbanDragOver(event)"
             ondragleave="handleKanbanDragLeave(event)"
             ondrop="handleKanbanDrop(event, '${stage}')">
          ${stageApps.length === 0
            ? `<div class="kanban-empty">Drop candidates here</div>`
            : stageApps.map(a => `
              <div class="kanban-card" draggable="true"
                   ondragstart="handleKanbanDragStart(event, ${a.id})"
                   ondragend="handleKanbanDragEnd(event)">
                <div class="kanban-card-name">${a.full_name || a.email}</div>
                <div class="kanban-card-sub">${a.job_title}</div>
                <div class="kanban-card-date"><i data-lucide="calendar"></i>Applied ${formatHmDate(a.created_at)}</div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function handleKanbanDragStart(e, applicationId) {
  draggedApplicationId = applicationId;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleKanbanDragEnd(e) {
  e.target.classList.remove('dragging');
}

function handleKanbanDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleKanbanDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleKanbanDrop(e, stage) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (draggedApplicationId === null) return;
  moveApplicationStatus(draggedApplicationId, stage);
  draggedApplicationId = null;
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
      renderShortlisted();
      renderDecisions();
    })
    .catch(error => {
      console.error('Error updating status:', error);
      app.status = previousStatus;
      renderKanban();
    });
}

// ================= SHORTLISTED CANDIDATES =================

function getFeedbackForApplication(applicationId) {
  return feedbackData.filter(f => f.application_id === applicationId && f.feedback_id !== null);
}

function avgRating(items) {
  if (items.length === 0) return 0;
  return items.reduce((sum, f) => sum + (f.rating || 0), 0) / items.length;
}

function renderShortlisted() {
  const container = document.getElementById('shortlisted-list');
  if (!container || !pipelineLoaded) return;

  const shortlisted = pipelineApplications.filter(a => ['interview', 'offer', 'hired'].includes(a.status));
  const withFeedback = shortlisted.filter(a => getFeedbackForApplication(a.id).length > 0);
  const readyForOffer = shortlisted.filter(a => a.status === 'offer' || a.status === 'hired');

  document.getElementById('shortlisted-stat-grid').innerHTML = `
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon amber"><i data-lucide="star"></i></div></div>
      <div class="metric-value">${shortlisted.length}</div>
      <div class="metric-label">Total Shortlisted</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon green"><i data-lucide="message-square"></i></div></div>
      <div class="metric-value">${withFeedback.length}</div>
      <div class="metric-label">With Feedback</div>
    </div>
    <div class="metric-card">
      <div class="metric-top"><div class="metric-icon purple"><i data-lucide="check-circle-2"></i></div></div>
      <div class="metric-value">${readyForOffer.length}</div>
      <div class="metric-label">Ready for Offer / Hired</div>
    </div>
  `;

  container.innerHTML = shortlisted.length === 0
    ? `<div class="hm-empty-state"><i data-lucide="user-check"></i><p>No shortlisted candidates yet — move candidates to Interview or beyond on the Pipeline Board.</p></div>`
    : shortlisted.map(a => {
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
      renderShortlisted();
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
        ${group.items.map(f => `
          <div class="hm-feedback-item">
            <div class="hm-feedback-item-top">
              <span class="hm-feedback-item-name">${f.submitted_by_name || 'Interviewer'} · ${f.interview_type}</span>
              <span class="feedback-stars">${starDisplay(f.rating)}</span>
            </div>
            <p class="hm-feedback-notes">${f.comments || 'No comments provided.'}</p>
          </div>
        `).join('')}
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
