const { $, $$, h, esc, busy, toast, download, store, md } = Kit;

/* ---------------- state ---------------- */
const uid = () => Math.random().toString(36).slice(2, 10);
let S = store.get('state', null);
const save = () => store.set('state', S);
if (!S) {
  const t = Date.now(), r1 = uid(), r2 = uid();
  const generic = DEMO.resume;
  const tailored = DEMO.resume.replace('Software developer with 3 years of experience building web applications.', 'Frontend engineer with 3 years building React and TypeScript products, including a design system used by 4 teams.').replace('- Worked on improving database queries.\n', '').replace('- Helped migrate REST APIs', '- Migrated REST APIs');
  S = {
    resumes: [{ id: r1, name: 'General (sample)', text: generic, created: t - 30 * 864e5, updated: t - 30 * 864e5 }, { id: r2, name: 'Frontend-tailored (sample)', text: tailored, created: t - 3 * 864e5, updated: t - 3 * 864e5 }],
    active: r2,
    jobs: [
      { id: uid(), title: 'Senior Frontend Engineer', company: 'Fintech Platform', jd: DEMO.jd, status: 'interview', notes: 'Phone screen went well. Onsite next week.', created: t - 12 * 864e5, updated: t - 2 * 864e5 },
      { id: uid(), title: 'React Developer', company: 'Globex', jd: 'React Developer — Globex\nRequirements\n- React, Redux, TypeScript\n- REST APIs and GraphQL\n- Jest and Cypress testing\n- Agile/Scrum teams', status: 'applied', notes: '', created: t - 20 * 864e5, updated: t - 20 * 864e5 },
      { id: uid(), title: 'Full-stack Engineer', company: 'Initech', jd: 'Full-stack Engineer at Initech\nRequirements\n- Node.js, Express, PostgreSQL\n- React front end\n- AWS, Docker, CI/CD\n- System design for distributed systems', status: 'saved', notes: 'Referral from Sam.', created: t - 1 * 864e5, updated: t - 1 * 864e5 },
      { id: uid(), title: 'UI Engineer', company: 'Hooli', jd: 'UI Engineer — Hooli\nRequirements\n- Design systems, accessibility (WCAG)\n- TypeScript, React, Storybook', status: 'rejected', notes: 'Wanted 5+ years.', created: t - 25 * 864e5, updated: t - 9 * 864e5 },
    ],
    letters: [],
  };
  S.letters.push({ id: uid(), jobId: S.jobs[0].id, title: 'Fintech Platform: confident', text: DEMO.letter, created: t - 2 * 864e5 });
  save();
}
const activeResume = () => S.resumes.find((r) => r.id === S.active) || S.resumes[0];
const jobById = (id) => S.jobs.find((j) => j.id === id);
const scoreColor = (v) => (v >= 75 ? 'var(--good)' : v >= 55 ? 'var(--warn)' : 'var(--bad)');

