import { mountMentorProfile } from './pages/MentorProfilePage.js';
import { mountLogin } from './pages/LoginPage.js';
import { mountAdmin } from './pages/AdminPage.js';
import { mountMenteeSignup } from './pages/MenteeSignupPage.js';
import { mountAccount } from './pages/AccountPage.js';
import { mountMentorApplication } from './pages/MentorApplicationPage.js';
import { mountStaffMentorApplications } from './pages/StaffMentorApplicationsPage.js';
import { mountMonthlyMentorshipApplication } from './pages/MonthlyMentorshipApplicationPage.js';
import { mountWishlist } from './pages/WishlistPage.js';
import { bindAuthInfo } from './components/auth/LoginForm.js';
import './app.css';
import { HomePage } from './pages/HomePage.js';
import { ComponentShowcasePage } from './pages/ComponentShowcasePage.js';
import { MentorSearchPage } from './pages/MentorSearchPage.js';
import { DirectoryMentorCard } from './components/mentor/DirectoryMentorCard.js';
import { bindMentorPricingCardEvents } from './components/mentor/MentorPricingCard.js';
import { mentorService } from './services/mentorService.js';
import { authService } from './services/authService.js';
import { wishlistService } from './services/wishlistService.js';
import { bindUserDropdown } from './components/layout/Header.js';

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

function openMentorDirectory(keyword = '') {
  const url = new URL(window.location.href);
  url.search = '';
  const query = keyword.trim();
  if (query) url.searchParams.set('q', query);
  history.pushState(null, '', `${url.pathname}${url.search}#/mentors`);
  router();
}

const toDirectoryMentor = (mentor, index) => ({
  company: ['FPT Software', 'NashTech', 'VNG', 'Grab', 'KMS Technology', 'Tiki'][index] || 'Technology company',
  languages: ['Vietnamese', 'English'],
  country: index === 3 ? 'Singapore' : index === 4 ? 'United States' : 'Vietnam',
  yearsExperience: Number.parseInt(mentor.experience, 10) || 5,
  monthlyPrice: Number(String(mentor.monthly).replaceAll(',', '')) || 0,
  rating: [4.9, 4.8, 5, 4.7, 4.9, 4.6][index] || 4.8,
  reviewCount: [38, 24, 31, 19, 27, 16][index] || 12,
  acceptingMentees: index !== 3,
  ...mentor
});

function renderApp(mentors) {
  currentMentors = mentors;
  appEl.innerHTML = HomePage(mentors, authService.getCurrentUser());
  initInteractions();
}

function initInteractions() {
  const cards = [...document.querySelectorAll('.mentor-card')];
  const searchInputs = [...document.querySelectorAll('[data-search-input]')];
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

  async function hydrateSaved() {
    try {
      saved = new Set(await wishlistService.list());
      updateSavedButtons();
      filterCards();
    } catch (error) {
      if (error.status !== 401) toast(error.message || 'Unable to load your wishlist.');
    }
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
      openMentorDirectory(input ? input.value : '');
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
      saveBtn.addEventListener('click', async () => {
        if (!authService.getCurrentUser()) { toast('Please log in to save mentors to your wishlist.'); return; }
        const id = card.dataset.id;
        const removing = saved.has(id);
        saveBtn.disabled = true;
        try {
          if (removing) await wishlistService.remove(id); else await wishlistService.save(id);
          if (removing) saved.delete(id); else saved.add(id);
        } catch (error) { toast(error.message || 'Unable to update your wishlist.'); return; }
        finally { saveBtn.disabled = false; }
        updateSavedButtons();
        filterCards();
        toast(removing ? 'Mentor removed from your wishlist.' : 'Mentor saved to your wishlist.');
      });
    }
  });
  hydrateSaved();

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
      if (mentor) window.location.hash = `/mentors/${encodeURIComponent(mentor.id)}`;
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
  bindUserDropdown(appEl, () => {
    renderApp(currentMentors);
  });
}

