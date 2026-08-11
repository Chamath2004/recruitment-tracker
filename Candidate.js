// Populated from the database via loadJobs(). Starts empty until the fetch resolves.
let jobsData = [];

let selectedJobId = null;
let currentStep = 1;
let activeJob = null;

// Form Data State
let formData = {
  fullName: "",
  email: "",
  phone: "",
  linkedin: "",
  resumeName: "",
  coverLetter: ""
};

// Initialize Elements
const jobsListContainer = document.getElementById("jobs-list");
const jobDetailPanel = document.getElementById("job-detail-panel");
const contentBody = document.getElementById("content-body");
const applicationView = document.getElementById("application-view");
const applicationsContainer = document.getElementById("applications-container");
const profileContainer = document.getElementById("profile-container");
const notificationsContainer = document.getElementById("notifications-container");
const headerEl = document.querySelector(".header");
const searchContainerEl = document.querySelector(".search-container");
const resultsCountEl = document.querySelector(".results-count");

// Show only the requested view and keep the sidebar's active state in sync.
// Each view owns its own container so switching never deletes another
// view's DOM (that was the bug: My Applications used to overwrite
// #content-body, which deleted #job-detail-panel and broke My Profile).
function switchView(view) {
  headerEl.style.display = "none";
  searchContainerEl.style.display = "none";
  resultsCountEl.style.display = "none";
  contentBody.style.display = "none";
  applicationView.style.display = "none";
  applicationsContainer.style.display = "none";
  profileContainer.style.display = "none";
  notificationsContainer.style.display = "none";

  document.querySelectorAll(".nav-menu .nav-item").forEach(el => el.classList.remove("active"));

  if (view === "job-board") {
    headerEl.style.display = "block";
    searchContainerEl.style.display = "flex";
    resultsCountEl.style.display = "block";
    contentBody.style.display = "flex";
    document.getElementById("nav-jobs").classList.add("active");
  } else if (view === "application-flow") {
    headerEl.style.display = "block";
    applicationView.style.display = "block";
    document.getElementById("nav-jobs").classList.add("active");
  } else if (view === "applications") {
    applicationsContainer.style.display = "block";
    document.getElementById("nav-applications").classList.add("active");
  } else if (view === "profile") {
    profileContainer.style.display = "block";
    document.getElementById("nav-profile").classList.add("active");
  } else if (view === "notifications") {
    notificationsContainer.style.display = "block";
    document.getElementById("nav-notifications").classList.add("active");
  }
}

// Render Jobs List
function renderJobs() {
  jobsListContainer.innerHTML = jobsData.map(job => `
    <div class="job-card ${selectedJobId === job.id ? 'selected' : ''}" onclick="selectJob(${job.id})">
      <div class="job-info">
        <h3 class="job-title">${job.title}</h3>
        <span class="job-category">${job.category}</span>
        <div class="job-meta">
          <span><i data-lucide="dollar-sign"></i> ${job.salary}</span>
          <span><i data-lucide="clock"></i> ${job.type}</span>
        </div>
      </div>
      <i data-lucide="chevron-right" class="arrow-icon"></i>
    </div>
  `).join('');

  lucide.createIcons();
}