/* ---------------- analyze ---------------- */
let last = null;
function gauge(pct) {
  const r = 46, c = Math.PI * r, col = scoreColor(pct);
  return `<svg width="120" height="72" viewBox="0 0 120 72" role="img" aria-label="Coverage ${pct}%"><path d="M14 64 A46 46 0 0 1 106 64" fill="none" stroke="var(--line)" stroke-width="12" stroke-linecap="round"/><path d="M14 64 A46 46 0 0 1 106 64" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * pct) / 100} ${c}"/><text x="60" y="60" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text)">${pct}%</text></svg>`;
}
function fillSelectors() {
  const rs = $('#aResume'), js = $('#aJob');
  rs.innerHTML = S.resumes.map((r) => `<option value="${r.id}" ${r.id === S.active ? 'selected' : ''}>${esc(r.name)}</option>`).join('');
  js.innerHTML = '<option value="">(paste a job)</option>' + S.jobs.map((j) => `<option value="${j.id}">${esc(j.title)}${j.company ? ' · ' + esc(j.company) : ''}</option>`).join('');
  $('#lJob').innerHTML = '<option value="">(current Analyze inputs)</option>' + S.jobs.map((j) => `<option value="${j.id}">${esc(j.title)}${j.company ? ' · ' + esc(j.company) : ''}</option>`).join('');
}
$('#aResume').onchange = (e) => { S.active = e.target.value; save(); $('#resume').value = activeResume().text; };
$('#aJob').onchange = (e) => { const j = jobById(e.target.value); if (j) { $('#jd').value = j.jd; analyze(); } };
function analyze() {
  const resume = $('#resume').value, jd = $('#jd').value;
  if (resume.length < 100 || jd.length < 60) return toast('Paste both a resume and a job description', 'err');
  const m = matchJob(resume, jd);
  const bl = bullets(resume).map((b) => ({ b, ...lintBullet(b) }));
  const secs = sections(resume);
  last = { resume, jd, ...m, bl };
  const j = jobById($('#aJob').value);
  if (j) { j.match = m.pct; save(); }
  $('#results').classList.remove('hidden');
  $('#gauge').innerHTML = gauge(m.pct);
  $('#covNote').innerHTML = `${m.kws.filter((x) => x.hit).length}/${m.kws.length} weighted keywords found. ${m.pct < 60 ? 'Aim for 60–80%. Work the <b style="color:var(--bad)">red</b> ones in where they are true.' : 'Solid coverage. Make sure the top keywords also show up in your bullets.'}`;
  $('#keywords').innerHTML = m.kws.map((x) => `<span class="chip ${x.hit ? 'hit' : 'miss'}">${esc(x.k)}<small>${x.w}</small></span>`).join('');
  const avg = bl.length ? Math.round(bl.reduce((a, x) => a + x.score, 0) / bl.length) : 0;
  $('#bulletSummary').innerHTML = `<div class="stat" style="margin-top:8px"><div class="v">${avg}<span class="small muted">/100</span></div><div class="k">${bl.length} bullets · ${bl.filter((x) => /\d|%|\$/.test(x.b)).length} quantified</div></div><div class="bar" style="margin-top:10px"><span style="width:${avg}%"></span></div>`;
  $('#sections').innerHTML = ['Summary', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications'].map((s) => `<span class="tag ${secs[s] ? 'good' : ''}">${s}</span>`).join('');
  const box = $('#bullets');
  box.innerHTML = '';
  if (!bl.length) box.append(h('div', { class: 'empty' }, 'No bullets found. Start bullet lines with "-" or "•".'));
  bl.forEach((x) => {
    const out = h('div');
    box.append(h('div', { class: 'bl' },
      h('div', { class: 'sc', style: `background:${scoreColor(x.score)}` }, x.score),
      h('div', {}, h('div', {}, x.b), h('div', { class: 'flags' }, x.flags.map(([k, t]) => h('span', { class: 'tag ' + k }, t))), out),
      h('button', { class: 'btn sm ghost', title: 'AI rewrite', onclick: (e) => busy(e.currentTarget, () => rewrite(x.b, out)) }, 'Rewrite')));
  });
}
const missing = () => last.missing.slice(0, 10).join(', ');
async function rewrite(b, out) {
  const r = await AI.chat([
    { role: 'system', content: 'You are a top resume writer. Rewrite the bullet 3 ways: strong action verb first, a concrete outcome, XYZ format ("Accomplished X as measured by Y by doing Z"), max 28 words. NEVER invent numbers. Use placeholders like [X%] or [N users] where a metric is needed. Weave in relevant job keywords only if plausible. Return JSON {"variants":["","",""],"tip":"one sentence"}.' },
    { role: 'user', content: `Bullet: ${b}\nJob keywords not yet covered: ${missing()}\nJob description (excerpt): ${last.jd.slice(0, 1500)}` },
  ], { json: true, temperature: 0.7, demo: { variants: [`Built ${b.replace(/^(helped|worked on|responsible for)\s*/i, '').replace(/\.$/, '')}, cutting [X%] of manual effort for [N] users.`, `Delivered ${b.split(' ').slice(1, 6).join(' ')}… in [N] weeks, improving [metric] by [X%] through automated testing.`, `Owned end-to-end ${b.split(' ').slice(-4).join(' ').replace(/\.$/, '')}, partnering with [team] to ship to [N] customers.`], tip: 'Replace every [placeholder] with a real number. Even an estimate ("~30%") beats no metric. (demo)' } });
  out.innerHTML = '';
  out.append(h('div', { class: 'rewrite' }, h('b', {}, 'Rewrites'), h('ol', {}, (r.variants || []).map((v) => h('li', {}, v, ' ', h('button', { class: 'btn sm ghost', title: 'Use this in the resume', onclick: () => { $('#resume').value = $('#resume').value.replace(b, v); analyze(); toast('Bullet replaced. Save it as a new version when you are happy.'); } }, 'use')))), r.tip ? h('div', { class: 'small muted', style: 'margin-top:6px' }, 'Tip: ' + r.tip) : null));
}
async function review() {
  if (!last) analyze();
  const r = await AI.chat([
    { role: 'system', content: 'You are a blunt but kind senior technical recruiter screening a resume against a job. Return JSON {"fit_score":0-100,"verdict":"one sentence","strengths":["..."],"gaps":["..."],"red_flags":["..."],"top_edits":["specific edit 1","2","3"]}. 2-4 items per list. Be specific and reference the resume.' },
    { role: 'user', content: `JOB:\n${last.jd.slice(0, 5000)}\n\nRESUME:\n${last.resume.slice(0, 7000)}\n\nKeyword coverage computed locally: ${last.pct}%. Missing: ${missing()}` },
  ], { json: true, temperature: 0.3, demo: DEMO.review });
  const list = (t, xs) => `<div class="stat"><div class="k">${t}</div><ul>${(xs || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  $('#review').innerHTML = `<div class="row" style="margin-bottom:12px"><span class="tag accent" style="font-size:15px">Fit ${r.fit_score}/100</span><b>${esc(r.verdict)}</b></div>
    <div class="review-grid">${list('Strengths', r.strengths)}${list('Gaps', r.gaps)}${list('Red flags', r.red_flags)}</div>
    <div class="stat" style="margin-top:12px"><div class="k">Top 3 edits</div><ol style="margin:6px 0 0;padding-left:18px">${(r.top_edits || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
}
async function summary() {
  if (!last) analyze();
  const t = await AI.chat([
    { role: 'system', content: 'Write a 3-sentence resume summary tailored to the job. First sentence: identity + years + specialty. Second: 1-2 proof points from the resume. Third: what they bring to THIS role. No clichés, no first person, nothing not supported by the resume.' },
    { role: 'user', content: `JOB:\n${last.jd.slice(0, 4000)}\n\nRESUME:\n${last.resume.slice(0, 6000)}` },
  ], { temperature: 0.5, demo: DEMO.summary });
  $('#summary').innerHTML = md(t);
}
async function readPDF(file) {
  const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let out = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    let lastY = null;
    tc.items.forEach((it) => { const y = Math.round(it.transform[5]); if (lastY !== null && Math.abs(y - lastY) > 3) out += '\n'; out += it.str + (it.hasEOL ? '\n' : ''); lastY = y; });
    out += '\n';
  }
  return out.replace(/\n{3,}/g, '\n\n').replace(/^\s*[●•▪]\s*/gm, '- ');
}
$('#file').onchange = (e) => busy(null, async () => {
  const f = e.target.files[0];
  if (!f) return;
  $('#resume').value = /\.pdf$/i.test(f.name) ? await readPDF(f) : await f.text();
  toast('Loaded ' + f.name + '. Save it as a version to keep it.');
  e.target.value = '';
});
$('#analyze').onclick = analyze;
$('#reviewBtn').onclick = (e) => busy(e.currentTarget, review);
$('#summaryBtn').onclick = (e) => busy(e.currentTarget, summary);
$$('#results .tabs button').forEach((b) => (b.onclick = () => {
  $$('#results .tabs button').forEach((x) => x.classList.toggle('on', x === b));
  ['review', 'summary'].forEach((k) => $('#t-' + k).classList.toggle('hidden', k !== b.dataset.t));
}));
$('#saveResumeVer').onclick = () => {
  const name = prompt('Name this version', `${activeResume().name.replace(/ \(sample\)$/, '')} v${S.resumes.length + 1}`);
  if (!name) return;
  const r = { id: uid(), name, text: $('#resume').value, created: Date.now(), updated: Date.now() };
  S.resumes.push(r); S.active = r.id; save(); fillSelectors(); toast('Saved version “' + name + '”');
};
$('#saveJob').onclick = () => {
  const jd = $('#jd').value.trim();
  if (jd.length < 60) return toast('Paste a job description first', 'err');
  const meta = guessJobMeta(jd);
  const j = { id: uid(), ...meta, jd, status: 'saved', notes: '', created: Date.now(), updated: Date.now(), match: last ? last.pct : null };
  S.jobs.push(j); save(); fillSelectors(); $('#aJob').value = j.id; toast(`Added “${j.title}” to the tracker`);
};

/* ---------------- resumes ---------------- */
let selResume = null;
function renderResumes() {
  selResume = selResume && S.resumes.find((r) => r.id === selResume) ? selResume : S.active;
  const list = $('#resumeList');
  list.innerHTML = '';
  S.resumes.slice().sort((a, b) => b.updated - a.updated).forEach((r) => {
    const q = resumeQuality(r.text);
    list.append(h('div', { class: 'ver' + (r.id === selResume ? ' on' : ''), onclick: () => { selResume = r.id; renderResumes(); } },
      h('div', { class: 'sc', style: `background:${scoreColor(q.score)}` }, q.score),
      h('div', { class: 'grow' }, h('b', {}, r.name), r.id === S.active ? h('span', { class: 'tag accent', style: 'margin-left:6px' }, 'active') : null, h('div', { class: 'small muted' }, `${q.words} words · ${q.bullets} bullets · ${new Date(r.updated).toLocaleDateString()}`))));
  });
  const r = S.resumes.find((x) => x.id === selResume);
  const q = resumeQuality(r.text);
  const ta = h('textarea', { rows: 14, class: 'mono', spellcheck: 'false' }); ta.value = r.text;
  $('#resumeDetail').innerHTML = '';
  $('#resumeDetail').append(
    h('div', { class: 'row between' }, h('h2', { style: 'margin:0' }, r.name), h('div', { class: 'row' },
      h('button', { class: 'btn sm primary', onclick: () => { S.active = r.id; save(); fillSelectors(); $('#resume').value = r.text; Router.go('analyze'); } }, 'Use in Analyze'),
      h('button', { class: 'btn sm', onclick: () => { const n = prompt('Rename', r.name); if (n) { r.name = n; save(); renderResumes(); } } }, 'Rename'),
      h('button', { class: 'btn sm', onclick: () => { const c = { ...r, id: uid(), name: r.name + ' (copy)', created: Date.now(), updated: Date.now() }; S.resumes.push(c); selResume = c.id; save(); renderResumes(); } }, 'Duplicate'),
      h('button', { class: 'btn sm', onclick: () => download(r.name.replace(/\W+/g, '_') + '.txt', r.text) }, 'Download'),
      S.resumes.length > 1 ? h('button', { class: 'btn sm ghost danger', onclick: () => { if (confirm('Delete this version?')) { S.resumes = S.resumes.filter((x) => x !== r); if (S.active === r.id) S.active = S.resumes[0].id; selResume = null; save(); renderResumes(); fillSelectors(); } } }, 'Delete') : null)),
    h('div', { class: 'grid cols-3' }, q.parts.map(([k, v, max]) => h('div', { class: 'stat' }, h('div', { class: 'k' }, k), h('div', { class: 'v', style: 'font-size:17px' }, `${v}/${max}`)))),
    ta,
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { r.text = ta.value; r.updated = Date.now(); save(); renderResumes(); toast('Saved'); } }, 'Save changes'),
      h('span', { class: 'small muted' }, 'Scores are job-independent: bullet quality, sections, contact details, length and quantification.')));
  const opts = S.resumes.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  const a = $('#cmpA'), b = $('#cmpB'), va = a.value, vb = b.value;
  a.innerHTML = opts; b.innerHTML = opts;
  a.value = S.resumes.some((x) => x.id === va) ? va : S.resumes[0].id;
  b.value = S.resumes.some((x) => x.id === vb) ? vb : S.resumes[S.resumes.length - 1].id;
  renderCompare();
}
function renderCompare() {
  const A = S.resumes.find((x) => x.id === $('#cmpA').value), B = S.resumes.find((x) => x.id === $('#cmpB').value);
  if (!A || !B) return;
  const d = diffLines(A.text, B.text), qa = resumeQuality(A.text).score, qb = resumeQuality(B.text).score;
  const adds = d.filter((x) => x.op === 'add').length, dels = d.filter((x) => x.op === 'del').length;
  const job = jobById($('#aJob').value) || S.jobs[0];
  const ma = job ? matchJob(A.text, job.jd).pct : null, mb = job ? matchJob(B.text, job.jd).pct : null;
  $('#cmpOut').innerHTML = `<div class="row small" style="margin-bottom:8px"><span class="tag good">+${adds} lines</span><span class="tag bad">−${dels} lines</span><span>Quality ${qa} → <b>${qb}</b></span>${job ? `<span>Match vs “${esc(job.title)}”: ${ma}% → <b>${mb}%</b></span>` : ''}</div>
    <div class="diff">${d.map((x) => `<div class="${x.op}">${x.op === 'add' ? '+ ' : x.op === 'del' ? '- ' : '  '}${esc(x.text) || '&nbsp;'}</div>`).join('')}</div>`;
}
$('#cmpA').onchange = renderCompare;
$('#cmpB').onchange = renderCompare;
$('#newResume').onclick = () => { const r = { id: uid(), name: 'New version', text: activeResume().text, created: Date.now(), updated: Date.now() }; S.resumes.push(r); selResume = r.id; save(); renderResumes(); fillSelectors(); };

