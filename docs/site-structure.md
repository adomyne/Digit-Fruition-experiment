# Site structure

Source: sitemap from the project owner (`sitemap.png`, below).

![Sitemap](sitemap.png)

## Sitemap

- **Landing page**
  - About
  - Contact us
  - Resources
    - Blogs
    - Case Studies
  - Services
    - Ad Campaigns
    - Audits

## Landing page sections

Build the landing page in exactly this order:

1. Hero
2. Ads
3. Audits
4. Process
5. About us
6. Results
7. Case studies
8. Testimonials
9. Form & FAQ (the audit form and the FAQ sit side by side in Figma)
10. Logo
11. Footer

The reference build of all eleven is route `/6`
(`src/sections/06-landing-reference/`), recreated from Figma frame 60:159.

## Scope of the stack comparison

Only the landing page is part of the stack comparison, and only three of its
sections are rebuilt across frameworks and animation libraries:

- **Compared across stacks:** Hero, Process, Results.
- **Static, built once (the `/6` reference is final):** Audits, About us,
  Case studies, Testimonials, FAQ, Footer. The owner crossed these off the
  comparison because they are mostly static.
- **Not decided yet:** Ads, Form (it shares a block with the FAQ), Logo.

Each compared section gets a written brief (rules and vision) before any
stack experiment starts.

The other pages (About, Contact us, Resources, Blogs, Case Studies, Services,
Ad Campaigns, Audits) will be mostly static, so they will not be built with
different tools.
