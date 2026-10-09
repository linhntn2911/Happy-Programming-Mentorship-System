# Implementation

Read existing /api/mentors through mentorService and find the requested id. No API contract or database changes. Route #/mentors/:id before directory. Guard stale requests and catalog hydration so they cannot overwrite an open profile. Use existing image assets, design tokens, buttons and footer. The existing catalog contains skill names but no verification fields and no review bodies: label them Skills and render a truthful review unavailable state. Service tabs reuse existing monthly/session prices, without invented quotas or benefits. Future API integration can supply verifiedSkills/reviews and service_offerings.

Validation: frontend build plus focused rendering/escaping and service-switch checks. Keep the existing homepage and search behavior.
