import { config } from './config.js';

export const $ = (s, root=document) => root.querySelector(s);
export const $$ = (s, root=document) => [...root.querySelectorAll(s)];
export const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeUrl = (s='') => { try { const u = new URL(s); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };

export async function api(path, options={}) {
  const r = await fetch(`${config.url}${path}`, {
    ...options,
    headers: { apikey: config.key, ...(options.headers || {}) },
    signal: options.signal || AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  return r.json();
}

export function initShell(active='') {
  const menu = $('.menu');
  const nav = $('#nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.textContent = open ? '×' : '☰';
    });
    $$('#nav a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.textContent = '☰';
    }));
  }
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === active));
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
}

export function projectCard(p) {
  const img = safeUrl(p.image_url);
  return `<a class="project-card" href="case-study.html?id=${encodeURIComponent(p.id)}">
    ${img ? `<img class="project-cover" src="${esc(img)}" alt="${esc(p.title)}" loading="lazy" width="900" height="640">` : `<div class="project-placeholder">${esc(p.client || p.title)}</div>`}
    <div class="project-meta"><div><p class="micro">${esc(p.category || 'Case study')} / ${esc(p.client || '')}</p><h3>${esc(p.title)}</h3></div><span>↗</span></div>
  </a>`;
}

export function proofCard(p) {
  const media = safeUrl(p.media_url);
  let mediaHtml = '';
  if (media && p.media_kind === 'image') mediaHtml = `<img class="proof-media" src="${esc(media)}" alt="${esc(p.title)}" loading="lazy">`;
  else if (media && p.media_kind === 'video') mediaHtml = `<video class="proof-media" src="${esc(media)}" controls preload="metadata"></video>`;
  else mediaHtml = `<div class="proof-visual"><span>${esc(p.proof_type)}</span><b>${esc(p.metric_value || 'Proof')}</b></div>`;
  return `<article class="proof-card">${mediaHtml}<div class="proof-copy"><p class="micro">${esc(p.client || 'Ecom Ventures')} / ${esc(p.proof_type)}</p><div class="proof-metric"><strong>${esc(p.metric_value || '')}</strong><span>${esc(p.metric_label || '')}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.summary || '')}</p>${p.project_id ? `<a class="text-link" href="case-study.html?id=${encodeURIComponent(p.project_id)}">Open related case study ↗</a>` : ''}</div></article>`;
}

export async function loadTeam(target='#team-list') {
  const el = $(target);
  if (!el) return;
  try {
    const team = await api('/rest/v1/ev_team?select=*&order=sort_order.asc');
    el.innerHTML = team.map((m, i) => {
      const ig = safeUrl(m.instagram_url);
      const inner = `<span class="avatar a${i+1}">${esc((m.name || '').split(' ').map(x=>x[0]).slice(0,2).join(''))}</span><div><h3>${esc(m.name)}</h3><p>${esc(m.role)}</p></div><span class="team-action">${ig ? 'Instagram ↗' : 'Instagram pending'}</span>`;
      return ig ? `<a class="team-row" href="${esc(ig)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="team-row muted-row">${inner}</div>`;
    }).join('');
  } catch {
    el.innerHTML = '<p class="empty-copy">Team profiles are temporarily unavailable.</p>';
  }
}

export function initInquiry(formSelector='#inquiry-form') {
  const form = $(formSelector);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    if (data.website_confirm) return;
    const button = form.querySelector('button[type=submit]');
    const status = $('#form-status');
    button.disabled = true;
    status.textContent = 'Sending your project brief...';
    try {
      const r = await fetch(`${config.url}/functions/v1/ecom-intake`, {
        method:'POST',
        headers:{'Content-Type':'application/json', apikey:config.key},
        body:JSON.stringify({type:'inquiry', ...data, consent:data.consent === 'on'}),
        signal:AbortSignal.timeout(15000)
      });
      if (!r.ok) throw new Error();
      status.textContent = 'Brief received. Ecom Ventures will reply using the contact details you shared.';
      form.reset();
    } catch {
      status.textContent = 'Brief was not sent. Please use Instagram or try again.';
    } finally {
      button.disabled = false;
    }
  });
}
