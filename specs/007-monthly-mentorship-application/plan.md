# Plan
- Reuse the existing mentor profile pricing CTA and route to a new frontend page.
- Keep the draft in versioned, mentor-scoped sessionStorage; it is UI state, not application data.
- Use DOM text assignment for user-entered values and escape mentor query display. Do not add runtime mock mentor arrays or API fallbacks.
- Add only frontend page/router work; no schema or migration is warranted while the final action is explicitly unsent.
- Validate the three steps, keyboard controls, build, and absence of network calls from the wizard.