/* ---------------- jobs ---------------- */
let selJob = null;
function renderJobs() {
  const t = Date.now(), st = pipelineStats(S.jobs, t);
  $('#pipeSummary').textContent = `${S.jobs.length} jobs tracked${st.stale ? ` · ${st.stale} application${st.stale > 1 ? 's' : ''} with no update in 2+ weeks` : ''}.`;
  $('#pipeKpis').innerHTML = [['Applied', st.applied], ['Interviews', st.by.interview], ['Offers', st.by.offer], ['Response rate', st.responseRate == null ? '—' : Math.round(st.responseRate * 100) + '%']].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  const board = $('#board');
  board.innerHTML = '';
  STAGES.forEach((stage) => {
    const col = h('div', { class: 'col', 'data-stage': stage }, h('h3', {}, h('span', {}, stage[0].toUpperCase() + stage.slice(1)), h('span', { class: 'muted' }, S.jobs.filter((j) => j.status === stage).length)));
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('over'); const j = jobById(e.dataTransfer.getData('text/plain')); if (j && j.status !== stage) { j.status = stage; j.updated = Date.now(); save(); renderJobs(); } });
    S.jobs.filter((j) => j.status === stage).sort((a, b) => b.updated - a.updated).forEach((j) => {
      if (j.match == null) j.match = matchJob(activeResume().text, j.jd).pct;
      const days = Math.floor((t - j.updated) / 864e5);
      col.append(h('div', { class: 'job', draggable: 'true', ondragstart: (e) => e.dataTransfer.setData('text/plain', j.id), onclick: () => { selJob = j.id; renderJobDetail(); } },
        h('b', {}, j.title), h('span', { class: 'muted' }, j.company || ''),
        h('div', { class: 'meta' }, h('span', { style: `color:${scoreColor(j.match)}` }, `${j.match}% match`), h('span', {}, days ? `${days}d ago` : 'today'))));
    });
    board.append(col);
  });
  save();
  renderJobDetail();
}
function renderJobDetail() {
  const box = $('#jobDetail'), j = jobById(selJob);
  if (!j) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const f = (k, label, el = 'input') => { const x = h(el, { class: el === 'input' ? 'input' : '', rows: el === 'textarea' ? 6 : null }); x.value = j[k] || ''; x.dataset.k = k; return h('label', {}, label, x); };
  const m = matchJob(activeResume().text, j.jd);
  box.innerHTML = '';
  box.append(h('div', { class: 'row between' }, h('h2', { style: 'margin:0' }, `${j.title}${j.company ? ' · ' + j.company : ''}`), h('button', { class: 'btn ghost sm', onclick: () => { selJob = null; renderJobDetail(); } }, 'Close')),
    h('div', { class: 'grid cols-3' }, f('title', 'Title'), f('company', 'Company'), f('url', 'Posting URL')),
    h('div', { class: 'grid cols-2' }, h('label', {}, 'Status', h('select', { 'data-k': 'status' }, STAGES.map((s) => h('option', { value: s, selected: j.status === s }, s)))), f('contact', 'Contact')),
    f('notes', 'Notes', 'textarea'), f('jd', 'Job description', 'textarea'),
    h('div', { class: 'small' }, `Match with “${activeResume().name}”: `, h('b', { style: `color:${scoreColor(m.pct)}` }, m.pct + '%'), m.missing.length ? ` · missing: ${m.missing.slice(0, 8).join(', ')}` : ''),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => { $$('#jobDetail [data-k]').forEach((x) => { j[x.dataset.k] = x.value; }); j.updated = Date.now(); j.match = matchJob(activeResume().text, j.jd).pct; save(); renderJobs(); fillSelectors(); toast('Saved'); } }, 'Save'),
      h('button', { class: 'btn', onclick: () => { fillSelectors(); $('#aJob').value = j.id; $('#jd').value = j.jd; $('#resume').value = activeResume().text; Router.go('analyze'); analyze(); } }, 'Analyze match'),
      h('button', { class: 'btn', onclick: () => { fillSelectors(); $('#lJob').value = j.id; Router.go('letters'); } }, 'Write cover letter'),
      h('button', { class: 'btn ghost danger', onclick: () => { if (confirm('Remove this job?')) { S.jobs = S.jobs.filter((x) => x !== j); selJob = null; save(); renderJobs(); fillSelectors(); } } }, 'Delete')));
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('#newJob').onclick = () => { const j = { id: uid(), title: 'New role', company: '', jd: '', status: 'saved', notes: '', created: Date.now(), updated: Date.now(), match: 0 }; S.jobs.push(j); selJob = j.id; save(); renderJobs(); };

