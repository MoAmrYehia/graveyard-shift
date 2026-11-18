# The Doppelgänger

A trainee should be able to finish a first on-call investigation in one browser session.

1. On opening GS-001, the console shows the settlement source total, the published ledger total, their difference in AED, and links to the evidence.
2. The trainee can inspect individual source transactions, delivery attempts, and warehouse rows. Pinned exhibits appear in the shift report.
3. When the trainee runs a candidate projection, the console executes the submitted SQL against synthetic deliveries. It compares transaction IDs and integer amounts with the source of record.
4. Verification replays the disputed batch twice and introduces a new, same-value transaction first seen on a later delivery attempt. Every original transaction and the control transaction must survive once with its correct amount.
5. Only a successful verification closes the incident. Editing the SQL invalidates the displayed proof. The trainee can export the verified repair, case evidence and check results.
6. The built-in field guide and complete case must work without a cloud account. Hints used and attempts are visible in the handover.