// Select a job and update Detail View
function selectJob(id) {
  selectedJobId = id;
  const job = jobsData.find(j => j.id === id);

  renderJobs();

  jobDetailPanel.innerHTML = `
    <button class="back-to-jobs-btn" onclick="closeJobDetail()">
      <i data-lucide="arrow-left"></i> Back to jobs
    </button>
    <div class="detail-header">
      <div class="detail-icon-box">
        <i data-lucide="briefcase"></i>
      </div>
      <div class="detail-title-area">
        <h2>${job.title}</h2>
        <span class="detail-subtitle">${job.category}</span>
      </div>
    </div>

    <div class="detail-tags">
      <span class="pill-tag green">${job.type}</span>
      <span class="pill-tag blue">${job.salary}</span>
      <span class="pill-tag gray">${job.applicants}</span>
    </div>

    <div class="detail-section">
      <h4>Description</h4>
      <p>${job.description}</p>
    </div>

    <div class="detail-section">
      <h4>Requirements</h4>
      <ul class="requirements-list">
        ${job.requirements.map(req => `<li>${req}</li>`).join('')}
      </ul>
    </div>

    <div class="detail-section">
      <h4>Hiring Process</h4>
      <div class="process-steps">
        ${job.hiringProcess.map(step => `<span class="step-pill">${step}</span>`).join('')}
      </div>
    </div>

    <button class="apply-btn" onclick="openApplication(${job.id})">Apply Now</button>
  `;

  jobDetailPanel.classList.add("active");
  lucide.createIcons();
}

// Return to the jobs list on mobile, where the detail panel replaces the list
function closeJobDetail() {
  selectedJobId = null;
  jobDetailPanel.classList.remove("active");
  jobDetailPanel.innerHTML = "";
  renderJobs();
}

// Open Application View
function openApplication(jobId) {
  activeJob = jobsData.find(j => j.id === jobId);
  currentStep = 1;
  formData = {
    fullName: "",
    email: "",
    phone: "",
    linkedin: "",
    resumeName: "",
    coverLetter: ""
  };

  switchView("application-flow");

  renderApplicationStep();
}