/* ---------------- letters ---------------- */
let selLetter = null;
function renderLetters() {
  fillSelectors();
  const list = $('#letterList');
  list.innerHTML = '';
  if (!S.letters.length) list.append(h('div', { class: 'small muted' }, 'No letters yet.'));
  S.letters.slice().sort((a, b) => b.created - a.created).forEach((l) => list.append(h('div', { class: 'lt' + (l.id === selLetter ? ' on' : ''), onclick: () => { selLetter = l.id; renderLetters(); } }, h('b', {}, l.title), h('div', { class: 'small muted' }, new Date(l.created).toLocaleDateString()))));
  const l = S.letters.find((x) => x.id === selLetter);
  $('#letterTitle').value = l ? l.title : '';
  $('#letter').value = l ? l.text : '';
  countWords();
}
const countWords = () => { $('#letterWords').textContent = ($('#letter').value.match(/\S+/g) || []).length + ' words'; };
$('#letter').addEventListener('input', () => { const l = S.letters.find((x) => x.id === selLetter); if (l) { l.text = $('#letter').value; save(); } countWords(); });
$('#letterTitle').addEventListener('change', () => { const l = S.letters.find((x) => x.id === selLetter); if (l) { l.title = $('#letterTitle').value; save(); renderLetters(); } });
$('#letterBtn').onclick = (e) => busy(e.currentTarget, async () => {
  const j = jobById($('#lJob').value);
  const jd = j ? j.jd : $('#jd').value, resume = activeResume().text;
  if (jd.length < 40) return toast('Pick a job or paste one on the Analyze page', 'err');
  const l = { id: uid(), jobId: j?.id || null, title: `${j ? j.company || j.title : 'Draft'}: ${$('#tone').value}`, text: '', created: Date.now() };
  S.letters.push(l); selLetter = l.id; renderLetters();
  l.text = await AI.chat([
    { role: 'system', content: `Write a ${$('#tone').value} cover letter (220-280 words) for this job using only facts from the resume. Hook in the first line, 2 short proof paragraphs mapped to the job's top needs, a specific closing. Plain text, no placeholders except [Hiring Manager] if no name is known.` },
    { role: 'user', content: `JOB:\n${jd.slice(0, 4000)}\n\nRESUME:\n${resume.slice(0, 6000)}` },
  ], { temperature: 0.7, onToken: (_, acc) => { $('#letter').value = acc; countWords(); }, demo: DEMO.letter });
  save(); renderLetters();
});
$$('[data-polish]').forEach((b) => (b.onclick = (e) => busy(e.currentTarget, async () => {
  const l = S.letters.find((x) => x.id === selLetter);
  if (!l || !l.text) return toast('Pick a letter first', 'err');
  l.text = await AI.chat([{ role: 'system', content: `Revise this cover letter to be ${b.dataset.polish}. Keep every fact; do not add new claims. Plain text only.` }, { role: 'user', content: l.text }], { temperature: 0.5, onToken: (_, acc) => { $('#letter').value = acc; }, demo: b.dataset.polish === 'shorter' ? l.text.split('\n\n').filter((_, i, a) => i !== a.length - 3).join('\n\n') : l.text });
  save(); renderLetters(); toast('Revised: ' + b.dataset.polish);
})));
$('#copyLetter').onclick = () => navigator.clipboard.writeText($('#letter').value).then(() => toast('Copied'));
$('#dlLetter').onclick = () => download(($('#letterTitle').value || 'cover-letter').replace(/\W+/g, '_') + '.txt', $('#letter').value);
$('#delLetter').onclick = () => { if (selLetter && confirm('Delete this letter?')) { S.letters = S.letters.filter((x) => x.id !== selLetter); selLetter = null; save(); renderLetters(); } };

