import './app.css';
import { HomePage } from './pages/HomePage.js';
import { ComponentShowcasePage } from './pages/ComponentShowcasePage.js';
import { StaffDashboardPage } from './pages/StaffDashboardPage.js';
import { StaffMentorsPage } from './pages/StaffMentorsPage.js';
import { StaffMenteesPage } from './pages/StaffMenteesPage.js';
import { StaffApplicationsPage } from './pages/StaffApplicationsPage.js';
import { StaffAccessDeniedPage } from './pages/StaffAccessDeniedPage.js';
import { mentorService } from './services/mentorService.js';
import { staffService } from './services/staffService.js';
import { authService } from './services/authService.js';

const INITIAL_MENTORS = [
  {
    id: "minh-an",
    name: "Minh An Nguyen",
    initials: "MA",
    role: "Senior Backend Engineer",
    specialty: "Backend",
    experience: "6 years of experience",
    skills: ["Java", "Spring Boot", "SQL Server"],
    monthly: "2,500,000",
    session: "500,000",
    description: "Build a solid Java foundation, design better APIs, and turn your Spring Boot project into work you are proud to share.",
    portrait: "mentor-1.jpg"
  },
  {
    id: "thao-linh",
    name: "Thao Linh Tran",
    initials: "TL",
    role: "Senior Frontend Developer",
    specialty: "Frontend",
    experience: "5 years of experience",
    skills: ["React", "TypeScript", "Tailwind CSS"],
    monthly: "1,800,000",
    session: "400,000",
    description: "Go from your first component to a thoughtful web experience with practical feedback on React, accessibility, and your portfolio.",
    portrait: "mentor-2.jpg"
  },
  {
    id: "hoang-nam",
    name: "Hoang Nam Le",
    initials: "HN",
    role: "AI & Data Engineer",
    specialty: "AI & Data",
    experience: "7 years of experience",
    skills: ["Python", "Machine Learning", "SQL"],
    monthly: "2,800,000",
    session: "600,000",
    description: "Make sense of your data, understand your models, and build a machine learning project with a clear purpose and a realistic plan.",
    portrait: "mentor-3.jpg"
  },
  {
    id: "david-pham",
    name: "David Pham",
    initials: "DP",
    role: "Full-stack Developer",
    specialty: "Full-stack",
    experience: "8 years of experience",
    skills: ["JavaScript", "React", "Node.js"],
    monthly: "2,400,000",
    session: "500,000",
    description: "Connect frontend and backend with confidence. Work through architecture decisions and get hands-on feedback on your full-stack app.",
    portrait: "mentor-4.jpg"
  },
  {
    id: "sofia-tran",
    name: "Sofia Tran",
    initials: "ST",
    role: "Software Engineer",
    specialty: "Backend",
    experience: "5 years of experience",
    skills: ["Java", "System Design", "SQL"],
    monthly: "2,200,000",
    session: "450,000",
    description: "Strengthen your problem-solving skills, understand system design, and learn to explain the reasoning behind your technical decisions.",
    portrait: "mentor-5.jpg"
  },
  {
    id: "alex-nguyen",
    name: "Alex Nguyen",
    initials: "AN",
    role: "DevOps Engineer",
    specialty: "DevOps",
    experience: "6 years of experience",
    skills: ["Docker", "CI/CD", "Cloud"],
    monthly: "2,600,000",
    session: "550,000",
    description: "Take your project from a local setup to a reliable deployment. Learn containers, delivery pipelines, and practical cloud fundamentals.",
    portrait: "mentor-6.jpg"
  }
];

let currentMentors = [...INITIAL_MENTORS];
const appEl = document.querySelector('#app');

function renderApp(mentors) {
  currentMentors = mentors;
  appEl.innerHTML = HomePage(mentors);
  initInteractions();
}

