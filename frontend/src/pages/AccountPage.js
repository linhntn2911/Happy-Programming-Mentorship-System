import { authService } from '../services/authService.js';
import { profileService } from '../services/profileService.js';
import { TextInput } from '../components/ui/Input.js';
import { BrowseAllMentorsLink } from '../components/ui/BrowseAllMentorsLink.js';
import { renderUserDropdown, bindUserDropdown, getInitials, renderNotificationBell } from '../components/layout/Header.js';

const fields = ['firstName', 'lastName', 'bio', 'experienceLevel', 'learningGoals', 'githubUrl', 'portfolioUrl'];
const controlClass = 'w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const area = (name, label, max, hint) => `<div class="space-y-1.5"><label for="${name}" class="block text-xs font-semibold text-ink">${label}</label><textarea id="${name}" name="${name}" rows="4" maxlength="${max}" class="${controlClass}" aria-describedby="${name}-hint"></textarea><p id="${name}-hint" class="text-xs text-muted">${hint} Up to ${max} characters.</p></div>`;
const header = user => `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-6"><a href="#/" class="flex items-center gap-2.5" aria-label="HappyProgramming home"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span><span class="font-semibold text-ink">Happy<span class="text-brand">Programming</span></span></a><nav class="flex items-center gap-6" aria-label="Main navigation">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({currentUser: user, displayName: user.name || user.email, initials: getInitials(user.name || user.email)})}</nav></div></header>`;

