# Feature Specification: 027-dispute-mediation-room

> **Document Type:** GitHub Spec Kit Product Specification (`spec.md`)  
> **Status:** Active / Under Review  
> **Target Roles:** Mentee & Staff (with Mentor as respondent)  
> **Related Architecture:** SePay Internal Escrow Ledger, Staff Workspace Shell (`admin.css`), Mentorship Workspace Chat  

---

## 1. Context & Business Value

HappyProgramming connects Mentees with Mentors for paid one-off technical sessions and 30-day monthly mentorship packages. Customer payments are deposited into the platform's bank account via SePay QR transfer and recorded in an **internal escrow ledger**, where mentor earnings are held for a minimum safety period (7 days for monthly plans, or until session completion for one-off bookings).

In real-world operations, disputes arise when expectations are breached (e.g., mentor fails to show up, unresponsive mentor, inappropriate conduct, or mismatched technical scope). Leaving disputes to unstructured external communication or unmonitored email chains creates delays, opaque decisions, and unfair financial loss.

This feature establishes a formal **Dispute & Mediation Framework** focusing on:
1. **Mentee empowerment**: An accessible, structured filing flow requiring concrete categorisation, written explanation, and **mandatory image evidence**.
2. **Staff arbitration**: A dedicated queue in the Staff Workspace to inspect evidence, freeze escrow funds, open a **3-Party Dispute Mediation Room** (Mentee, Mentor, Staff), moderate dialogue, and issue binding financial resolutions.

---

## 2. User Roles & Outcomes

```
                               ┌────────────────────────────────┐
                               │             MENTEE             │
                               │  - Files complaint with images │
                               │  - Chats & uploads in room     │
                               │  - Receives outcome / refund   │
                               └──────────────┬─────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────┐      Dispute Ticket      ┌─────────────────────────────────┐
│              STAFF              ├──────────────────────────┤             MENTOR              │
│ - Triages disputes in workspace │      3-Party Room        │ - Receives deadline alert       │
│ - Opens & moderates 3-way chat  │  (Mentee + Mentor + Staff│ - Submits counter-proof images  │
│ - Issues binding resolution     │                          │ - Answers staff inquiries       │
│ - Executes escrow refund/release│                          │                                 │
└─────────────────────────────────┘                          └─────────────────────────────────┘
```

---

## 3. Mentee User Scenarios & Requirements

### US-M1: Access Dispute Action from Booking & Mentorship Views
- **As a** Mentee with an eligible booking or monthly mentorship,
- **I want to** see an explicit "Report an Issue / File Dispute" action on my booking details or mentorship workspace,
- **So that** I know I have a safe, formal platform channel if something went wrong.

#### Eligibility Rules
1. **One-Off Sessions**: Mentee may file a dispute:
   - If the scheduled session start time has passed and mentor was absent (no-show), OR
   - Within **48 hours** following session completion if there was a material breach of conduct or service quality.
   - If > 48 hours have elapsed post-session without a dispute, the booking is locked from new disputes and escrow releases normally.
2. **Monthly Mentorship**: Mentee may file a dispute:
   - Any time within the **7-day trial window** if the mentor is completely unresponsive (no chat replies for > 3 consecutive days) or fails to provide agreed mentorship.
3. **Dispute Invariant**: Only **1 active dispute** is permitted per booking or monthly subscription at any given time. Duplicate submissions for the same booking while a dispute is already open are rejected.

---

### US-M2: Submit Formal Complaint with Mandatory Image Evidence
- **As a** Mentee filing a dispute,
- **I want to** fill out a structured form with category, incident description, and mandatory screenshot uploads,
- **So that** my claim is supported by tangible proof from the very beginning.

#### Form Specifications & Validation Rules
1. **Category Selection (Single choice, required)**:
   - `NO_SHOW`: Mentor did not provide access to or attend the scheduled one-off session, or left prematurely (< 10 minutes).
   - `QUALITY_MISMATCH`: Mentorship did not cover the agreed topic, skills, or curriculum stated in the package.
   - `UNRESPONSIVE`: Mentor ceased replying to messages for more than 72 hours during an active monthly cycle.
   - `CONDUCT_VIOLATION`: Inappropriate language, harassment, discrimination, or violation of community standards.
   - `TECHNICAL_FAILURE`: Workspace failure or failure of an external meeting link shared by the mentor that prevented the session from occurring.
   - `OTHER`: Exceptional circumstances requiring staff intervention.
