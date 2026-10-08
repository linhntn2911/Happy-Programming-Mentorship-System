# Admin workspace

## Request and scope
Build the administrator workspace using the existing HappyProgramming visual language. Product authority: `../SPEC.md`, Admin persona, US-11 and GB-10 through GB-13. Staff mentor moderation remains a separate capability.

## User outcomes
- Administrators see a coherent overview and navigate accounts, staff permissions, revenue, settings and audit history.
- Accounts are searchable by name/email and filterable by role/status with pagination. Administrators inspect an account before changing its status, provide a reason, and cannot disable themselves.
- Staff authorization exposes the four permissions in the canonical schema. Permissions can only be assigned to staff.
- Revenue includes only successful, verified VNPay transactions and uses each transaction's commission snapshot, not the current system rate. Dates and currency are explicit.
- Configuration edits validate input and require confirmation; historical transactions remain unchanged.
- Audit entries show time, actor, action, target and reason, and provide no edit/delete action.
- Loading, empty, failure and successful mutation states are visible and actionable.
- The interface uses English, canonical tokens/components and is usable at 320px, tablet and desktop sizes with keyboard navigation.

## Acceptance scenarios
1. Search and role/status filters intersect; a new filter resets pagination and clearing filters restores results.
2. Cancelling an account or permissions dialog makes no change. Confirmed valid changes appear in the list and audit history.
3. Invalid commission values and empty reasons are rejected without changing stored state.
4. Failed/pending/unverified transactions do not contribute to revenue; commission uses historical snapshots.
5. Navigating away while a request is pending cannot overwrite the new page. Mentor hydration cannot replace an admin route.
6. Dynamic account names, email addresses and log text render as text, including HTML-like strings.

## Integration boundary
Implement frontend and backend, the default interpretation of the user's request. The repository has no authentication implementation. Introduce administrator session authentication against existing BCrypt user records; protect all admin reads and writes on the server, with CSRF checks for mutations. Preserve public mentor endpoints. Provide an explicitly selected, labelled browser demo with isolated sample data; never silently fall back from live data to demo. No hard-coded production credentials or automatically promoted users.