/* ---------------- routing ---------------- */
Router.on('analyze', fillSelectors);
Router.on('resumes', renderResumes);
Router.on('jobs', renderJobs);
Router.on('letters', () => { if (!selLetter && S.letters.length) selLetter = S.letters[0].id; renderLetters(); });
fillSelectors();
$('#resume').value = activeResume().text;
$('#aJob').value = S.jobs[0]?.id || '';
$('#jd').value = S.jobs[0]?.jd || DEMO.jd;
analyze();

/* ================= AI command box ================= */
const jobNamed = (q) => { const s = String(q).toLowerCase(); const j = S.jobs.find((x) => `${x.title} ${x.company}`.toLowerCase().includes(s)) || S.jobs.find((x) => s.split(/\s+/).every((w) => `${x.title} ${x.company}`.toLowerCase().includes(w))); if (!j) throw new Error(`No job like "${q}"`); return j; };
Copilot.register({
  context: () => `Active resume "${activeResume().name}". Analyze page: ${last ? `keyword coverage ${last.pct}%, missing: ${missing()}; ${last.bl.length} bullets, weakest: ${last.bl.slice().sort((a, b) => a.score - b.score).slice(0, 3).map((x) => `"${x.b}" (${x.score})`).join('; ')}` : 'not analyzed'}. Jobs: ${S.jobs.map((j) => `${j.title} at ${j.company || '?'} [${j.status}, ${j.match ?? '?'}%]`).join('; ')}. Resume versions: ${S.resumes.map((r) => r.name).join(' | ')}. Letters: ${S.letters.length}.`,
  actions: [
    { name: 'match_job', description: 'Score the active resume against a job: pasted text or a tracked job', params: { job_description: 'optional pasted job text', job: 'optional tracked job title/company' },
      run: ({ job_description, job }) => { Router.go('analyze'); fillSelectors(); $('#resume').value = activeResume().text; if (job) { const j = jobNamed(job); $('#aJob').value = j.id; $('#jd').value = j.jd; } else if (job_description) { $('#aJob').value = ''; $('#jd').value = job_description; } analyze(); return `Coverage ${last.pct}%. Missing: ${missing() || 'nothing important'}`; } },
    { name: 'rewrite_weakest_bullets', description: 'Rewrite the lowest-scoring bullets with stronger verbs and numbers (variants appear under each bullet)', params: { count: 'how many, default 3' },
      run: async ({ count }) => { if (!last) analyze(); Router.go('analyze'); const rows = $$('#bullets .bl'), picks = last.bl.map((x, i) => ({ x, i })).sort((a, b) => a.x.score - b.x.score).slice(0, +count || 3), out = []; for (const { x, i } of picks) { const el = rows[i].children[1].lastChild; await rewrite(x.b, el); out.push(`"${x.b}" -> ${el.innerText.replace(/Use$/gm, '').slice(0, 300)}`); } return out.join('\n'); } },
    { name: 'recruiter_review', description: 'Get a recruiter-style fit review of resume vs job', params: {}, run: async () => { Router.go('analyze'); $$('#results .tabs button').find((b) => b.dataset.t === 'review')?.click(); await review(); return $('#review').innerText.slice(0, 900); } },
    { name: 'tailored_summary', description: 'Write a 3-sentence resume summary for the job', params: {}, run: async () => { Router.go('analyze'); $$('#results .tabs button').find((b) => b.dataset.t === 'summary')?.click(); await summary(); return $('#summary').innerText; } },
    { name: 'cover_letter', description: 'Draft a cover letter for a tracked job (or the job on the Analyze page)', params: { job: 'optional tracked job', tone: [...$('#tone').options].map((o) => o.value).join(' | ') },
      run: async ({ job, tone }) => { Router.go('letters'); fillSelectors(); $('#lJob').value = job ? jobNamed(job).id : ''; if (tone && [...$('#tone').options].some((o) => o.value === tone)) $('#tone').value = tone; await $('#letterBtn').onclick({ currentTarget: $('#letterBtn') }); return `Drafted ${($('#letter').value.match(/\S+/g) || []).length} words`; } },
    { name: 'track_job', description: 'Add the job on the Analyze page (or pasted text) to the tracker', params: { job_description: 'optional pasted job text' }, run: ({ job_description }) => { if (job_description) $('#jd').value = job_description; $('#saveJob').click(); return 'Added to the tracker'; } },
    { name: 'set_job_status', description: 'Move a tracked job to a stage', params: { job: 'title or company', status: STAGES.join(' | '), notes: 'optional note to append' }, run: ({ job, status, notes }) => { const j = jobNamed(job); if (!STAGES.includes(status)) throw new Error('Stages: ' + STAGES.join(', ')); j.status = status; if (notes) j.notes = (j.notes ? j.notes + '\n' : '') + notes; j.updated = Date.now(); save(); Router.go('jobs'); renderJobs(); return `${j.title}: ${status}`; } },
    { name: 'pipeline', query: true, description: 'Look up the job pipeline and response rates', params: {}, run: () => JSON.stringify({ stats: pipelineStats(S.jobs, Date.now()), jobs: S.jobs.map((j) => ({ title: j.title, company: j.company, status: j.status, match: j.match, daysSinceUpdate: Math.floor((Date.now() - j.updated) / 864e5), notes: j.notes })) }) },
  ],
});
