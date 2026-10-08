import { Button } from '../components/ui/Button.js';
import { StatCard, StatusBadge, DataTable, Notice } from '../components/ui/AdminPrimitives.js';
import { LoginForm } from '../components/auth/LoginForm.js';
import { MenteeSignupForm } from '../components/auth/MenteeSignupForm.js';
import { Badge, TopicPill } from '../components/ui/Badge.js';
import { SearchForm, TextInput } from '../components/ui/Input.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { MentorCard } from '../components/mentor/MentorCard.js';
import { DashboardMetricCard } from '../components/mentor/DashboardMetricCard.js';
import { MentorPricingCard } from '../components/mentor/MentorPricingCard.js';

export function ComponentShowcasePage() {
  const sampleMentor = {
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
  };

  return `
<header class="border-b border-line bg-white sticky top-0 z-30">
  <div class="container flex min-h-[72px] items-center justify-between gap-5">
    <a href="#/" class="flex items-center gap-2.5">
      <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-lg font-bold text-white">{h}</span>
      <span class="text-[16px] font-semibold text-ink">Happy<span class="text-brand">Programming</span></span>
      <span class="ml-2 rounded bg-lilac px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">UI Kit</span>
    </a>
    <a href="#/" class="btn btn-outline btn-sm">← Back to Homepage</a>
  </div>
</header>

<main class="pb-24">
  <section class="hero-shell relative overflow-hidden py-14 sm:py-18">
    <div class="container relative z-10 max-w-3xl text-center">
      <p class="eyebrow">EDUTEACH-INSPIRED UI KIT</p>
      <h1 class="section-title mt-4">One visual language for every page.</h1>
      <p class="section-copy mx-auto mt-4 max-w-2xl">Use these canonical components when building new screens. The rounded controls, lilac surfaces, and vibrant purple primary actions come from the EduTeach design language, adapted to HappyProgramming.</p>
    </div>
  </section>

  <div class="container space-y-16 py-14">
    <section aria-label="Administration components">
      <h2 class="section-title">Administration</h2>
      ${Notice({ message: 'Sample administration components' })}
      ${StatCard({ label: 'Accounts', value: 0, note: 'Sample metric' })}
      ${DataTable({ caption: 'Account states', headings: ['Status'], rows: [[StatusBadge('ACTIVE')]] })}
    </section>
    <!-- 1. Color Palette Tokens -->
    <section aria-labelledby="colors-title">
      <p class="eyebrow">TOKENS</p>
      <h2 id="colors-title" class="section-title mt-2">Color Palette</h2>
      <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <div class="rounded-xl border border-line bg-white p-4 text-center shadow-xs">
          <div class="mx-auto h-12 w-12 rounded-lg bg-[#8b46e8] shadow-sm"></div>
          <p class="mt-3 text-xs font-bold text-ink">Primary</p>
          <code class="text-[10px] text-muted">#8b46e8</code>
        </div>
        <div class="rounded-xl border border-line bg-white p-4 text-center shadow-xs">
          <div class="mx-auto h-12 w-12 rounded-lg bg-[#7431d0] shadow-sm"></div>
          <p class="mt-3 text-xs font-bold text-ink">Dark Purple</p>
          <code class="text-[10px] text-muted">#7431d0</code>
        </div>
        <div class="rounded-xl border border-line bg-white p-4 text-center shadow-xs">
          <div class="mx-auto h-12 w-12 rounded-lg bg-[#25143f] shadow-sm"></div>
          <p class="mt-3 text-xs font-bold text-ink">Ink</p>
          <code class="text-[10px] text-muted">#25143f</code>
        </div>
        <div class="rounded-xl border border-line bg-white p-4 text-center shadow-xs">
          <div class="mx-auto h-12 w-12 rounded-lg bg-[#f1e8ff] border border-brand/20 shadow-sm"></div>
          <p class="mt-3 text-xs font-bold text-ink">Lilac</p>
          <code class="text-[10px] text-muted">#f1e8ff</code>
        </div>
        <div class="rounded-xl border border-line bg-white p-4 text-center shadow-xs">
          <div class="mx-auto h-12 w-12 rounded-lg bg-[#fbf9ff] border border-line shadow-sm"></div>
          <p class="mt-3 text-xs font-bold text-ink">Cream</p>
          <code class="text-[10px] text-muted">#fbf9ff</code>
        </div>
        <div class="rounded-xl border border-line bg-white p-4 text-center shadow-xs">
          <div class="mx-auto h-12 w-12 rounded-lg bg-[#e8e0f1] shadow-sm"></div>
          <p class="mt-3 text-xs font-bold text-ink">Border Line</p>
          <code class="text-[10px] text-muted">#e8e0f1</code>
        </div>
        <div class="rounded-xl border border-line bg-white p-4 text-center shadow-xs">
          <div class="mx-auto h-12 w-12 rounded-lg bg-[#746c7e] shadow-sm"></div>
          <p class="mt-3 text-xs font-bold text-ink">Muted</p>
          <code class="text-[10px] text-muted">#746c7e</code>
        </div>
      </div>
    </section>

    <!-- 2. Buttons -->
    <section aria-labelledby="buttons-title">
      <p class="eyebrow">ACTIONS</p>
      <h2 id="buttons-title" class="section-title mt-2">Buttons</h2>
      <div class="mt-6 space-y-6 rounded-2xl border border-line bg-white p-8">
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Variants</p>
          <div class="flex flex-wrap items-center gap-3">
            ${Button({ label: 'Primary action', variant: 'primary' })}
            ${Button({ label: 'Secondary action', variant: 'secondary' })}
            ${Button({ label: 'Outline action', variant: 'outline' })}
            ${Button({ label: 'Ghost action', variant: 'ghost' })}
            ${Button({ label: 'Danger action', variant: 'danger' })}
            ${Button({ label: 'Disabled action', variant: 'primary', disabled: true })}
          </div>
        </div>
        <div class="border-t border-line pt-6">
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Sizes & Shapes</p>
          <div class="flex flex-wrap items-center gap-3">
            ${Button({ label: 'Small button', variant: 'primary', size: 'sm' })}
            ${Button({ label: 'Default button', variant: 'primary', size: 'md' })}
            ${Button({ label: 'Large button', variant: 'primary', size: 'lg' })}
            <button class="btn btn-primary btn-pill">Pill shape</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Form Controls & Inputs -->
    <section aria-labelledby="forms-title">
      <p class="eyebrow">FORMS & SEARCH</p>
      <h2 id="forms-title" class="section-title mt-2">Inputs & Controls</h2>
      <div class="mt-6 space-y-6 rounded-2xl border border-line bg-white p-8">
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Hero Search Form</p>
          ${SearchForm({ placeholder: 'Search by skill, name or role', buttonText: 'Find mentors' })}
        </div>
        <div class="grid gap-4 sm:grid-cols-2 pt-6 border-t border-line">
          ${TextInput({ label: 'Full Name', name: 'fullname', placeholder: 'Nguyen Van A', value: 'Nguyen Van A' })}
          ${TextInput({ label: 'Email Address', name: 'email', placeholder: 'user@example.com', required: true })}
          ${TextInput({ label: 'Hourly Rate (VND)', name: 'rate', placeholder: '500,000' })}
          ${TextInput({ label: 'Account Username', name: 'username', placeholder: 'username', error: 'This username is already taken.' })}
        </div>
      </div>
    </section>

    <!-- 4. Badges, Tags & Topic Pills -->
    <section aria-labelledby="badges-title">
      <p class="eyebrow">TAGS & LABELS</p>
      <h2 id="badges-title" class="section-title mt-2">Badges & Pills</h2>
      <div class="mt-6 rounded-2xl border border-line bg-white p-8 space-y-6">
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Status Badges</p>
          <div class="flex flex-wrap gap-2.5 items-center">
            ${Badge({ text: 'Active Mentor', variant: 'brand' })}
            ${Badge({ text: '7-day trial', variant: 'lilac' })}
            ${Badge({ text: 'Completed', variant: 'gray' })}
            <span class="tag">Java</span>
            <span class="tag">Spring Boot</span>
            <span class="tag">TypeScript</span>
          </div>
        </div>
        <div class="border-t border-line pt-6">
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Topic Pills (Quick Search)</p>
          <div class="flex flex-wrap gap-2">
            ${TopicPill({ text: 'Java & Spring Boot' })}
            ${TopicPill({ text: 'Frontend Development' })}
            ${TopicPill({ text: 'Python & Data' })}
            ${TopicPill({ text: 'System Design' })}
            ${TopicPill({ text: 'Full-stack Development' })}
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="dashboard-metrics-title">
      <p class="eyebrow">MENTOR DASHBOARD</p>
      <h2 id="dashboard-metrics-title" class="section-title mt-2">Summary metric cards</h2>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${DashboardMetricCard({
          label: 'Net earnings',
          value: '₫1,250,000',
          description: 'Lifetime after successful refunds and payment commission.',
          icon: '₫',
        })}
        ${DashboardMetricCard({
          label: 'Pending invitations',
          value: '3',
          description: 'Requests waiting for a decision within the 48-hour SLA.',
          icon: '⌛',
        })}
        ${DashboardMetricCard({
          label: 'Average rating',
          value: 'No published reviews',
          description: '0 published reviews.',
          icon: '★',
        })}
      </div>
    </section>

    <!-- Cards & Pricing Plans -->
    <section aria-labelledby="cards-title">
      <p class="eyebrow">CARDS & PACKAGES</p>
      <h2 id="cards-title" class="section-title mt-2">Mentor Card & Pricing Plans</h2>
      <p class="section-copy mt-2 max-w-2xl">Interactive cards for mentor discovery and monthly mentorship tiers (Lite, Standard, Pro) with free trial, call scheduling and one-off session options.</p>
      <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wider text-muted mb-4">Catalog Mentor Card</h3>
          <div class="max-w-sm">
            ${MentorCard(sampleMentor)}
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wider text-muted mb-4">Mentorship Package Tier Card (Lite / Standard / Pro)</h3>
          ${MentorPricingCard({
            mentorName: sampleMentor.name,
            mentorSlug: sampleMentor.id,
            oneOffPrice: sampleMentor.session,
            currencyMode: 'VND'
          })}
        </div>
      </div>
    </section>

    <section aria-labelledby="login-preview-title">
      <p class="eyebrow">AUTHENTICATION</p>
      <h2 id="login-preview-title" class="section-title mt-2">Login & Sign up Forms</h2>
      <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wider text-muted mb-4">Login Form</h3>
          <div class="auth-panel rounded-2xl border border-line bg-white p-6">${LoginForm({ preview: true })}</div>
        </div>
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wider text-muted mb-4">Mentee Sign Up Form</h3>
          <div class="auth-panel rounded-2xl border border-line bg-white p-6">${MenteeSignupForm({ preview: true })}</div>
        </div>
      </div>
    </section>
    <!-- 6. Empty States & Feedback -->
    <section aria-labelledby="feedback-title">
      <p class="eyebrow">FEEDBACK</p>
      <h2 id="feedback-title" class="section-title mt-2">Empty State & Alerts</h2>
      <div class="mt-6">
        ${EmptyState({
          title: 'No mentors found just yet',
          description: 'Try another skill or clear your filters to explore again.',
          buttonText: 'Clear filters',
          hidden: false
        })}
      </div>
    </section>
  </div>
</main>
  `;
}
