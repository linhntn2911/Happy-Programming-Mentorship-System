# Plan

- Read only `platform.support_email` from the existing system configuration table.
- Return it through a narrowly scoped public endpoint.
- Add a reusable frontend support-email link that hydrates from the endpoint and never embeds an address in source.
- Use the link in the shared Footer and One-Off availability empty state.
