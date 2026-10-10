/* Sample resume, job and canned model output used without an API key. */
var DEMO = {
  resume: `JORDAN LEE
jordan.lee@example.com · github.com/jordanlee · Toronto, ON

SUMMARY
Software developer with 3 years of experience building web applications.

EXPERIENCE
Software Developer, Maple Logistics (2023 – present)
- Responsible for maintaining the internal shipment tracking dashboard.
- Built a React + TypeScript component library used by 4 product teams, cutting UI build time by 30%.
- Helped migrate REST APIs from Express to Node.js microservices on AWS.
- Worked on improving database queries.
- Automated nightly PostgreSQL reports with Python, saving analysts 6 hours per week.

Junior Developer, Brightside Media (2021 – 2023)
- Developed responsive marketing pages for 20+ client campaigns.
- I was in charge of fixing bugs reported by customers.
- Wrote unit tests with Jest, raising coverage from 40% to 78%.

PROJECTS
- Built TrailMix, a hiking route planner using Leaflet and OpenStreetMap with 1,200 monthly users.

EDUCATION
B.Sc. Computer Science, University of Waterloo (2021)

SKILLS
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, Python, AWS, Git, Jest`,
  jd: `Senior Frontend Engineer — Fintech Platform

About the role
We're looking for a Senior Frontend Engineer to lead the development of our customer-facing investing dashboard used by 500k users.

What you'll do
- Architect and build performant React applications in TypeScript
- Own our design system and component library
- Collaborate cross-functional with product, design and backend teams
- Improve web performance (Core Web Vitals) and accessibility (WCAG 2.1)
- Mentor junior engineers and lead code reviews

Requirements
- 4+ years of professional frontend experience with React and TypeScript
- Deep knowledge of state management (Redux, Zustand or similar)
- Experience with GraphQL and REST APIs
- Strong testing culture: unit testing with Jest, end-to-end with Playwright or Cypress
- Experience with CI/CD pipelines and monitoring
- Familiarity with data visualization (D3, charts) is a plus
- Accessibility expertise (WCAG, ARIA)

Benefits
Competitive salary, equity, remote-friendly, learning budget.`,
  review: { fit_score: 64, verdict: 'Credible mid-level React/TypeScript engineer, but not yet evidencing senior-level ownership, performance or accessibility work.', strengths: ['Built a component library used by 4 teams, which maps directly to "own our design system"', 'Quantified wins (30% faster UI builds, coverage 40% → 78%)', 'Solid React + TypeScript + Jest stack match'], gaps: ['No GraphQL, state management (Redux/Zustand) or Playwright/Cypress mentioned', 'No evidence of accessibility (WCAG/ARIA) or Core Web Vitals work', '3 years of experience vs. the 4+ required'], red_flags: ['Several bullets use weak phrasing ("Responsible for", "Helped", "Worked on")', 'Summary is generic and does not mention frontend'], top_edits: ['Rewrite the summary to lead with "Frontend engineer specializing in React/TypeScript design systems"', 'Add a bullet on accessibility or performance work if you have done any (even audits)', 'Replace "Worked on improving database queries" with a quantified outcome or cut it'] },
  summary: 'Frontend-focused software engineer with 3+ years building React and TypeScript products, most recently owning a component library adopted by four product teams. Cut UI build time by 30% and lifted test coverage from 40% to 78% through disciplined Jest testing. Brings design-system leadership and a quality-first mindset to a high-traffic investing dashboard.\n\n*(Demo output: add a free key to tailor it to your own resume.)*',
  letter: `Dear [Hiring Manager],

When your job post said "own our design system," I smiled. That is exactly what I have spent the last two years doing at Maple Logistics.

There, I built a React and TypeScript component library that four product teams now ship with, cutting UI build time by 30%. Designing APIs that other engineers enjoy using taught me to think about consistency, documentation and performance from day one, which matters even more on a dashboard serving 500,000 investors.

I also care deeply about quality. At Brightside Media I raised test coverage from 40% to 78% with Jest, and today I automate the unglamorous work, like nightly PostgreSQL reports that save our analysts six hours a week. I am eager to deepen my accessibility and Core Web Vitals expertise on a team that treats them as first-class features.

I would love to bring this design-system experience to your fintech platform and grow into the mentorship side of a senior role. Thank you for your time. I would welcome the chance to talk.

Sincerely,
Jordan Lee`,
};