let disposeAdmin;
function router() {
  disposeAdmin?.();
  disposeAdmin = undefined;
  const hash = window.location.hash;
  if (hash === '#/admin' || hash.startsWith('#/admin/')) {
    disposeAdmin = mountAdmin(appEl, hash.split('/')[2] || 'overview');
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/login' || hash.startsWith('#/login?')) {
    mountLogin(appEl);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/staff/mentor-applications') {
    mountStaffMentorApplications(appEl);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/wishlist') {
    mountWishlist(appEl, currentMentors);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/signup' || hash.startsWith('#/signup?') || hash === '#/signup/mentee') {
    mountMenteeSignup(appEl);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/apply/mentor' || hash.startsWith('#/apply/mentor') || hash === '#/signup/mentor') {
    mountMentorApplication(appEl);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash.startsWith('#/apply/monthly')) {
    const query = new URLSearchParams(hash.split('?')[1] || '');
    mountMonthlyMentorshipApplication(appEl, query.get('mentor') || '', query.get('name') || 'your mentor');
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/account') {
    mountAccount(appEl);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash.startsWith('#/mentors/')) {
    let id;
    try { id = decodeURIComponent(hash.slice('#/mentors/'.length)); } catch { id = ''; }
    mountMentorProfile(appEl, id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash === '#/components' || hash === '#/showcase') {
    appEl.innerHTML = ComponentShowcasePage();
    bindAuthInfo(appEl);
    appEl.querySelector('#login-form')?.addEventListener('submit', event => event.preventDefault());
    bindMentorPricingCardEvents(appEl);
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (hash.startsWith('#/mentors')) {
    const params = new URLSearchParams(window.location.search);
    const initialFilters = {
      q: params.get('q') || '', skills: params.getAll('skills'), categories: params.getAll('categories'),
      jobTitles: params.getAll('jobTitles'), companies: params.getAll('companies'),
      languages: params.getAll('languages'), countries: params.getAll('countries'),
      minExperience: params.get('minExperience') || '', minPrice: params.get('minPrice') || '', maxPrice: params.get('maxPrice') || '',
      minRating: params.get('minRating') || '', available: params.get('available') || '',
      sort: params.get('sort') || 'recommended'
    };
    appEl.innerHTML = MentorSearchPage(currentMentors.map(toDirectoryMentor), initialFilters);
    initMentorDirectory();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else {
    renderApp(currentMentors);
  }
}

function initMentorDirectory() {
  const form = document.querySelector('#directory-search');
  const panel = document.querySelector('#filter-panel');
  const results = document.querySelector('#mentor-results');
  const loading = document.querySelector('#directory-loading');
  const empty = document.querySelector('#directory-empty');
  const error = document.querySelector('#directory-error');
  const resultCount = document.querySelector('#result-count');
  const activeFilters = document.querySelector('#active-filters');
  const sort = document.querySelector('#sort');
  const mobileButton = document.querySelector('#mobile-filter-button');
  let requestNumber = 0;
  let toastTimer;

  const getFilters = () => ({
    q: document.querySelector('#directory-query')?.value.trim() || '',
    categories: [...document.querySelectorAll('input[name="categories"]:checked')].map(input => input.value),
    skills: [...document.querySelectorAll('input[name="skills"]:checked')].map(input => input.value),
    jobTitles: [...document.querySelectorAll('input[name="jobTitles"]:checked')].map(input => input.value),
    companies: [...document.querySelectorAll('input[name="companies"]:checked')].map(input => input.value),
    languages: [...document.querySelectorAll('input[name="languages"]:checked')].map(input => input.value),
    countries: [...document.querySelectorAll('input[name="countries"]:checked')].map(input => input.value),
    minExperience: document.querySelector('input[name="minExperience"]:checked')?.value || '',
    minPrice: document.querySelector('input[name="minPrice"]')?.value || '',
    maxPrice: document.querySelector('input[name="maxPrice"]')?.value || '',
    minRating: document.querySelector('input[name="minRating"]:checked')?.value || '',
    available: document.querySelector('input[name="available"]')?.checked || false,
    sort: sort?.value || 'recommended'
  });

  const filterLabels = filters => {
    const labels = [...filters.categories, ...filters.skills, ...filters.jobTitles, ...filters.companies, ...filters.languages, ...filters.countries];
    if (filters.q) labels.unshift(`Search: ${filters.q}`);
    if (filters.minExperience) labels.push(`${filters.minExperience}+ years`);
    if (filters.minPrice) labels.push(`From ${Number(filters.minPrice).toLocaleString('en-US')} VND`);
    if (filters.maxPrice) labels.push(`Up to ${Number(filters.maxPrice).toLocaleString('en-US')} VND`);
    if (filters.minRating) labels.push(`${filters.minRating}+ stars`);
    if (filters.available) labels.push('Available now');
    return labels;
  };

  function syncFilterSummary(filters) {
    const labels = filterLabels(filters);
    activeFilters.hidden = labels.length === 0;
    activeFilters.replaceChildren(...labels.map(label => {
      const chip = document.createElement('span');
      chip.className = 'active-filter';
      chip.textContent = label;
      return chip;
    }));
    const count = document.querySelector('#mobile-filter-count');
    if (count) count.textContent = labels.length ? `(${labels.length})` : '';
    const url = new URL(window.location.href);
    url.search = '';
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, item));
      else if (value !== '' && value !== false && !(key === 'sort' && value === 'recommended')) url.searchParams.set(key, value);
    });
    history.replaceState(null, '', `${url.pathname}${url.search}#/mentors`);
  }

  async function wireCards() {
    let saved = new Set();
    try { saved = new Set(await wishlistService.list()); } catch (error) { if (error.status !== 401) console.info('Wishlist unavailable:', error.message); }
    document.querySelectorAll('[data-mentor-id]').forEach(card => {
      const id = card.dataset.mentorId;
      const button = card.querySelector('[data-save]');
      button?.setAttribute('aria-pressed', String(saved.has(id)));
      button?.addEventListener('click', async () => {
        const user = authService.getCurrentUser();
        if (!user) { toast('Please log in to save mentors to your wishlist.'); return; }
        const removing = saved.has(id);
        button.disabled = true;
        try {
          if (removing) await wishlistService.remove(id); else await wishlistService.save(id);
          removing ? saved.delete(id) : saved.add(id);
        } catch (error) { toast(error.message || 'Unable to update your wishlist.'); return; }
        finally { button.disabled = false; }
        button.setAttribute('aria-pressed', String(saved.has(id)));
        const toast = document.querySelector('#toast');
        if (toast) {
          clearTimeout(toastTimer);
          toast.textContent = saved.has(id) ? 'Mentor saved to your wishlist.' : 'Mentor removed from your wishlist.';
          toast.hidden = false;
          toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
        }
      });
    });
  }

  async function search() {
    const activeRequest = ++requestNumber;
    const filters = getFilters();
    syncFilterSummary(filters);
    loading.hidden = false;
    results.hidden = true;
    empty.hidden = true;
    error.hidden = true;
    try {
      const mentors = await mentorService.searchMentors(filters);
      if (activeRequest !== requestNumber) return;
      results.innerHTML = mentors.map(DirectoryMentorCard).join('');
      results.hidden = mentors.length === 0;
      empty.hidden = mentors.length > 0;
      resultCount.textContent = `${mentors.length} mentor${mentors.length === 1 ? '' : 's'} found`;
      wireCards();
    } catch {
      if (activeRequest !== requestNumber) return;
      error.hidden = false;
      resultCount.textContent = 'Mentor search unavailable';
    } finally {
      if (activeRequest === requestNumber) loading.hidden = true;
    }
  }

  function clearFilters() {
    form.reset();
    form.querySelector('[name="q"]').value = '';
    panel.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
    panel.querySelectorAll('input[type="number"], input[type="search"]').forEach(input => { input.value = ''; });
    panel.querySelectorAll('.filter-option').forEach(option => { option.hidden = option.classList.contains('is-extra'); });
    panel.querySelectorAll('[data-show-options]').forEach(button => { button.setAttribute('aria-expanded', 'false'); button.textContent = 'Show more'; });
    sort.value = 'recommended';
    search();
  }

  form?.addEventListener('submit', event => { event.preventDefault(); search(); });
  panel?.addEventListener('change', () => { if (window.innerWidth >= 1024) search(); });
  sort?.addEventListener('change', search);
  document.querySelector('#clear-filters')?.addEventListener('click', clearFilters);
  document.querySelector('#empty-clear')?.addEventListener('click', clearFilters);
  document.querySelector('#retry-search')?.addEventListener('click', search);
  document.querySelector('#apply-mobile-filters')?.addEventListener('click', () => { panel.classList.remove('is-open'); mobileButton.setAttribute('aria-expanded', 'false'); search(); });
  mobileButton?.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    mobileButton.setAttribute('aria-expanded', String(open));
  });
  panel?.querySelectorAll('[data-option-search]').forEach(input => {
    input.addEventListener('input', () => {
      const term = input.value.trim().toLowerCase();
      panel.querySelectorAll(`[data-filter-options="${input.dataset.optionSearch}"] .filter-option`).forEach(option => {
        const expanded = panel.querySelector(`[data-show-options="${input.dataset.optionSearch}"]`)?.getAttribute('aria-expanded') === 'true';
        option.hidden = term ? !option.dataset.optionLabel.includes(term) : option.classList.contains('is-extra') && !expanded && !option.querySelector('input').checked;
      });
    });
  });
  panel?.querySelectorAll('[data-show-options]').forEach(button => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.textContent = expanded ? 'Show more' : 'Show less';
      const term = panel.querySelector(`[data-option-search="${button.dataset.showOptions}"]`)?.value.trim().toLowerCase() || '';
      panel.querySelectorAll(`[data-filter-options="${button.dataset.showOptions}"] .filter-option`).forEach(option => {
        option.hidden = term ? !option.dataset.optionLabel.includes(term) : expanded && option.classList.contains('is-extra') && !option.querySelector('input').checked;
      });
    });
  });
  wireCards();
  bindUserDropdown(appEl, () => router());
  if (filterLabels(getFilters()).length > 0 || getFilters().sort !== 'recommended') search();
}

