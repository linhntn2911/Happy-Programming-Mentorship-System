# Plan

- Preserve the real offering ID while mapping backend plans into profile tier objects.
- Update the profile Apply action on every tier switch and include the selected offering ID in the application URL and draft state.
- Extend the create-request DTO with an optional positive offering ID for backward compatibility. The service must validate ownership, monthly type, and active status by selecting only that mentor's active monthly plans; an omitted ID is valid only when exactly one active plan exists.
- Store a server-derived offer snapshot from the selected offering. Use the tier label in the snapshot so applications and checkout identify Lite, Standard, or Pro consistently.
- Replace demo pricing fallback on a real mentor profile with an honest no-package state.
- No database migration is required. Preserve existing application snapshots.
