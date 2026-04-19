# SEO Verification Guide

## After Deployment Checklist

### 1. Run Lighthouse SEO Audit

1. Open Chrome and navigate to your deployed site: `https://thedigitalhub.tech`
2. Open DevTools (`F12` or `Ctrl + Shift + I`)
3. Go to the **Lighthouse** tab
4. Select **SEO** under Categories
5. Choose **Mobile** or **Desktop** as the device
6. Click **Analyze page load**
7. Target score: **90+**
8. Repeat for key pages: `/programs`, `/events`, `/about-us`, `/contact`, `/apply`

### 2. Verify Meta Tags

1. On any page, right-click and select **View Page Source**
2. Confirm these are present in `<head>`:
   - `<title>` with page-specific title (e.g., "Programs | The Digital Hub")
   - `<meta name="description" ...>`
   - `<meta property="og:title" ...>`
   - `<meta property="og:description" ...>`
   - `<meta property="og:image" ...>`
   - `<meta name="twitter:card" ...>`
   - `<link rel="canonical" ...>`

### 3. Verify robots.txt and sitemap.xml

- Visit `https://thedigitalhub.tech/robots.txt` — should show crawl rules and sitemap URL
- Visit `https://thedigitalhub.tech/sitemap.xml` — should list all public pages

### 4. Test Social Media Previews

- Use [opengraph.xyz](https://opengraph.xyz) or [metatags.io](https://metatags.io)
- Paste your site URL and verify the preview card shows correct title, description, and image

### 5. Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property: `https://thedigitalhub.tech`
3. Submit your sitemap: `https://thedigitalhub.tech/sitemap.xml`
4. Use the **URL Inspection** tool to check individual pages are indexable
