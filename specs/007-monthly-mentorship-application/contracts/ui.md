# UI contract
- Route: apply/monthly?mentor=<mentor id>&name=<optional display name>.
- Draft state: { mentorId, mentorName, goal, timeline, message, step } in session storage only.
- Completion: local confirmation; no network request and no backend state transition.
