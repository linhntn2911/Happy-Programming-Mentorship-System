import './app.css';
import { HomePage } from './pages/HomePage.js';
import { ComponentShowcasePage } from './pages/ComponentShowcasePage.js';
import { initializeMentorProfilePage, MentorProfilePage } from './pages/MentorProfilePage.js';
import { initializeMentorDashboardPage, MentorDashboardPage } from './pages/MentorDashboardPage.js';
import { mentorService } from './services/mentorService.js';

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
let cleanupCurrentPage = () => {};

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

function router() {
  cleanupCurrentPage();
  cleanupCurrentPage = () => {};
  const hash = window.location.hash;
  if (hash === '#/components' || hash === '#/showcase') {
    appEl.innerHTML = ComponentShowcasePage();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/mentor/profile') {
    appEl.innerHTML = MentorProfilePage();
    window.scrollTo({ top: 0, behavior: 'instant' });
    cleanupCurrentPage = initializeMentorProfilePage() || (() => {});
  } else if (hash === '#/mentor/dashboard') {
    appEl.innerHTML = MentorDashboardPage();
    window.scrollTo({ top: 0, behavior: 'instant' });
    cleanupCurrentPage = initializeMentorDashboardPage();
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
      if (!window.location.hash.startsWith('#/components')
          && !window.location.hash.startsWith('#/showcase')
          && window.location.hash !== '#/mentor/profile'
          && window.location.hash !== '#/mentor/dashboard') {
        renderApp(currentMentors);
      }
    }
  })
  .catch(err => {
    console.info('Using local catalog (backend API unreachable or offline):', err.message);
  });
