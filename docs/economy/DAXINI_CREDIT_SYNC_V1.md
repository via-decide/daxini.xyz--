# DAXINI_CREDIT_SYNC_V1

## System

### Credit Registry

- Canonical mapping: `userId -> balance`.
- Deterministic history ledger per user.
- Idempotent transaction processing via `txId` deduplication.

### Sync Engine

- Validates cross-app events (`Alchemist`, `Daxini`, `Zayvora`).
- Applies atomic debit/credit to centralized registry.
- Broadcasts updated balance payload after each processed event.

## API

- `getBalance(userId)`
- `updateBalance(userId, delta)`
- `recordTransaction(type, amount)`
- `processEvent(event)`
- `validateTransaction(event)`

## Rules

- No local-only credit writes allowed.
- All apps sync through one registry.
- Transactions are atomic and idempotent.

## Wallet Integration (future-ready)

- Wallet metadata supported with `wallet.provider` (e.g. Razorpay/UPI).
- Credit intake can be sourced from payment conversion events.
- Credits can be debited for content unlock transactions.

## Anti-Exploit

- No double refund / double spend via `txId` dedupe.
- No negative balances (debit guard).
- No invalid events (app/direction/amount/user/tx validation).

## Execution Flow

User action (Alchemist / Daxini)
→ credit event triggered
→ sync engine validates
→ registry updates balance
→ broadcasts updated balance to apps

## Success Criteria Mapping

- Consistency: shared registry is the source of truth.
- Near real-time sync: broadcast hook emits each event result.
- Mismatch prevention: deterministic transaction and dedupe controls.

## Definition of Done

- [x] Registry implemented.
- [x] Sync engine working.
- [x] Transaction validation working.
- [x] Alchemist integration path verified by test event.
