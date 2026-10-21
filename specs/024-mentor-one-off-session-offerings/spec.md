# Mentor-managed one-off session offerings

## User outcome

A Mentor can publish several focused one-off session options, each with its own name, description, duration, price, and active status. Mentees only see active options on the public mentor profile.

## Requirements

- Mentors can list their own `ONE_OFF` offerings, including inactive offerings.
- Mentors can create or update up to 20 offerings per request.
- Each offering has a name, description, VND price, duration from 10 to 1440 minutes, and `ACTIVE` or `INACTIVE` status.
- Backend authorizes every write by the signed-in active mentor and never permits editing another mentor's offering.
- Existing service-offering records and active public offering queries remain compatible.
- Availability windows are published separately; public slot generation uses 10-minute start intervals and the selected session duration.
- The Mentor's upcoming availability list excludes a window as soon as its start time is reached, while retaining the database record for history and audit.
- Saving monthly packages or one-off session options gives an immediately visible inline success or failure notification above the affected section.
- Every one-off duration is at least 10 minutes; backend validation is authoritative.