export async function mountAccount(root) {
  document.title = 'My profile | HappyProgramming';
  root.innerHTML = '<main class="min-h-screen bg-cream"><div class="container py-16"><p role="status" id="profile-loading">Loading your profile…</p></div></main>';
  const loading = root.querySelector('#profile-loading');
  let user, saved;
  try {
    user = await authService.me();
    saved = await profileService.get();
  } catch (error) {
    if (!loading.isConnected) return;
    if (error.status === 401) { location.hash = '#/login'; return; }
    loading.textContent = error.message;
    loading.insertAdjacentHTML('afterend', '<button type="button" id="profile-retry" class="btn btn-primary mt-5">Try again</button><a href="#/" class="btn btn-outline mt-5 ml-3">Back to homepage</a>');
    root.querySelector('#profile-retry').onclick = () => mountAccount(root);
    return;
  }
  if (!loading.isConnected) return;
  root.innerHTML = `${header(user)}<main class="min-h-screen bg-cream"><div class="container max-w-5xl py-12">
    <p class="eyebrow">YOUR ACCOUNT</p><h1 class="mt-3 font-display text-4xl text-ink">My profile</h1><p class="mt-3 text-sm text-muted">A little about you, and where you want to go next.</p>
    <div class="mt-8 grid grid-cols-[260px_1fr] items-start gap-7">
      <aside class="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div id="profile-avatar" class="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-lilac text-3xl font-semibold text-brand"></div>
        <h2 id="profile-display-name" class="mt-4 text-center font-semibold text-ink break-words"></h2><p class="mt-1 text-center text-xs text-muted">Mentee profile</p>
        <div class="mt-6 space-y-3"><label for="avatar-file" class="block text-xs font-semibold">Profile photo</label><input id="avatar-file" type="file" accept="image/png,image/jpeg" class="block w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-lilac file:px-3 file:py-2 file:text-brand" aria-describedby="avatar-help"><p id="avatar-help" class="text-xs leading-5 text-muted">PNG or JPEG. Maximum 2 MB and 2048 × 2048 pixels. Photos save separately.</p><button id="avatar-remove" type="button" class="btn btn-outline btn-sm w-full">Remove photo</button><p id="avatar-feedback" role="status" class="text-xs leading-5 text-muted"></p></div>
      </aside>
      <form id="profile-form" class="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h2 class="text-lg font-semibold">Personal information</h2><p class="mt-1 text-xs text-muted">Keep your details up to date.</p>
        <div class="mt-6 grid grid-cols-2 gap-5">${TextInput({name:'firstName',label:'First name',required:true,maxLength:75,autocomplete:'given-name'})}${TextInput({name:'lastName',label:'Last name',required:true,maxLength:75,autocomplete:'family-name'})}</div>
        <div class="mt-5"><label for="profile-email" class="block text-xs font-semibold">Email address</label><input id="profile-email" type="email" readonly class="${controlClass} mt-1.5 bg-cream" aria-describedby="email-help"><p id="email-help" class="mt-1.5 text-xs text-muted">Your sign-in email cannot be changed here.</p></div>
        <div class="mt-5">${area('bio','About you',1000,'Share your background and interests.')}</div>
        <div class="my-7 border-t border-line"></div><h2 class="text-lg font-semibold">Your learning journey</h2>
        <div class="mt-5 space-y-5"><div><label for="experienceLevel" class="mb-1.5 block text-xs font-semibold">Experience level</label><select id="experienceLevel" name="experienceLevel" class="${controlClass}"><option value="">Select your level (optional)</option><option value="BEGINNER">Beginner</option><option value="FRESHER">Fresher</option><option value="JUNIOR">Junior</option><option value="MID">Mid-level</option><option value="SENIOR">Senior</option></select></div>
        ${area('learningGoals','Learning goals',2000,'What would you like to achieve with mentorship?')}
        ${TextInput({name:'githubUrl',label:'GitHub profile',type:'url',placeholder:'https://github.com/your-username',maxLength:500})}
        ${TextInput({name:'portfolioUrl',label:'Portfolio website',type:'url',placeholder:'https://your-portfolio.com',maxLength:500})}</div>
        <p id="profile-feedback" class="mt-6 text-sm text-muted" role="status" aria-live="polite"></p><div class="mt-5 flex justify-end gap-3 border-t border-line pt-6"><button type="button" id="profile-cancel" class="btn btn-outline">Cancel</button><button type="submit" id="profile-save" class="btn btn-primary">Save changes</button></div>
      </form>
    </div></div></main>`;
  bindUserDropdown(root);
  const form = root.querySelector('#profile-form');
  const feedback = root.querySelector('#profile-feedback');
  const photoFeedback = root.querySelector('#avatar-feedback');
  const fileInput = root.querySelector('#avatar-file');
  const remove = root.querySelector('#avatar-remove');
  const fill = () => {
    for (const key of fields) form.elements[key].value = saved[key] || '';
    root.querySelector('#profile-email').value = saved.email;
  };
  const renderIdentity = () => {
    const name = [saved.firstName, saved.lastName].filter(Boolean).join(' ') || user.name || 'Your profile';
    root.querySelector('#profile-display-name').textContent = name;
    const avatar = root.querySelector('#profile-avatar');
    avatar.replaceChildren();
    avatar.textContent = getInitials(name);
    if (saved.hasAvatar) {
      const img = new Image(); img.alt = 'Your profile photo'; img.className = 'h-full w-full object-cover';
      img.onload = () => { if (avatar.isConnected) avatar.replaceChildren(img); };
      img.src = `/api/profile/me/avatar?v=${Date.now()}`;
    }
    remove.disabled = !saved.hasAvatar;
  };
  const setBusy = busy => {
    form.querySelectorAll('input, textarea, select, button').forEach(control => { control.disabled = busy; });
    fileInput.disabled = busy;
    remove.disabled = busy || !saved.hasAvatar;
  };
  fill(); renderIdentity();
  root.querySelector('#profile-cancel').onclick = () => { fill(); feedback.textContent = 'Unsaved changes discarded.'; };
  form.onsubmit = async event => {
    event.preventDefault();
    const save = root.querySelector('#profile-save'), cancel = root.querySelector('#profile-cancel');
    setBusy(true); save.textContent = 'Saving…'; feedback.textContent = '';
    const data = Object.fromEntries(fields.map(key => [key, form.elements[key].value.trim()]));
    try {
      const result = await profileService.save(data);
      if (!form.isConnected) return;
      saved = result; fill(); renderIdentity();
      user = {...user, name: `${saved.firstName} ${saved.lastName}`}; authService.setCurrentUser(user);
      root.querySelectorAll('.user-menu-trigger').forEach(trigger => {
        trigger.setAttribute('aria-label', `User menu for ${user.name}`);
        const spans = trigger.querySelectorAll('span'); spans[0].textContent = getInitials(user.name); spans[1].textContent = user.name;
      });
      feedback.textContent = 'Your profile has been saved.';
    } catch (error) { if (form.isConnected) feedback.textContent = error.message; }
    finally { setBusy(false); save.textContent = 'Save changes'; }
  };
  const photoAction = async action => {
    setBusy(true); photoFeedback.textContent = 'Saving photo…';
    try {
      const result = await action();
      if (!form.isConnected) return;
      saved.hasAvatar = result.hasAvatar; renderIdentity(); photoFeedback.textContent = 'Profile photo updated.';
    } catch (error) { if (form.isConnected) photoFeedback.textContent = error.message; }
    finally { fileInput.value = ''; setBusy(false); }
  };
  fileInput.onchange = () => {
    const file = fileInput.files[0]; if (!file) return;
    if (!['image/png','image/jpeg'].includes(file.type) || file.size > 2*1024*1024) { photoFeedback.textContent = 'Choose a PNG or JPEG image up to 2 MB.'; fileInput.value = ''; return; }
    photoAction(async () => {
      const base64 = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(new Error('Unable to read this image.')); reader.readAsDataURL(file); });
      return profileService.upload(base64);
    });
  };
  remove.onclick = () => photoAction(() => profileService.removeAvatar());
}