// Render Application Step Content
function renderApplicationStep() {
  if (!activeJob) return;

  let stepContentHtml = "";

  if (currentStep === 1) {
    stepContentHtml = `
      <div class="stepper">
        <div class="step-item active-purple">
          <span class="step-number">1</span> Personal Info
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item">
          <span class="step-number">2</span> Resume Upload
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item">
          <span class="step-number">3</span> Cover Letter
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item">
          <span class="step-number">4</span> Review & Submit
        </div>
      </div>

      <div class="form-card">
        <h3>Personal Information</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="input-fullname" value="${formData.fullName}">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="input-email" value="${formData.email}">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" id="input-phone" value="${formData.phone}">
          </div>
          <div class="form-group">
            <label>LinkedIn Profile</label>
            <input type="text" id="input-linkedin" value="${formData.linkedin}">
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="cancel-btn" onclick="closeApplication()">Cancel</button>
        <button class="continue-btn" onclick="saveStep1AndNext()">
          Continue <i data-lucide="chevron-right"></i>
        </button>
      </div>
    `;
  } else if (currentStep === 2) {
    stepContentHtml = `
      <div class="stepper">
        <div class="step-item completed">
          <i data-lucide="check"></i> Personal Info
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item active-purple">
          <span class="step-number">2</span> Resume Upload
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item">
          <span class="step-number">3</span> Cover Letter
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item">
          <span class="step-number">4</span> Review & Submit
        </div>
      </div>

      <div class="form-card">
        <h3>Resume / CV Upload</h3>
        <div class="upload-box" onclick="document.getElementById('resume-file-input').click()">
          <i data-lucide="upload" class="upload-icon"></i>
          <div class="upload-title" id="upload-title">${formData.resumeName || "Click to upload your resume"}</div>
          <div class="upload-subtitle">PDF, DOC, or DOCX (max 5MB)</div>
          <input type="file" id="resume-file-input" style="display:none;" accept=".pdf,.doc,.docx" onchange="handleFileUpload(event)">
        </div>
        <p class="upload-note">Your resume will be automatically logged into our tracking system.</p>
      </div>

      <div class="form-actions">
        <button class="cancel-btn" onclick="goToStep(1)">Back</button>
        <button class="continue-btn" onclick="goToStep(3)">
          Continue <i data-lucide="chevron-right"></i>
        </button>
      </div>
    `;
  } else if (currentStep === 3) {
    stepContentHtml = `
      <div class="stepper">
        <div class="step-item completed">
          <i data-lucide="check"></i> Personal Info
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item completed">
          <i data-lucide="check"></i> Resume Upload
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item active-purple">
          <span class="step-number">3</span> Cover Letter
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item">
          <span class="step-number">4</span> Review & Submit
        </div>
      </div>

      <div class="form-card">
        <h3>Cover Letter</h3>
        <textarea 
          id="input-coverletter"
          class="cover-letter-input" 
          placeholder="Tell us why you're interested in this role and what makes you a great fit...">${formData.coverLetter}</textarea>
        <p class="cover-letter-note">Optional but recommended</p>
      </div>

      <div class="form-actions">
        <button class="cancel-btn" onclick="goToStep(2)">Back</button>
        <button class="continue-btn" onclick="saveStep3AndNext()">
          Continue <i data-lucide="chevron-right"></i>
        </button>
      </div>
    `;
  } else if (currentStep === 4) {
    stepContentHtml = `
      <div class="stepper">
        <div class="step-item completed">
          <i data-lucide="check"></i> Personal Info
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item completed">
          <i data-lucide="check"></i> Resume Upload
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item completed">
          <i data-lucide="check"></i> Cover Letter
        </div>
        <span class="stepper-divider">&gt;</span>
        <div class="step-item active-purple">
          <span class="step-number">4</span> Review & Submit
        </div>
      </div>

      <div class="form-card">
        <h3>Review Your Application</h3>
        <div class="review-summary-card">
          <div class="review-item">
            <span class="review-label">POSITION</span>
            <span class="review-value">${activeJob.title}</span>
          </div>
          <div class="review-item">
            <span class="review-label">NAME</span>
            <span class="review-value ${formData.fullName ? '' : 'muted'}">${formData.fullName || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">EMAIL</span>
            <span class="review-value ${formData.email ? '' : 'muted'}">${formData.email || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">PHONE</span>
            <span class="review-value ${formData.phone ? '' : 'muted'}">${formData.phone || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">LINKEDIN</span>
            <span class="review-value ${formData.linkedin ? '' : 'muted'}">${formData.linkedin || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">RESUME</span>
            <span class="review-value ${formData.resumeName ? '' : 'muted'}">${formData.resumeName || 'Not uploaded'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">COVER LETTER</span>
            <span class="review-value ${formData.coverLetter ? '' : 'muted'}">${formData.coverLetter ? 'Provided' : 'Not provided'}</span>
          </div>
        </div>

        <div class="info-banner">
          <i data-lucide="alert-circle"></i>
          <span>You will receive automated email notifications regarding your interview schedule and status updates.</span>
        </div>
      </div>

      <div class="form-actions">
        <button class="cancel-btn" onclick="goToStep(3)">Back</button>
        <button class="submit-btn" onclick="submitApplication()">
          <i data-lucide="check-circle"></i> Submit Application
        </button>
      </div>
    `;
  }

  applicationView.innerHTML = `
    <button class="back-btn" onclick="closeApplication()">
      <i data-lucide="arrow-left"></i> Back to Job Board
    </button>

    <div class="app-header">
      <h2>Apply for ${activeJob.title}</h2>
      <p>${activeJob.category}</p>
    </div>

    ${stepContentHtml}
  `;

  lucide.createIcons();
}

// Helpers for state navigation
function saveStep1AndNext() {
  const nameEl = document.getElementById("input-fullname");
  const emailEl = document.getElementById("input-email");
  const phoneEl = document.getElementById("input-phone");
  const linkedinEl = document.getElementById("input-linkedin");

  if (nameEl) formData.fullName = nameEl.value;
  if (emailEl) formData.email = emailEl.value;
  if (phoneEl) formData.phone = phoneEl.value;
  if (linkedinEl) formData.linkedin = linkedinEl.value;

  goToStep(2);
}

