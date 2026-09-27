# GBP SEO Audit Pro

A polished static MVP for a Google Business Profile SEO audit tool.

## Included
- Profile completeness audit
- Critical / warning / pass checks
- Business-name keyword-risk heuristic
- Review count, rating and unanswered-review analytics
- 7 / 30 / 60 day optimization plan
- Printable report / Save as PDF
- Responsive SaaS dashboard
- Demo profile
- Placeholder for authorized Google OAuth/API integration

## Run
Open `index.html` in a browser.

## Production Google integration
The static app intentionally does not pretend to have live Google data. For live data, add a secure backend and Google OAuth 2.0 integration. Google Business Profile APIs provide business information, reviews and performance insights, but API access has eligibility/approval requirements.

Do not put Google client secrets in frontend JavaScript.

## Suggested production stack
Frontend: Next.js / React
Backend: Node.js + Express or Next.js API routes
Database: PostgreSQL / Supabase
Auth: Google OAuth 2.0
Hosting: Vercel / Cloudflare / Hostinger VPS
PDF: server-side PDF generation