function initInteractions() {
  const cards = [...document.querySelectorAll('.mentor-card')];
  const searchInputs = [...document.querySelectorAll('[data-search-input]')];
  const storageKey = 'hpms.homepage.saved-mentors.v1';
  let saved = new Set();
  let activeFilter = 'all';
  let query = '';
  let toastTimer;

  const normalize = value =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();

  const scrollBehavior = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

  function validSaved(value) {
    return Array.isArray(value) ? value.filter(id => cards.some(card => card.dataset.id === id)) : [];
  }

  try {
    saved = new Set(validSaved(JSON.parse(localStorage.getItem(storageKey) || '[]')));
  } catch {
    /* fallback to memory */
  }

  function toast(message) {
    const element = document.querySelector('#toast');
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(() => {
      element.hidden = true;
    }, 3500);
  }

  function syncInputs() {
    searchInputs.forEach(input => {
      input.value = query;
    });
  }

  function updateSavedButtons() {
    cards.forEach(card => {
      const isSaved = saved.has(card.dataset.id);
      const button = card.querySelector('[data-save]');
      if (button) {
        button.setAttribute('aria-pressed', String(isSaved));
        button.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save mentor'} ${card.dataset.name}`);
      }
    });
    const savedCountEl = document.querySelector('#saved-count');
    if (savedCountEl) savedCountEl.textContent = saved.size;
  }

  function filterCards() {
    let count = 0;
    const searchTerms = normalize(query).split(/\s+/).filter(Boolean);
    cards.forEach(card => {
      const values = normalize([card.dataset.name, card.dataset.skills, card.dataset.specialty, card.dataset.role].join(' '));
      const matchesFilter = activeFilter === 'all' || (activeFilter === 'saved' ? saved.has(card.dataset.id) : card.dataset.specialty === activeFilter);
      const visible = matchesFilter && searchTerms.every(term => values.includes(term));
      card.hidden = !visible;
      if (visible) count++;
    });

    const emptyResultsEl = document.querySelector('#empty-results');
    if (emptyResultsEl) emptyResultsEl.hidden = count > 0;

    const savedNoteEl = document.querySelector('#saved-note');
    if (savedNoteEl) savedNoteEl.hidden = activeFilter !== 'saved';

    const resultsStatusEl = document.querySelector('#results-status');
    if (resultsStatusEl) {
      resultsStatusEl.textContent = `${count} mentor${count === 1 ? '' : 's'}${query ? ` matching “${query}”` : ' to explore'}`;
    }
  }

  function showDiscovery() {
    const target = document.querySelector('#mentors');
    if (target) target.scrollIntoView({ behavior: scrollBehavior() });
  }

  function resetDiscovery() {
    activeFilter = 'all';
    query = '';
    syncInputs();
    filterCards();
    document.querySelectorAll('.cat-item').forEach(b => b.classList.remove('active'));
  }

  document.querySelectorAll('[data-search-form]').forEach(form =>
    form.addEventListener('submit', event => {
      event.preventDefault();
      const input = form.querySelector('[data-search-input]');
      query = input ? input.value.trim() : '';
      activeFilter = 'all';
      syncInputs();
      filterCards();
      showDiscovery();
    })
  );

  searchInputs.forEach(input =>
    input.addEventListener('input', () => {
      if (!input.value) {
        query = '';
        syncInputs();
        filterCards();
      }
    })
  );

  document.querySelectorAll('[data-quick-search]').forEach(button =>
    button.addEventListener('click', () => {
      query = button.dataset.quickSearch || '';
      activeFilter = 'all';
      syncInputs();
      filterCards();
      showDiscovery();
    })
  );

  const resetSearchBtn = document.querySelector('#reset-search');
  if (resetSearchBtn) resetSearchBtn.addEventListener('click', resetDiscovery);

  document.querySelectorAll('[data-reset-discovery]').forEach(link =>
    link.addEventListener('click', resetDiscovery)
  );

  cards.forEach(card => {
    const saveBtn = card.querySelector('[data-save]');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const id = card.dataset.id;
        const removing = saved.has(id);
        if (removing) saved.delete(id);
        else saved.add(id);
        let persistent = true;
        try {
          localStorage.setItem(storageKey, JSON.stringify([...saved]));
        } catch {
          persistent = false;
        }
        updateSavedButtons();
        filterCards();
        toast((removing ? 'Mentor removed from your saved list.' : 'Mentor saved to your favorites.') + (persistent ? '' : ' Saved for this visit only.'));
      });
    }
  });

  // Modal dialog handling
  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    }
  }

  document.querySelectorAll('[data-dialog]').forEach(button =>
    button.addEventListener('click', () => openDialog(button.dataset.dialog))
  );

  const loginNavBtn = document.querySelector('#login-nav-btn');
  if (loginNavBtn) {
    loginNavBtn.addEventListener('click', () => openDialog('login-dialog'));
  }

  const logoutBtn = document.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      authService.logout();
      toast('Signed out successfully.');
      if (window.location.hash.startsWith('#/staff')) {
        window.location.hash = '#/';
      } else {
        router();
      }
    });
  }

  // Real Login Modal Event Handlers
  const loginDialog = document.getElementById('login-dialog');
  if (loginDialog) {
    const loginForm = loginDialog.querySelector('#login-form');
    const togglePassBtn = loginDialog.querySelector('#toggle-password-btn');
    const passInput = loginDialog.querySelector('#login-password');
    const emailInput = loginDialog.querySelector('#login-email');

    if (togglePassBtn && passInput) {
      togglePassBtn.addEventListener('click', () => {
        const isPassword = passInput.type === 'password';
        passInput.type = isPassword ? 'text' : 'password';
        togglePassBtn.textContent = isPassword ? 'Hide' : 'Show';
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput ? emailInput.value : '';
        const password = passInput ? passInput.value : '';

        const user = authService.login(email, password);
        loginDialog.close();
        toast(`Signed in successfully as ${user.full_name} (${user.role_code}).`);
        window.location.hash = '#/';
        router();
      });
    }

    // Quick Login Demo Shortcuts
    const quickStaffBtn = loginDialog.querySelector('#quick-staff-btn');
    if (quickStaffBtn) {
      quickStaffBtn.addEventListener('click', () => {
        const user = authService.login('staff@happyprogramming.vn', 'Staff@123');
        loginDialog.close();
        toast(`Signed in as ${user.full_name} (${user.role_code}). Click 'Staff Portal' in header to access dashboard.`);
        window.location.hash = '#/';
        router();
      });
    }

    const quickMentorBtn = loginDialog.querySelector('#quick-mentor-btn');
    if (quickMentorBtn) {
      quickMentorBtn.addEventListener('click', () => {
        const user = authService.login('an.nguyen@example.com', 'Mentor@123');
        loginDialog.close();
        toast(`Signed in as ${user.full_name} (${user.role_code}).`);
        window.location.hash = '#/';
        router();
      });
    }

    const quickMenteeBtn = loginDialog.querySelector('#quick-mentee-btn');
    if (quickMenteeBtn) {
      quickMenteeBtn.addEventListener('click', () => {
        const user = authService.login('khoa.pham@example.com', 'Mentee@123');
        loginDialog.close();
        toast(`Signed in as ${user.full_name} (${user.role_code}).`);
        window.location.hash = '#/';
        router();
      });
    }
  }

  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button =>
      button.addEventListener('click', () => dialog.close())
    );
    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
    });
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
      ) {
        dialog.close();
      }
    });
  });

  const goMentorsBtn = document.querySelector('[data-go-mentors]');
  if (goMentorsBtn) {
    goMentorsBtn.addEventListener('click', () => {
      resetDiscovery();
      showDiscovery();
    });
  }

  function showMentorModal(mentor) {
    const titleEl = document.querySelector('#mentor-dialog-title');
    const roleEl = document.querySelector('#mentor-dialog-role');
    const descEl = document.querySelector('#mentor-dialog-description');
    const monthlyEl = document.querySelector('#mentor-dialog-monthly');
    const sessionEl = document.querySelector('#mentor-dialog-session');
    const skillsEl = document.querySelector('#mentor-dialog-skills');

    if (titleEl) titleEl.textContent = mentor.name;
    if (roleEl) roleEl.textContent = `${mentor.role} · ${mentor.experience}`;
    if (descEl) descEl.textContent = mentor.description;
    if (monthlyEl) monthlyEl.textContent = `${mentor.monthly} VND`;
    if (sessionEl) sessionEl.textContent = `${mentor.session} VND`;
    if (skillsEl) {
      skillsEl.replaceChildren(
        ...(mentor.skills || []).map(skill => {
          const tag = document.createElement('span');
          tag.className = 'tag';
          tag.textContent = skill;
          return tag;
        })
      );
    }
    openDialog('mentor-dialog');
  }

  document.querySelectorAll('[data-mentor-id]').forEach(button =>
    button.addEventListener('click', () => {
      const mentor = currentMentors.find(m => m.id === button.dataset.mentorId);
      if (mentor) showMentorModal(mentor);
    })
  );

  // Spotlight rail controls
  const rail = document.querySelector('#spotlight-rail');
  const prev = document.querySelector('#rail-prev');
  const next = document.querySelector('#rail-next');
  if (rail && prev && next) {
    function updateRail() {
      prev.disabled = rail.scrollLeft <= 1;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    }
    prev.addEventListener('click', () => rail.scrollBy({ left: -270, behavior: scrollBehavior() }));
    next.addEventListener('click', () => rail.scrollBy({ left: 270, behavior: scrollBehavior() }));
    rail.addEventListener('scroll', updateRail, { passive: true });
    new ResizeObserver(updateRail).observe(rail);
    updateRail();
  }

  // MentorCruise Category Bar Scroll & Interaction
  const catTrack = document.querySelector('#cat-scroll-track');
  const catLeft = document.querySelector('#cat-scroll-left');
  const catRight = document.querySelector('#cat-scroll-right');
  const catItems = document.querySelectorAll('.cat-item');

  function updateCategoryScroll() {
    if (!catTrack || !catLeft || !catRight) return;
    const scrollLeft = catTrack.scrollLeft;
    const maxScroll = catTrack.scrollWidth - catTrack.clientWidth;
    if (scrollLeft > 10) {
      catLeft.classList.remove('hidden');
    } else {
      catLeft.classList.add('hidden');
    }
    if (scrollLeft < maxScroll - 10) {
      catRight.classList.remove('hidden');
    } else {
      catRight.classList.add('hidden');
    }
  }

  if (catTrack && catLeft && catRight) {
    catLeft.addEventListener('click', () => {
      catTrack.scrollBy({ left: -260, behavior: scrollBehavior() });
    });
    catRight.addEventListener('click', () => {
      catTrack.scrollBy({ left: 260, behavior: scrollBehavior() });
    });
    catTrack.addEventListener('scroll', updateCategoryScroll, { passive: true });
    window.addEventListener('resize', updateCategoryScroll);
    setTimeout(updateCategoryScroll, 100);
  }

  catItems.forEach(item => {
    item.addEventListener('click', () => {
      catItems.forEach(b => b.classList.remove('active'));
      item.classList.add('active');
    });
  });

  updateSavedButtons();
  filterCards();
}

