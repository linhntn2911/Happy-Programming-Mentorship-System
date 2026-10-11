# UI contract

> Historical draft contract: the current live application contract is described in `specs/015-mentee-application-management/` and `specs/017-selected-mentorship-package/`.
- Route: apply/monthly?mentor=<mentor id>&name=<optional display name>.
- Draft state: { mentorId, mentorName, goal, timeline, message, step } in session storage only.
- Completion: local confirmation; no network request and no backend state transition.