2. **Detailed Description (Required)**:
   - Minimum 30 characters, maximum 2,000 characters.
   - Must explain what occurred, what was agreed upon, and what remedy is requested.
3. **Mandatory Image Evidence (Required)**:
   - **Minimum 1 image**, maximum 5 images.
   - Supported file extensions: `.png`, `.jpg`, `.jpeg`, `.webp`.
   - Maximum file size: **5 MB per image**.
   - Client provides instant thumbnail previews with the ability to remove/re-upload before submitting.
   - Allowed evidence examples: Screenshot of the mentor's external meeting link and related workspace messages, timestamped screenshot showing an unanswered attempt to join or contact the other party, screenshot of unread workspace messages with elapsed days, or screenshot of conflicting code/chat logs.
4. **Terms Acknowledgement**:
   - Checkbox confirming: *"I confirm that the details and images provided are authentic and understand that fraudulent claims may lead to account penalties."*

#### Post-Submission System Behavior
- Dispute ticket is assigned a unique tracking code (e.g., `HP-DSP-202610-0042`).
- The corresponding booking or subscription status transitions to `DISPUTED`.
- **Immediate Escrow Freeze**: The active dispute record is the authoritative hold for its verified payment. Wallet release jobs must exclude payments linked to a dispute in `SUBMITTED`, `IN_MEDIATION`, or `AWAITING_EVIDENCE`, immediately halting automated release without duplicating ledger value. Funds cannot be paid out to the mentor while the dispute is pending.
- Mentee receives on-screen confirmation and is redirected to the **Dispute Detail & Tracker Page**.

---

### US-M3: Mentee Dispute Tracking & History
- **As a** Mentee,
- **I want to** view a dedicated "My Disputes" tab or section,
- **So that** I can track the progress of my claims and know when Staff takes action.

#### Screen Requirements
- Lists all disputes filed by the mentee with:
  - Ticket code (`HP-DSP-XXXXX`)
  - Session/Mentor title and scheduled date
  - Disputed amount (VND)
  - Date submitted
  - Restrained status badge:
    - `● SUBMITTED` (Neutral grey) — Waiting for Staff assignment.
    - `● IN MEDIATION` (Brand purple) — 3-party dispute room is active.
    - `● RESOLVED` (Success green) — Decision delivered (full/partial refund or reschedule).
    - `● REJECTED` (Danger red) — Claim dismissed.
- Clicking a card opens the **Dispute Mediation Room & Resolution Detail**.

---

### US-M4: Mentee Participation in 3-Party Mediation Room
- **As a** Mentee whose dispute has been opened by Staff,
- **I want to** enter the 3-party room to chat directly with Staff and Mentor, and upload supplementary proof,
- **So that** I can clarify questions from Staff and see Mentor's defense in real time.

#### Room Capabilities for Mentee
1. View the original complaint details, selected category, and initial evidence carousel in a top collapsible panel.
2. View the **Respondent Countdown Timer** (e.g., *"Mentor response required within: 18h 32m"*).
3. Post text messages in the centralized chronological chat timeline.
4. Attach additional image evidence (`+ Attach Photo/Screenshot`, up to 5MB) during the conversation.
5. Distinct visual badge identifying the mentee: `[You - Mentee]` in ink purple.
6. Real-time updates / auto-refresh when Staff or Mentor posts a new message.

---

### US-M5: Mentee Outcome & Refund Confirmation
- **As a** Mentee,
- **I want to** see the final verdict, resolution summary, and refund receipt clearly when Staff closes the dispute,
- **So that** I have closure and know the exact financial outcome.

#### Outcome Display
1. Prominent **Resolution Banner** showing:
   - Final Decision (`FULL_REFUND`, `PARTIAL_REFUND`, `RESCHEDULE`, or `REJECTED`).
   - Resolution Summary text written by Staff explaining the rationale.
   - Refund Amount (VND) credited back or pending administrative transfer.
   - Date and name/code of Staff arbitrator who decided the case.
2. The chat input is replaced with a read-only notification: *"This dispute was resolved on [Date]. The conversation is archived for audit purposes."*

