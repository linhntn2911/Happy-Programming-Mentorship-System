# Plan

Add a paged, owner-scoped GET `/api/notifications/history` endpoint using the existing `dbo.notifications` table and Spring Data pageable repository methods. Keep GET `/api/notifications` as the current short bell preview. Bound page and size parameters and sort by creation time then ID descending. No migration is needed.

Add a frontend history service method and route. Link the bell preview to the history page. Reuse current typography, cards, controls, and notification read actions. Keep action URLs limited to in-app hash routes. Verify backend authorization, filter/count/pagination, frontend rendering and state transitions, and run build/tests.
