const JD = `Frontend Engineer
Requirements
- 3+ years with React and TypeScript
- Experience with GraphQL and REST APIs
- Unit testing with Jest; CI/CD pipelines
- Accessibility (WCAG, ARIA)
Benefits
Competitive salary and a learning budget.`;

const RESUME = `JORDAN LEE
jordan@example.com · github.com/jordan · +1 416 555 0100

SUMMARY
Frontend developer.

EXPERIENCE
- Built a React + TypeScript component library used by 4 teams, cutting build time by 30%.
- Helped with REST APIs.
- Wrote unit tests with Jest, raising coverage from 40% to 78%.

EDUCATION
B.Sc. Computer Science

SKILLS
JavaScript, TypeScript, React, Jest`;

test('norm applies synonyms and light stemming', () => {
  assert.eq(norm('JS'), 'javascript');
  assert.eq(norm('testing'), 'test');
  assert.eq(norm('apis'), 'api');
  assert.eq(norm('libraries'), 'library');
});

test('extractKeywords finds technical requirements and skips boilerplate', () => {
  const k = extractKeywords(JD).map((x) => x.k);
  ['react', 'typescript', 'graphql', 'jest', 'ci/cd', 'wcag'].forEach((w) => assert.ok(k.includes(w), 'missing ' + w + ' in ' + k.join(',')));
  ['salary', 'learning', 'experience', 'benefits'].forEach((w) => assert.ok(!k.includes(w), 'should skip ' + w));
});

test('inResume matches stems and multi-word phrases', () => {
  assert.ok(inResume('unit testing', 'wrote unit tests daily'));
  assert.ok(inResume('rest apis', 'Designed REST API endpoints'));
  assert.ok(!inResume('graphql', RESUME));
});

test('matchJob computes weighted coverage and missing keywords', () => {
  const m = matchJob(RESUME, JD);
  assert.ok(m.pct > 30 && m.pct < 90, 'pct ' + m.pct);
  assert.ok(m.missing.includes('graphql'));
  assert.ok(!m.missing.includes('react'));
});

test('lintBullet flags weak, unquantified bullets and rewards strong ones', () => {
  const weak = lintBullet('Helped with REST APIs.');
  assert.ok(weak.score <= 45, 'weak score ' + weak.score);
  assert.ok(weak.flags.some((f) => f[1] === 'weak phrasing'));
  const strong = lintBullet('Built a React component library used by 4 teams, cutting build time by 30%.');
  assert.eq(strong.score, 100);
  assert.ok(lintBullet('I was tasked with things that were completed by the team.').flags.some((f) => f[1] === 'passive voice'));
});

test('bullets and sections are detected', () => {
  assert.eq(bullets(RESUME).length, 3);
  const s = sections(RESUME);
  assert.ok(s.Experience && s.Education && s.Skills && s.Summary);
  assert.ok(!s.Projects);
});

test('resumeQuality rewards contacts, sections and quantified bullets', () => {
  const q = resumeQuality(RESUME);
  assert.ok(q.score >= 60 && q.score <= 100, 'score ' + q.score);
  assert.eq(q.bullets, 3);
  const bare = resumeQuality('Just some text with no structure at all.');
  assert.ok(bare.score < q.score);
  assert.eq(q.parts.reduce((a, p) => a + p[2], 0), 100, 'max points add to 100');
});

test('diffLines produces a minimal add/delete script', () => {
  const d = diffLines('a\nb\nc', 'a\nc\nd');
  assert.deepEq(d.map((x) => x.op + ':' + x.text), ['same:a', 'del:b', 'same:c', 'add:d']);
  assert.eq(diffLines('x', 'x').every((x) => x.op === 'same'), true);
});

test('pipelineStats counts stages, response rate and stale applications', () => {
  const now = Date.UTC(2026, 5, 30);
  const jobs = [
    { status: 'saved', created: now }, { status: 'applied', created: now - 20 * 864e5 }, { status: 'applied', created: now, updated: now },
    { status: 'interview', created: now }, { status: 'rejected', created: now },
  ];
  const s = pipelineStats(jobs, now);
  assert.eq(s.by.applied, 2);
  assert.eq(s.applied, 4);
  assert.near(s.responseRate, 0.25, 1e-9);
  assert.eq(s.stale, 1);
  assert.eq(pipelineStats([], now).responseRate, null);
});

test('guessJobMeta splits title and company from the first line', () => {
  assert.deepEq(guessJobMeta('Senior Frontend Engineer — Fintech Platform\nmore'), { title: 'Senior Frontend Engineer', company: 'Fintech Platform' });
  assert.deepEq(guessJobMeta('Data Analyst at Globex\n'), { title: 'Data Analyst', company: 'Globex' });
});
