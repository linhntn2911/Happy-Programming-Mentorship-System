# Verification
Open Admin > Mentor payouts. Search mentor/name/ID/reference, filter REQUESTED/PAID/REJECTED and UTC requested dates; clear and paginate. Pending rows offer decisions, completed rows do not. Review dates/reviewer/reference/reason are visible. Record or reject only dedicated test requests; reload and confirm history retains them. Empty filters show empty state. Keyboard focus/labels follow existing controls. Network errors show retry; mutation failure stays in dialog. Non-admins cannot read history. No real bank transfer is part of verification.

## Executed verification (2026-10-28)
- 14 focused backend tests passed across AdminPayoutHistoryTest, AdminPayoutHistoryAccessTest, AdminPayoutHistoryControllerTest, AdminServiceTest and MentorWalletServiceTest.
- 4 frontend payout tests passed: filtering/date boundaries, escaping, read-only completed actions, pagination/empty/demo states.
- Vite production build passed (existing large-chunk warning).
- Repository mapping tested with H2 MSSQL mode; not a live SQL Server/browser end-to-end run. Existing dialog loading/retry/success and semantic form/table controls are reused; live keyboard walkthrough remains manual verification.
- Convergence: API, read model and frontend agree; no schema or money-writing changes. Existing Staff payout authorization discrepancy is documented outside this feature scope.