---

## 4. Staff User Scenarios & Requirements

### US-S1: Staff Dispute Queue & Triage Dashboard
- **As a** Staff member navigating the Staff Workspace (`/staff`),
- **I want to** see a dedicated "Disputes" navigation item and operational triage dashboard,
- **So that** I can immediately identify pending complaints, prioritize urgent cases, and monitor active mediation rooms.

#### Layout & Metrics (Aligned with `admin.css`)
- **Navigation**: Staff sidebar includes `.admin-nav-link` for "Disputes" with inline balance/gavel SVG icon and unread counter badge.
- **Top Metrics Grid (4 Stat Cards)**:
  1. `Needs Triage`: Total disputes in `SUBMITTED` status awaiting staff intake.
  2. `Active Mediation`: Disputes in `IN_MEDIATION` with active 3-party rooms.
  3. `Awaiting Response`: Disputes where countdown timer is running for respondent.
  4. `Resolved This Month`: Total successfully concluded disputes.
- **Data Table**:
  - Columns: Ticket Code, Session/Plan, Complainant (Mentee), Respondent (Mentor), Category, Amount (VND), Submitted At, Status, Action.
  - Search & Filters: Search by ticket code or user name; filter by Status and Category.
  - Action button: `.btn.btn-sm.btn-primary` -> "Review Ticket".

---

### US-S2: Dispute Inspection & Evidence Analysis
- **As a** Staff member opening a dispute,
- **I want to** review all incident data, initial images in a high-resolution lightbox, and historical platform activity,
- **So that** I understand the context before contacting the parties.

#### Inspection Panel Content
1. **Dispute Metadata**:
   - Ticket Code, Date & Time filed.
   - Category and Complainant statement.
   - Booking/Subscription details: Mentor name, Mentee name, scheduled start/end time, service package name, paid amount (VND).
2. **Initial Evidence Gallery**:
   - Grid of uploaded image thumbnails.
   - Clicking an image opens a modal lightbox with zoom and high-resolution view.
3. **Escrow Status Notice**:
   - Visual alert indicating: `Escrow Hold: FROZEN (Amount: X,XXX,XXX VND)`.
4. **Platform Audit Snapshot**:
    - Quick indicators: Did the mentor share an external meeting link in the workspace? When was it shared? Did either party report joining, waiting, or encountering an error in workspace messages? Number of messages exchanged before the dispute.
    - HappyProgramming does not generate meeting links or record attendance in an external meeting service. Staff decisions rely on immutable workspace messages, booking timestamps, and evidence submitted by both parties.

---

### US-S3: Intake & Opening the 3-Party Mediation Room
- **As a** Staff member,
- **I want to** click "Open 3-Party Mediation Room" to assign myself and convene the participants,
- **So that** the formal arbitration process begins.

#### Intake Actions
1. Staff clicks **"Open Mediation Room"**:
   - Staff user is assigned as `assigned_staff_id`.
   - Dispute transitions to `IN_MEDIATION`.
   - Sets `response_deadline_at = NOW() + 24 hours` (configurable up to 48 hours).
   - Generates automated system greeting in the room:
     > *"Welcome to HappyProgramming Dispute Mediation. Staff Member [Name] has been assigned as your arbitrator. Mentor [Name] has 24 hours to provide their statement and counter-evidence. Please maintain professional and respectful communication."*
   - System dispatches notifications & emails to Mentee and Mentor.

---

### US-S4: Staff Moderation in 3-Party Chat
- **As a** Staff arbitrator inside the dispute room,
- **I want to** guide the discussion, ask targeted questions, and request additional proof from either party,
- **So that** I have unequivocal facts to base my judgment on.

#### Staff Moderation Features
1. Send official Staff messages with distinct highlight styling: purple background pill `[Staff Arbitrator - Name]`.
2. Pin an **Official Notice / Directive** to the top of the chat (e.g., *"Staff requested Mentor to provide the external meeting link, relevant workspace messages, and timestamped attendance evidence by 15:00"*).
3. If the Mentor's response countdown expires without any message or evidence:
   - System displays a prominent warning to Staff: `[!] Respondent failed to submit evidence within 24h. Default resolution enabled.`
   - Staff can proceed directly to resolve without further delay.

---