function saveStep3AndNext() {
  const coverEl = document.getElementById("input-coverletter");
  if (coverEl) formData.coverLetter = coverEl.value;
  goToStep(4);
}

function handleFileUpload(e) {
  if (e.target.files && e.target.files[0]) {
    formData.resumeName = e.target.files[0].name;
    const titleEl = document.getElementById("upload-title");
    if (titleEl) titleEl.textContent = formData.resumeName;
  }
}

function goToStep(step) {
  currentStep = step;
  renderApplicationStep();
}

// Close Application View
function closeApplication() {
  switchView("job-board");
}

// Initial render
function loadJobs() {
  fetch('get_jobs.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      jobsData = result.data;
      resultsCountEl.querySelector('#job-count').textContent = jobsData.length;
      renderJobs();
    })
    .catch(error => console.error('Error loading jobs:', error));
}

loadJobs();

// Sidebar Collapse Logic
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

function submitApplication() {
  const submissionData = {
    jobTitle: activeJob.title,
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    linkedin: formData.linkedin,
    resumeName: formData.resumeName,
    coverLetter: formData.coverLetter
  };

  fetch('submit_application.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(submissionData)
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        applicationView.innerHTML = `
          <div style="text-align: center; padding: 60px 20px;">
            <div class="success-icon-circle">
              <i data-lucide="check"></i>
            </div>
            <h2>Application Submitted!</h2>
            <p class="success-message">Your application for <strong>${activeJob.title}</strong> has been received and saved to the database.</p>
            <button class="submit-btn" onclick="closeApplication()" style="display: inline-flex; align-items: center; gap: 8px;">
              <i data-lucide="arrow-left"></i> Back to Job Board
            </button>
          </div>
        `;
        lucide.createIcons();
        refreshNotifBadge();
      } else {
        alert("Error saving application: " + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert("An error occurred while connecting to the server.");
    });
}

// ================= MY PROFILE =================

let isEditingProfile = false;
let profileLoaded = false;

// Populated from the database via loadSessionProfile(). Fields not collected
// at registration (summary, skills, experience, education, resumeFile,
// portfolio) start empty until the candidate fills them in.
let profileData = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  portfolio: "",
  headline: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  resumeFile: ""
};

function getInitials(name) {
  return name
    .split(" ")
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Fetch the logged-in candidate's saved details and populate both the
// sidebar and the profile page. Redirects to login if no session exists.
function loadSessionProfile() {
  return fetch('get_profile.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        window.location.href = 'Candidate_login.html';
        return;
      }

      const c = result.data;
      profileData.fullName = `${c.first_name} ${c.last_name}`.trim();
      profileData.email = c.email || "";
      profileData.phone = c.phone || "";
      profileData.location = c.location || "";
      profileData.linkedin = c.linkedin_url || "";
      profileData.headline = c.professional_headline || "";
      profileLoaded = true;

      const initials = getInitials(profileData.fullName) || "?";
      document.getElementById('sidebar-avatar').textContent = initials;
      document.getElementById('sidebar-name').textContent = profileData.fullName;
      document.getElementById('sidebar-email').textContent = profileData.email;
    })
    .catch(error => {
      console.error('Error loading profile:', error);
    });
}

const sessionProfilePromise = loadSessionProfile();

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

function refreshNotifBadge() {
  fetch('get_notifications.php')
    .then(response => response.json())
    .then(result => {
      const badge = document.getElementById('notif-badge');
      if (!result.success) return;
      if (result.unread_count > 0) {
        badge.textContent = result.unread_count;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    })
    .catch(error => console.error('Error loading notification count:', error));
}

refreshNotifBadge();

function loadUserNotifications() {
  switchView('notifications');

  fetch('get_notifications.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        notificationsContainer.innerHTML = `<p class="notif-empty">Failed to load notifications.</p>`;
        return;
      }
      renderNotifications(result.data);
    })
    .catch(error => {
      console.error('Error loading notifications:', error);
    });
}

