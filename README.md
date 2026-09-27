# GBP SEO Audit Pro — Link Only

This version is designed around one input:

> Paste Google Maps / Google Business Profile link → Analyze Profile

The app then retrieves available public place information through Google's Places API (New), including name, address, phone, website, rating, review count, category, hours and business status where those fields are returned.

## Important
A static GitHub Pages site cannot safely keep a server-side Google API secret. This project therefore includes a serverless `/api/audit` endpoint and is intended for Vercel or another backend host.

### Deploy
1. Upload this project to GitHub.
2. Import the repository into Vercel.
3. Add environment variable:
   `GOOGLE_MAPS_API_KEY=your_key`
4. Enable Places API (New) in Google Cloud and configure billing/API restrictions.
5. Deploy.
6. Open the Vercel URL and paste a Google Maps/GBP link.

Do not put the unrestricted API key in frontend JavaScript.

## What is automated
- Google Maps/GBP URL resolution
- Place identification
- Business name
- Category
- Address
- Phone
- Website
- Rating
- Review count
- Opening hours
- Business status
- Maps link
- SEO score
- Policy-safe keyword pattern check
- Critical/warning/pass audit
- 7/30/60 day optimization plan
- Printable report

## What is NOT fabricated
If Google does not return a field, the tool displays "Not available" rather than inventing it.

For deeper owner-only GBP data such as profile management and performance, add Google Business Profile API + OAuth after obtaining the required API access/authorization.

## Official Google documentation
https://developers.google.com/maps/documentation/places/web-service/place-details
https://developers.google.com/maps/documentation/places/web-service/op-overview
https://developers.google.com/my-business/ref_overview