### US-S5: Executing Binding Resolution & Financial Settlement
- **As a** Staff member who has reviewed all evidence and statements,
- **I want to** select the appropriate resolution from the side control panel, enter a required written justification, and execute the outcome,
- **So that** the dispute is finalized, the room is archived, and the escrow ledger is updated correctly.

#### Resolution Control Panel (Modal / Sidebar)
Staff selects from 4 standardized outcomes:

| Outcome Option | Typical Criteria | Escrow & Financial Action |
| :--- | :--- | :--- |
| **1. Full Refund (`FULL_REFUND`)** | Mentor no-show, unverified qualifications, refusal to teach, or unresponsiveness > 72h. | 100% of payment queued for Mentee refund. 0 VND to Mentor wallet. |
| **2. Prorated Partial Refund (`PARTIAL_REFUND`)** | Monthly trial cancellation (calculated via spec 014 formula), or partial sessions completed. | Staff enters refund amount (VND) or percentage. Balance minus commission credited to Mentor wallet; refund portion queued for Mentee. |
| **3. Reschedule / Mutual Settlement (`RESCHEDULE`)** | Technical platform glitch or mutual scheduling conflict where both agree to a makeup session. | Booking rescheduled to agreed slot. Escrow hold reinstated until new session finishes. |
| **4. Dismiss / Reject (`REJECTED`)** | Mentee made unsubstantiated claim; Mentor proved full attendance and compliance. | 0 VND refund. Escrow freeze removed; mentor earnings proceed to normal release schedule. |

#### Resolution Execution Requirements
1. **Mandatory Justification**: Staff must provide a written **Decision Note** (minimum 50 characters) explaining the findings and contractual basis. This note is permanently visible to both Mentee and Mentor.
2. **Atomic Ledger Settlement**:
   - For refunds: Appends an immutable `ESCROW_REFUND_DEBIT` record to the escrow ledger with the dispute ticket reference.
   - For payouts: Unfreezes the hold and permits the scheduled release job to proceed.
3. **Room Archival**:
   - The dispute room chat is immediately locked: `is_locked = TRUE`.
   - No further messages or uploads are accepted from any party.
   - Status badge updates to `● RESOLVED` or `● REJECTED`.
4. **Email / In-App Notifications**:
   - Immediate notification dispatched to both parties containing the verdict and decision note.

---

## 5. Detailed Dispute Scenarios & Resolution Matrix

The following catalog defines all authorized dispute categories, required proof standards, and binding adjudications.

### 5.1 One-Off Session Scenarios

| Case Code | Scenario Description | Required Complainant Evidence | Required Respondent Counter-Proof | Standard Adjudication |
| :--- | :--- | :--- | :--- | :--- |
| **CASE-1A** | **Mentor No-Show**: Mentor failed to share a usable external meeting link or did not attend within 15 minutes of the scheduled start time. | Timestamped workspace messages showing the mentee requested access or reported waiting without a response; optional screenshot from the external meeting service. | Workspace message containing the external meeting link and timestamped evidence showing the mentor was available within the first 15 minutes. | **Full Refund (100%)** to Mentee, 0 VND to Mentor. Mentor receives warning strike. |
| **CASE-1B** | **Mentee No-Show**: Mentee failed to attend without prior notice >= 12h. | N/A (Mentee filed false claim). | Workspace messages showing the external meeting link was provided and the mentor contacted the mentee during the session window, plus optional timestamped evidence from the external meeting service. | **Dismiss Dispute (0% Refund)**. Full earnings credited to Mentor wallet. |
| **CASE-1C** | **Session Interrupted / Late Cancellation by Mentor**: Mentor canceled < 2h before or left before 50% of agreed duration. | Screenshot of the workspace cancellation notice, relevant messages, or timestamped evidence from the external meeting service. | Legitimate emergency justification with evidence; agreement to makeup. | Option to **Reschedule (Makeup session)**; if Mentee declines, **Full Refund (100%)**. |
| **CASE-1D** | **Material Curriculum/Quality Breach**: Mentor taught entirely unrelated topic or lacked baseline expertise pledged in offering. | Screenshot of session notes, chat transcript, or code review demonstrating breach of agreed syllabus. | Proof of pre-session agreement on topic covered, or session delivery notes. | If breach verified: **Full Refund (100%)** or **Partial Refund (50%)** depending on severity. |
| **CASE-1E** | **Technical Failure**: HappyProgramming workspace failed, or the mentor-provided external meeting link/service failed unexpectedly. | Error screenshot and relevant workspace messages; optional network or external-service error details from either party. | Confirmation of the technical error and any available timestamped evidence from both sides. | **Reschedule (Default)** to mutually agreed slot; or **Full Refund (100%)** if no slot can be agreed within 7 days. |