function renderNotifications(notifs) {
  const unreadCount = notifs.filter(n => !n.is_read).length;

  let html = `
    <div class="notif-header">
      <div>
        <h1>Notifications</h1>
        <p>${unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}</p>
      </div>
      ${unreadCount > 0 ? `
        <button class="notif-mark-all-btn" onclick="markAllNotificationsRead()">
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
              <button class="notif-action-btn" title="Mark as read" onclick="markNotificationRead(${notif.id})">
                <i data-lucide="check"></i>
              </button>
            ` : ""}
            <button class="notif-action-btn delete" title="Delete" onclick="deleteNotificationItem(${notif.id})">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;
    });
  }

  html += `</div>`;
  notificationsContainer.innerHTML = html;
  lucide.createIcons();
}

function markNotificationRead(id) {
  fetch('mark_notification_read.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(response => response.json())
    .then(() => {
      loadUserNotifications();
      refreshNotifBadge();
    })
    .catch(error => console.error('Error marking notification read:', error));
}

function markAllNotificationsRead() {
  fetch('mark_all_notifications_read.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
    .then(response => response.json())
    .then(() => {
      loadUserNotifications();
      refreshNotifBadge();
    })
    .catch(error => console.error('Error marking all notifications read:', error));
}

function deleteNotificationItem(id) {
  fetch('delete_notification.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(response => response.json())
    .then(() => {
      loadUserNotifications();
      refreshNotifBadge();
    })
    .catch(error => console.error('Error deleting notification:', error));
}

function loadUserProfile() {
  switchView('profile');
  renderProfileView();

  if (!profileLoaded) {
    sessionProfilePromise.then(() => renderProfileView());
  }
}

function renderProfileView() {
  const container = profileContainer;
  const p = profileData;

  container.innerHTML = `
    <div class="profile-view">
      <div class="profile-top">
        <div>
          <h1 class="profile-title">My Profile</h1>
          <p class="profile-subtitle">Manage your profile and resume for job applications</p>
        </div>
        <button class="profile-edit-btn ${isEditingProfile ? 'saving' : ''}" onclick="toggleProfileEdit()">
          <i data-lucide="${isEditingProfile ? 'save' : 'edit-3'}"></i>
          ${isEditingProfile ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <div class="profile-card profile-header-card">
        <div class="profile-avatar">${getInitials(p.fullName) || '?'}</div>
        <div class="profile-header-info">
          ${isEditingProfile
            ? `<input type="text" class="profile-input profile-name-input" value="${p.fullName}" oninput="profileData.fullName = this.value; document.querySelector('.profile-avatar').textContent = getInitials(this.value) || '?';">`
            : `<h2 class="profile-name">${p.fullName || (profileLoaded ? 'Unnamed candidate' : 'Loading...')}</h2>`}
          ${isEditingProfile
            ? `<input type="text" class="profile-input profile-headline-input" placeholder="e.g. Senior Frontend Engineer" value="${p.headline}" oninput="profileData.headline = this.value;">`
            : `<p class="profile-headline ${p.headline ? '' : 'muted'}">${p.headline || 'No headline added yet'}</p>`}
          <div class="profile-contact-row">
            ${p.email ? `<span><i data-lucide="mail"></i>${p.email}</span>` : ''}
            ${p.phone ? `<span><i data-lucide="phone"></i>${p.phone}</span>` : ''}
            ${p.location ? `<span><i data-lucide="map-pin"></i>${p.location}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="profile-grid">
        <div class="profile-main">
          <div class="profile-card">
            <h3>About</h3>
            ${isEditingProfile
              ? `<textarea class="profile-textarea" placeholder="Write a short summary about yourself..." oninput="profileData.summary = this.value;">${p.summary}</textarea>`
              : (p.summary
                  ? `<p class="profile-summary">${p.summary}</p>`
                  : `<p class="profile-empty">No summary added yet. Click Edit Profile to add one.</p>`)}
          </div>

          <div class="profile-card">
            <h3>Experience</h3>
            <div class="profile-list">
              ${p.experience.length > 0 ? p.experience.map(exp => `
                <div class="profile-list-item">
                  <div class="profile-list-icon"><i data-lucide="briefcase"></i></div>
                  <div>
                    <p class="profile-list-title">${exp.role}</p>
                    <p class="profile-list-subtitle">${exp.company} • ${exp.duration}</p>
                  </div>
                </div>
              `).join('') : `<p class="profile-empty">No experience added yet.</p>`}
            </div>
          </div>

          <div class="profile-card">
            <h3>Education</h3>
            <div class="profile-list">
              ${p.education.length > 0 ? p.education.map(edu => `
                <div class="profile-list-item">
                  <div class="profile-list-icon"><i data-lucide="graduation-cap"></i></div>
                  <div>
                    <p class="profile-list-title">${edu.degree}</p>
                    <p class="profile-list-subtitle">${edu.school} • ${edu.year}</p>
                  </div>
                </div>
              `).join('') : `<p class="profile-empty">No education added yet.</p>`}
            </div>
          </div>
        </div>

        <div class="profile-sidebar">
          <div class="profile-card">
            <h3>Resume</h3>
            <div class="resume-box">
              <i data-lucide="file-text" class="resume-icon"></i>
              <p class="resume-filename">${p.resumeFile || 'No resume uploaded yet'}</p>
              <div class="resume-actions">
                ${p.resumeFile ? `<button class="resume-link-btn">View</button><span class="resume-divider">•</span>` : ''}
                <button class="resume-link-btn"><i data-lucide="upload"></i>Update</button>
              </div>
            </div>
          </div>

          <div class="profile-card">
            <h3>Skills</h3>
            <div class="skills-wrap">
              ${p.skills.length > 0 ? p.skills.map(skill => `
                <span class="skill-tag">
                  ${skill}
                  ${isEditingProfile ? `<button onclick="removeProfileSkill('${skill}')"><i data-lucide="x"></i></button>` : ''}
                </span>
              `).join('') : (isEditingProfile ? '' : `<p class="profile-empty">No skills added yet.</p>`)}
            </div>
            ${isEditingProfile ? `
              <div class="skill-add-row">
                <input type="text" id="new-skill-input" placeholder="Add skill..." onkeydown="if(event.key==='Enter') addProfileSkill();">
                <button onclick="addProfileSkill()">Add</button>
              </div>
            ` : ''}
          </div>

          <div class="profile-card">
            <h3>Links</h3>
            <div class="profile-links">
              <div class="profile-link-row">
                <span>LinkedIn</span>
                ${isEditingProfile
                  ? `<input type="text" class="profile-input profile-link-input" placeholder="linkedin.com/in/you" value="${p.linkedin}" oninput="profileData.linkedin = this.value;">`
                  : (p.linkedin ? `<a href="#">${p.linkedin}</a>` : `<span class="profile-empty">Not added</span>`)}
              </div>
              <div class="profile-link-row">
                <span>Portfolio</span>
                ${isEditingProfile
                  ? `<input type="text" class="profile-input profile-link-input" placeholder="yoursite.dev" value="${p.portfolio}" oninput="profileData.portfolio = this.value;">`
                  : (p.portfolio ? `<a href="#">${p.portfolio}</a>` : `<span class="profile-empty">Not added</span>`)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

function toggleProfileEdit() {
  isEditingProfile = !isEditingProfile;
  renderProfileView();
}

function addProfileSkill() {
  const input = document.getElementById('new-skill-input');
  const value = input.value.trim();
  if (value && !profileData.skills.includes(value)) {
    profileData.skills.push(value);
  }
  renderProfileView();
}

function removeProfileSkill(skill) {
  profileData.skills = profileData.skills.filter(s => s !== skill);
  renderProfileView();
}

function loadUserApplications() {
  switchView('applications');

  fetch('get_applications.php')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const apps = data.data;

        if (apps.length === 0) {
          applicationsContainer.innerHTML = `
            <div style="padding: 40px; text-align: center;">
              <h2 class="app-list-heading">My Applications</h2>
              <p class="app-list-subheading">You haven't submitted any applications yet.</p>
            </div>
          `;
          return;
        }

        let appsHtml = `
          <div style="padding: 30px; width: 100%;">
            <h2 class="app-list-heading">My Applications</h2>
            <p class="app-list-subheading" style="margin-bottom: 24px;">Track the progress of your job applications</p>
        `;

        const interviewModeLabel = { video: 'Video Call', phone: 'Phone', onsite: 'Onsite' };

        apps.forEach(app => {
          const formattedDate = app.created_at ? app.created_at.split(' ')[0] : 'Recent';
          const iv = app.interview;

          let interviewHtml = '';
          if (iv) {
            const ivDate = new Date(`${iv.interview_date}T${iv.interview_time}`);
            const ivDateStr = isNaN(ivDate.getTime()) ? iv.interview_date : ivDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const ivTimeStr = isNaN(ivDate.getTime()) ? iv.interview_time : ivDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
            const isCompleted = iv.status === 'completed';

            let linkHtml = '';
            const isUrl = iv.meeting_link && /^https?:\/\//i.test(iv.meeting_link.trim());
            if (iv.mode === 'video' && isUrl && !isCompleted && !isNaN(ivDate.getTime())) {
              const joinOpensAt = new Date(ivDate.getTime() - 10 * 60 * 1000);
              const joinClosesAt = new Date(ivDate.getTime() + (iv.duration_minutes + 15) * 60 * 1000);
              const now = new Date();
              if (now >= joinOpensAt && now <= joinClosesAt) {
                linkHtml = `<a class="interview-join-btn" href="${iv.meeting_link.trim()}" target="_blank" rel="noopener noreferrer"><i data-lucide="video"></i> Join Meeting</a>`;
              } else if (now < joinOpensAt) {
                linkHtml = `<button class="interview-join-btn disabled" disabled><i data-lucide="video"></i> Join opens 10 min before</button>`;
              }
            } else if (iv.mode === 'onsite' && iv.meeting_link) {
              linkHtml = `<p class="interview-info-detail">${iv.meeting_link}</p>`;
            } else if (iv.mode === 'video' && iv.meeting_link && !isUrl) {
              linkHtml = `<p class="interview-info-detail">${iv.meeting_link}</p>`;
            }

            interviewHtml = `
              <div class="interview-info-box">
                <div class="interview-info-header">
                  <i data-lucide="${isCompleted ? 'check-circle' : 'calendar-clock'}"></i>
                  <span>${isCompleted ? 'Interview completed' : 'Interview scheduled'}</span>
                </div>
                <p class="interview-info-detail">${iv.interview_type} • ${ivDateStr} at ${ivTimeStr} (${iv.duration_minutes} min)</p>
                <p class="interview-info-detail">${interviewModeLabel[iv.mode] || iv.mode}${iv.interviewer ? ' with ' + iv.interviewer : ''}</p>
                ${linkHtml}
              </div>
            `;
          }

          appsHtml += `
            <div class="application-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h3>${app.job_title}</h3>
                  <p class="meta">TalentFlow Inc. • Applied on ${formattedDate}</p>
                </div>
                <span class="application-status-badge">Applied</span>
              </div>
              <div class="application-progress-row">
                <span class="application-progress-chip">
                  <i data-lucide="check"></i> Applied (${formattedDate})
                </span>
              </div>
              ${interviewHtml}
            </div>
          `;
        });

        appsHtml += `</div>`;
        applicationsContainer.innerHTML = appsHtml;
        lucide.createIcons();
      } else {
        alert("Failed to load applications.");
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}