let currentAppTab = 'PENDING';
let cachedApplications = [];

function renderApplicationModal(app) {
  const content = document.getElementById('app-review-dialog-content');
  const dialog = document.getElementById('app-review-dialog');
  if (!content || !dialog) return;

  content.innerHTML = `
    <div class="p-6 bg-white text-[#25143f]">
      <div class="flex items-center justify-between border-b border-[#e8e0f1] pb-4 mb-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-extrabold">${app.applicantName}</h2>
            <span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#f1e8ff] text-[#8b46e8]">${app.specialty}</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">Application ID: ${app.id} · Submitted on ${app.submittedDate}</p>
        </div>
        <button id="close-app-dialog" class="text-slate-400 hover:text-slate-600 font-bold text-lg px-2 py-1">✕</button>
      </div>

      <div class="space-y-4 text-sm">
        <div class="grid grid-cols-2 gap-4 bg-[#fbf9ff] p-4 rounded-xl border border-[#e8e0f1]">
          <div><span class="text-xs text-slate-400 font-bold block">EMAIL</span><span class="font-semibold">${app.email}</span></div>
          <div><span class="text-xs text-slate-400 font-bold block">PHONE</span><span class="font-semibold">${app.phone || 'N/A'}</span></div>
          <div><span class="text-xs text-slate-400 font-bold block">EXPERIENCE</span><span class="font-semibold">${app.experienceYears} Years</span></div>
          <div><span class="text-xs text-slate-400 font-bold block">STATUS</span><span class="font-bold text-amber-600">${app.status}</span></div>
        </div>

        <div>
          <span class="text-xs text-slate-400 font-bold block mb-1">BIOGRAPHY & PHILOSOPHY</span>
          <p class="text-xs leading-relaxed text-slate-700 bg-white p-3 rounded-xl border border-[#e8e0f1]">${app.bio || 'N/A'}</p>
        </div>

        <div>
          <span class="text-xs text-slate-400 font-bold block mb-1">TARGET TEACHING SKILLS</span>
          <div class="flex flex-wrap gap-1.5">
            ${(app.skills || []).map(s => `<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#f1e8ff] text-[#8b46e8]">${s}</span>`).join('')}
          </div>
        </div>

        <div class="bg-[#f1e8ff]/50 border border-[#8b46e8]/30 rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#8b46e8] text-white flex items-center justify-center text-xs font-bold">PDF</div>
              <div>
                <div class="font-bold text-sm text-[#25143f]">${app.cvFileName || 'Mentor_CV.pdf'}</div>
                <div class="text-xs text-slate-500">${app.cvFileSize || '3.4 MB'} · Validated PDF Document (GB-25)</div>
              </div>
            </div>
            <a href="#" onclick="alert('Viewing PDF document: ${app.cvFileName || 'Mentor_CV.pdf'}'); return false;" class="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white text-[#8b46e8] border border-[#8b46e8]/30 hover:bg-[#8b46e8] hover:text-white transition-colors">
              Preview / Download PDF
            </a>
          </div>
        </div>

        ${app.reviewNote ? `
          <div class="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800">
            <strong>Review Note:</strong> ${app.reviewNote}
          </div>
        ` : ''}
      </div>

      <div class="mt-6 pt-4 border-t border-[#e8e0f1] flex items-center justify-between">
        <button id="close-app-dialog-btn" class="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">
          Close
        </button>
        ${app.status === 'PENDING' ? `
          <div class="flex items-center gap-3">
            <button id="reject-app-btn" class="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-colors">
              Reject Application
            </button>
            <button id="approve-app-btn" class="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors">
              Approve & Promote to Mentor ✓
            </button>
          </div>
        ` : `
          <div class="text-xs font-bold text-slate-500">Status: ${app.status}</div>
        `}
      </div>
    </div>
  `;

  if (typeof dialog.showModal === 'function') dialog.showModal();

  document.getElementById('close-app-dialog')?.addEventListener('click', () => dialog.close());
  document.getElementById('close-app-dialog-btn')?.addEventListener('click', () => dialog.close());

  document.getElementById('approve-app-btn')?.addEventListener('click', async () => {
    await staffService.approveApplication(app.id);
    dialog.close();
    alert(`Mentor application ${app.id} (${app.applicantName}) has been APPROVED! User promoted to MENTOR role.`);
    router();
  });

  document.getElementById('reject-app-btn')?.addEventListener('click', async () => {
    const reason = prompt('Enter rejection reason for applicant:', 'Uploaded CV does not meet required practical experience.');
    if (reason !== null) {
      await staffService.rejectApplication(app.id, reason);
      dialog.close();
      alert(`Mentor application ${app.id} (${app.applicantName}) has been REJECTED.`);
      router();
    }
  });
}

function bindApplicationEvents() {
  document.querySelectorAll('[data-app-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentAppTab = btn.dataset.appTab;
      router();
    });
  });

  document.querySelectorAll('[data-review-app]').forEach(btn => {
    btn.addEventListener('click', () => {
      const app = cachedApplications.find(a => a.id === btn.dataset.reviewApp);
      if (app) renderApplicationModal(app);
    });
  });
}

function router() {
  const hash = window.location.hash;
  const currentUser = authService.getCurrentUser();

  // Guard for /staff/* routes: Only STAFF and ADMIN roles permitted
  if (hash.startsWith('#/staff')) {
    if (!authService.isStaff()) {
      appEl.innerHTML = StaffAccessDeniedPage(currentUser);
      window.scrollTo({ top: 0, behavior: 'instant' });

      document.getElementById('open-staff-login-btn')?.addEventListener('click', () => {
        const dialog = document.getElementById('login-dialog');
        if (dialog && typeof dialog.showModal === 'function') {
          dialog.showModal();
          const emailInput = dialog.querySelector('#login-email');
          if (emailInput) emailInput.value = 'staff@happyprogramming.vn';
          const passInput = dialog.querySelector('#login-password');
          if (passInput) passInput.value = 'Staff@123';
        }
      });
      return;
    }
  }

  if (hash === '#/components' || hash === '#/showcase') {
    appEl.innerHTML = ComponentShowcasePage();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/staff/mentors') {
    appEl.innerHTML = StaffMentorsPage([]);
    window.scrollTo({ top: 0, behavior: 'instant' });
    staffService.getMentors().then(data => {
      if (window.location.hash === '#/staff/mentors') {
        appEl.innerHTML = StaffMentorsPage(data);
      }
    });
  } else if (hash === '#/staff/mentees') {
    appEl.innerHTML = StaffMenteesPage([]);
    window.scrollTo({ top: 0, behavior: 'instant' });
    staffService.getMentees().then(data => {
      if (window.location.hash === '#/staff/mentees') {
        appEl.innerHTML = StaffMenteesPage(data);
      }
    });
  } else if (hash === '#/staff/mentor-applications') {
    appEl.innerHTML = StaffApplicationsPage(cachedApplications, currentAppTab);
    window.scrollTo({ top: 0, behavior: 'instant' });
    bindApplicationEvents();

    staffService.getApplications().then(apps => {
      cachedApplications = apps;
      if (window.location.hash === '#/staff/mentor-applications') {
        appEl.innerHTML = StaffApplicationsPage(cachedApplications, currentAppTab);
        bindApplicationEvents();
      }
    });
  } else if (hash.startsWith('#/staff')) {
    appEl.innerHTML = StaffDashboardPage({});
    window.scrollTo({ top: 0, behavior: 'instant' });
    staffService.getDashboard().then(data => {
      if (window.location.hash === '#/staff' || window.location.hash === '#/staff/dashboard') {
        appEl.innerHTML = StaffDashboardPage(data);
      }
    }).catch(err => {
      console.warn('Staff dashboard API offline, using cached fallback:', err.message);
    });
  } else {
    renderApp(currentMentors);
  }
}

window.addEventListener('hashchange', router);

// Initial route
router();

// Hydrate / fetch from Spring Boot REST API
mentorService
  .getFeaturedMentors()
  .then(res => {
    if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
      currentMentors = res.data;
      if (!window.location.hash.startsWith('#/components') && !window.location.hash.startsWith('#/showcase')) {
        renderApp(currentMentors);
      }
    }
  })
  .catch(err => {
    console.info('Using local catalog (backend API unreachable or offline):', err.message);
  });