---

### 5.2 Monthly Mentorship Scenarios (30-Day Packages)

| Case Code | Scenario Description | Required Complainant Evidence | Required Respondent Counter-Proof | Standard Adjudication |
| :--- | :--- | :--- | :--- | :--- |
| **CASE-2A** | **Trial Cancellation (Days 1–7)**: Mentee cancels within the 7-day trial window due to lack of compatibility. | Submission of dispute / cancellation request within 7 calendar days of activation. | N/A (Mentee statutory trial right under Spec 014). | **Prorated Trial Refund**: Mentee pays for used days ($D_{\text{used}}$), refunded for unutilized days ($30 - D_{\text{used}}$). |
| **CASE-2B** | **Mentor Abandonment (Ghosting)**: Mentor stops responding to messages/reviews for > 72 consecutive hours during active cycle. | Screenshot of chat workspace showing unanswered queries over 3+ consecutive business days. | Proof of timely communication, or documented agreed leave of absence. | **Prorated Refund + Penalty**: Refund of remaining cycle days; mentor earnings forfeited for abandoned period. |
| **CASE-2C** | **Partial Session Delivery**: Package included $N_{\text{total}}$ live 1-on-1 calls, but mentor only completed $N_{\text{completed}} < N_{\text{total}}$ calls before cycle end. | Workspace booking history showing unfulfilled calls, chat showing mentor refused or postponed indefinitely. | Proof that mentor offered valid slots and mentee refused to book them. | **Pro-Rata Session Refund**: Refund calculated by ratio of undelivered sessions. |
| **CASE-2D** | **Academic Integrity Violation**: Mentee demands mentor to write exam/take test/do unauthorized school project; mentor refuses. | N/A (Mentee files complaint out of spite). | Mentor uploads screenshot of mentee's illicit exam/homework request and mentor's polite refusal. | **Dismiss Dispute (0% Refund)**. Full payment to mentor; warning strike issued to Mentee for academic dishonesty. |
| **CASE-2E** | **Harassment, Hate Speech or Threats**: Either party uses derogatory, abusive, or predatory language. | Unredacted screenshots of chat messages or audio/video recording snippets. | Counter-transcript or context demonstrating provocation/forgery. | **Immediate Termination**: If mentor guilty -> **100% Refund** + account ban; if mentee guilty -> **0% Refund** + account ban. |

---

## 6. Financial Settlement Rules & Mathematical Formulas

All refund and payout calculations are strictly deterministic, idempotent, and executed directly upon the internal escrow ledger.

### 6.1 Formula 1: Full Refund (100% Hoàn tiền)
Used when mentor breached obligations, no-showed, or abandoned service:
$$\text{Refund Amount}_{\text{Mentee}} = P_{\text{paid}}$$
$$\text{Mentor Payout} = 0\text{ VND}$$
$$\text{Platform Commission} = 0\text{ VND}$$
*The full original payment $P_{\text{paid}}$ is queued for bank transfer return to the mentee. Zero earnings are credited to the mentor.*

---

### 6.2 Formula 2: Prorated 7-Day Trial Refund (Monthly Mentorship)
Aligned with **Spec 014**, when a mentee cancels during the first 7 days ($T \le 7\text{ days}$):
1. **Days Used Calculation ($D_{\text{used}}$)**:
   $$D_{\text{used}} = \max\left(1, \min\left(7, \left\lceil \frac{\text{Dispute Filed Timestamp} - \text{Activation Timestamp}}{24 \text{ hours}} \right\rceil\right)\right)$$
2. **Mentee Refund Amount**:
   $$\text{Refund Amount}_{\text{Mentee}} = P_{\text{paid}} \times \frac{30 - D_{\text{used}}}{30}$$
