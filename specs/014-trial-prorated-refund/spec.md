# Feature Specification: 014-trial-prorated-refund

## 1. Context & Motivation
Under the initial HappyProgramming platform design, monthly mentorship plans offered a "7-day free trial" with a 100% refund upon cancellation within the 7-day window. In real-world operation, this creates a severe moral hazard / abuse risk where learners could consume up to 7 full days of mentor time, technical chat assistance, and code reviews, and subsequently cancel on day 7 to retrieve 100% of their payment. This unfairly exploits mentors' technical labor without compensation.

This feature updates the 7-day cancellation policy to **Prorated Refund (Phương án A)**:
When a mentee cancels during the 7-day trial window:
1. The mentee pays exclusively for the days they actually used ($D_{\text{used}}$).
2. The remaining unutilized days ($30 - D_{\text{used}}$) are refunded to the mentee.
3. The mentor receives the net earnings for the utilized days (less the platform commission rate), compensating them fairly for time already invested.

---

## 2. User Outcomes & Scenarios

### US-01: Prorated Trial Cancellation for Mentee
- **As a** Mentee in an active 7-day trial window of a monthly mentorship subscription,  
  **I want to** cancel my mentorship subscription if it is not a mutual fit,  
  **So that** I only pay for the exact days I received mentorship, and receive a prompt refund for all remaining days in the 30-day billing cycle.

#### Scenario 1: Cancellation on Day 3 of 30-Day Cycle
- **Given** an agreed monthly plan price of 3,000,000 VND (100,000 VND/day across 30 days) activated at $T_0$,
- **When** the mentee cancels at $T = 3$ days (within the 7-day trial window),
- **Then** the utilized fee is calculated as $3 \times 100,000 = 300,000\text{ VND}$,
- **And** the mentee is refunded $27 \times 100,000 = 2,700,000\text{ VND}$ via VNPay,
- **And** workspace access is terminated immediately.

#### Scenario 2: Cancellation on Day 1 (Immediate / Within 24 Hours)
- **Given** a mentee who cancels within the first calendar day ($D_{\text{used}} = 1$),
- **When** cancellation occurs,
- **Then** the mentee is charged for 1 day, and refunded 29/30 of the plan price.

#### Scenario 3: Attempted Cancellation After Day 7
- **Given** a subscription where $T > 7$ days from activation,
- **When** the mentee views or requests cancellation,
- **Then** the trial refund window is closed (`subscriptions.status = ACTIVE`); cancellation stops future renewal at period end (`cancel_at_period_end = 1`) without retroactive refund for the current cycle.

---

### US-02: Fair Mentor Compensation for Trial Days
- **As a** Mentor whose mentee cancels during the trial window,  
  **I want to** receive net earnings for the days I actively provided guidance,  
  **So that** my time, advice, and effort are not exploited without remuneration.

#### Scenario 1: Mentor Earning Allocation
- **Given** the 300,000 VND retained for 3 utilized days and a platform commission rate of 20%,
- **When** the cancellation is processed,
- **Then** the mentor's ledger is credited $300,000 \times (1 - 0.20) = 240,000\text{ VND}$,
- **And** platform revenue receives $60,000\text{ VND}$.

---

### US-03: Transparent Presentation on Pricing Cards
- **As a** prospective Mentee browsing mentor packages,  
  **I want to** see honest, accurate copy explaining the 7-day trial policy,  
  **So that** I understand I will only pay for days used if I decide to cancel.

---

## 3. Mathematical Formula & Business Rules

1. **Cycle Duration**: Standardized to 30 days per monthly mentorship cycle.
2. **Utilized Days Calculation**:
   $$D_{\text{used}} = \max\left(1, \min\left(7, \left\lceil \frac{\text{Cancellation Time} - \text{Activation Time}}{24 \text{ hours}} \right\rceil\right)\right)$$
3. **Refund Amount (Mentee)**:
   $$\text{Refund Amount} = \text{Agreed Price} \times \frac{30 - D_{\text{used}}}{30}$$
4. **Retained Amount**:
   $$\text{Retained Amount} = \text{Agreed Price} - \text{Refund Amount}$$
5. **Mentor Payout**:
   $$\text{Mentor Payout} = \text{Retained Amount} \times \left(1 - \frac{\text{Commission Rate}}{100}\right)$$