// Browse-all navigation must clear query filters even on the current directory route.
document.addEventListener('click', event => {
  const link = event.target.closest?.('a[data-browse-all-mentors]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  event.preventDefault();
  openMentorDirectory();
});

window.addEventListener('hashchange', router);
window.addEventListener('popstate', router);

// Initial route
router();

// Revalidate session in background
authService.me().then(user => {
  if (user && (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#')) {
    renderApp(currentMentors);
  }
}).catch(() => {});

// Hydrate / fetch from Spring Boot REST API
mentorService
  .getFeaturedMentors()
  .then(res => {
    if (Array.isArray(res) && res.length > 0) {
      currentMentors = res;
      if (['#/admin', '#/mentors/', '#/login', '#/signup', '#/apply/', '#/staff/'].some(prefix => window.location.hash.startsWith(prefix)) || window.location.hash === '#/account' || window.location.hash === '#/wishlist') {
        if (window.location.hash === '#/wishlist') mountWishlist(appEl, currentMentors);
        return;
      }
      if (window.location.hash.startsWith('#/mentors')) {
        const params = new URLSearchParams(window.location.search);
        appEl.innerHTML = MentorSearchPage(currentMentors.map(toDirectoryMentor), {
          q: params.get('q') || '', skills: params.getAll('skills'), categories: params.getAll('categories'), minExperience: params.get('minExperience') || '',
          jobTitles: params.getAll('jobTitles'), companies: params.getAll('companies'), languages: params.getAll('languages'), countries: params.getAll('countries'),
          minPrice: params.get('minPrice') || '', maxPrice: params.get('maxPrice') || '', minRating: params.get('minRating') || '', available: params.get('available') || '',
          sort: params.get('sort') || 'recommended'
        });
        initMentorDirectory();
      } else if (!window.location.hash.startsWith('#/components') && !window.location.hash.startsWith('#/showcase')) {
        renderApp(currentMentors);
      }
    }
  })
  .catch(err => {
    console.info('Using local catalog (backend API unreachable or offline):', err.message);
  });