3. **Retained Service Fee**:
   $$\text{Retained Amount} = P_{\text{paid}} - \text{Refund Amount}_{\text{Mentee}} = P_{\text{paid}} \times \frac{D_{\text{used}}}{30}$$
4. **Mentor Compensation**:
   $$\text{Mentor Payout} = \text{Retained Amount} \times \left(1 - \frac{C_{\text{rate}}}{100}\right)$$
5. **Platform Revenue**:
   $$\text{Platform Revenue} = \text{Retained Amount} \times \frac{C_{\text{rate}}}{100}$$
   *(where $C_{\text{rate}}$ is the snapshot platform commission rate, typically 20%).*

---

### 6.3 Formula 3: Partial Session Pro-Rata Refund (Gói cam kết nhiều buổi)
Used when a package includes a fixed number of calls $N_{\text{total}}$, but only $N_{\text{completed}}$ were actually delivered:
1. **Undelivered Ratio**:
   $$R_{\text{undelivered}} = \frac{N_{\text{total}} - N_{\text{completed}}}{N_{\text{total}}}$$
2. **Mentee Refund Amount**:
   $$\text{Refund Amount}_{\text{Mentee}} = P_{\text{paid}} \times R_{\text{undelivered}}$$
3. **Earned Portion**:
   $$\text{Earned Portion} = P_{\text{paid}} \times \left(1 - R_{\text{undelivered}}\right)$$
4. **Mentor Share & Platform Share**:
   $$\text{Mentor Payout} = \text{Earned Portion} \times \left(1 - \frac{C_{\text{rate}}}{100}\right)$$
   $$\text{Platform Revenue} = \text{Earned Portion} \times \frac{C_{\text{rate}}}{100}$$

---

### 6.4 Formula 4: Dispute Dismissal / Mentee Fault (0% Refund - Bác đơn)
Used when claim is unsubstantiated or mentee committed willful no-show:
$$\text{Refund Amount}_{\text{Mentee}} = 0\text{ VND}$$
$$\text{Mentor Payout} = P_{\text{paid}} \times \left(1 - \frac{C_{\text{rate}}}{100}\right)$$
$$\text{Platform Revenue} = P_{\text{paid}} \times \frac{C_{\text{rate}}}{100}$$
*Escrow hold is unblocked. Mentor funds transition into the normal wallet release pipeline.*

---

### 6.5 Operational Refund Execution by Administration
1. Because initial payment was made via SePay bank transfer to the HappyProgramming business account, refunds are disbursed via **Direct Interbank Transfer** to the Mentee's verified bank account.
2. In the resolution modal, Staff specifies or confirms the Mentee's recipient bank details (Bank Name, Account Number, Account Holder Name).
3. System creates a `REFUND_PENDING` financial payout queue item.
4. When Administrator executes the transfer, they enter the bank reference code (`bank_ref_code`) and upload the transfer receipt, transitioning the refund to `REFUND_COMPLETED`.

---

## 7. Security, Authorization & Audit Rules

1. **Strict 3-Party Isolation**:
   - Only the specific `complainant_id`, `respondent_id`, and authorized `Staff` (or `Admin`) can view or participate in a dispute room.
   - Unrelated mentees or mentors attempting to access `/api/disputes/{id}` receive `403 Forbidden`.
2. **Immutable Audit History**:
   - Messages, images, and evidence files can **never be deleted or edited** by any user once sent.
   - File uploads are quarantined to the dispute's private directory and checked for MIME/magic bytes to prevent malicious executables.
3. **Escrow Invariant**:
   - Under no circumstances may an automated release job move escrow funds to a mentor wallet while `dispute_status` is `SUBMITTED`, `IN_MEDIATION`, or `AWAITING_EVIDENCE`.
   - A dispute resolution cannot produce negative balances or refund amounts greater than the original transaction amount.

---

## 8. Success Metrics & Non-Functional Criteria

- **Time to First Mediation (TTM)**: Staff opens 3-party room within **12 business hours** of dispute filing.
- **Resolution Turnaround (TTR)**: Disputes resolved within **48 hours** from room opening.
- **Evidence Integrity**: 100% of filed disputes possess at least 1 verified photographic proof artifact.
- **Zero Double-Spend**: Absolute zero duplicate refund or duplicate escrow releases on disputed sessions.
