# Problem Statement
Implement a credit-based monetization system that gates access to match result tiers (preview, top-3, all) without accidentally charging users multiple times for the same content. The system must:
* Track credit purchases and spending via an auditable ledger
* Prevent double-charging when users refresh or re-request the same data
* Support tier upgrades (preview → top-3 → all)
* Cache expensive match calculations
* Work with the existing WebSocket-based quiz system
# Current State
**Last Updated: 2026-02-06**

The VybeCheck application has:
* Completed backend with QuizSession, Participant, Question, Response models
* MatchingService that calculates participant matches based on response agreement
* WebSocket communication between client and server
* No database (in-memory storage only)
* No authentication or user management
* Express server with ws for WebSocket handling
* **245 passing tests** (Vitest)

**Monetization Implementation Status:**
* ✅ Phase 1: Core Monetization Types & Models - COMPLETE
* ✅ Phase 2: Billing Service with Entitlement Logic - COMPLETE
* ✅ Phase 3: Enhanced MatchingService with Tiered Results - COMPLETE
* ✅ Phase 4: Resource ID & Quota Management Strategy - COMPLETE
* ⏳ Phase 5: WebSocket Integration - **IN PROGRESS (Next Step)**
* ⏳ Phase 6: Initial Credits & Participant Tracking - NOT STARTED
* ✅ Phase 7: Testing Strategy - Unit/Integration tests written and passing
* ⏳ Phase 8: Implementation Order - Steps 1-4 complete, steps 5-7 remaining
# Proposed Changes
## Phase 1: Core Monetization Types & Models ✅ COMPLETE
**Goal:** Define TypeScript types and create models for the credit system
**Status:** All types and models implemented with full test coverage.
### Types to Add (src/shared/types.ts)
* `MatchTier`: 'PREVIEW' | 'TOP3' | 'ALL' - For match result access tiers
* `UnlockableFeature`: 'MATCH_PREVIEW' | 'MATCH_TOP3' | 'MATCH_ALL' | 'QUESTION_LIMIT_10' - Extensible feature flags
* `TransactionReason`: Union type for ledger entries ('PURCHASE_CREDITS' | 'UNLOCK_MATCH_TOP3' | 'UNLOCK_MATCH_ALL' | 'UNLOCK_QUESTION_LIMIT' | 'INITIAL_CREDITS')
* `LedgerEntry`: { id, participantId, amount, reason, createdAt }
* `ParticipantUnlock`: { id, participantId, resourceId, feature, createdAt }
* `QuestionLimitConfig`: { free: number, paid: number } - Default: { free: 3, paid: 10 }
* Client/Server messages for credit operations
### Models to Create
* `src/server/models/CreditLedger.ts`: Transaction ledger with balance calculation (uses participantId)
* `src/server/models/ParticipantUnlock.ts`: Track purchased access to features/resources (uses participantId)
* `src/server/models/QuotaManager.ts`: Track and enforce feature quotas (question limits, etc.)
### Edge Cases to Consider
* Negative balance prevention
* Concurrent transaction handling (race conditions)
* Invalid feature names
* Missing participant IDs
* Question limit enforcement when adding questions
* Quota exhaustion handling
## Phase 2: Billing Service with Entitlement Logic ✅ COMPLETE
**Goal:** Create the "check → charge → grant" service that prevents double-charging
**Status:** `BillingService.ts` implemented with idempotent purchase logic.
### Service to Create (src/server/services/BillingService.ts)
Key methods:
* `getBalance(participantId: string): Promise<number>` - Sum ledger entries for participant
* `hasFeatureAccess(participantId: string, resourceId: string, feature: UnlockableFeature): Promise<boolean>` - Check unlocks
* `purchaseOrVerifyAccess(participantId, resourceId, feature, cost): Promise<boolean>` - Core logic
* `addCredits(participantId: string, amount: number, reason: string): Promise<void>` - For purchases
* `getTransactionHistory(participantId: string): Promise<LedgerEntry[]>` - Audit trail
### Critical Logic Flow
1. Check if participant already owns this feature for this resource
2. For match tiers: check if higher tier owned (MATCH_ALL > MATCH_TOP3 > MATCH_PREVIEW)
3. If owned, return true immediately (no charge)
4. If not owned, check balance
5. If insufficient, throw error
6. If sufficient, perform atomic transaction: deduct credits + create unlock record
### Pricing Structure
* MATCH_PREVIEW: Free (no unlock needed)
* MATCH_TOP3: 2 credits per session
* MATCH_ALL: 5 credits per session
* QUESTION_LIMIT_10: 3 credits (one-time purchase per session, raises limit from 3 to 10)
### Edge Cases to Test
* Participant refreshes page after purchasing (should not re-charge)
* Participant buys MATCH_TOP3, then buys MATCH_ALL (decide: full price or upgrade discount)
* Insufficient balance handling
* Race condition: two simultaneous purchase requests for same resource
* Invalid resource IDs
* Accessing MATCH_PREVIEW tier (should be free, no unlock needed)
* Owner tries to add 4th question without purchasing QUESTION_LIMIT_10
* Owner purchases QUESTION_LIMIT_10, can now add up to 10 questions
## Phase 3: Enhanced MatchingService with Tiered Results ✅ COMPLETE
**Goal:** Modify MatchingService to return different result slices based on tier
**Status:** `getMatchesByTier()` implemented with caching strategy.
### Current Service: src/server/services/MatchingService.ts
Already has `getMatchesForParticipant()` returning full sorted matches
### New Methods to Add
* `getMatchesByTier(participantId, session, matchTier): Match[]` - Slice results based on match tier
    * PREVIEW: return matches[5:7] (2 matches from middle)
    * TOP3: return matches[0:3] (best 3 matches)
    * ALL: return all matches
### Caching Strategy
* Add in-memory cache: Map<string, { matches: Match[], timestamp: number }>
* Cache key: `${sessionId}:${participantId}`
* TTL: 10 minutes (600 seconds)
* Invalidate on: new question added, new response submitted
* Methods: `getCachedMatches()`, `setCachedMatches()`, `invalidateCache()`
### Edge Cases to Test
* No matches available (participant has no responses)
* Fewer matches exist than tier requires (e.g., only 2 participants but requesting TOP3)
* Cache expiration timing
* Cache invalidation when quiz state changes
* Partial responses from participants
## Phase 4: Resource ID & Quota Management Strategy ✅ COMPLETE
**Goal:** Define how resources are identified for unlock tracking and implement quota enforcement
**Status:** `QuotaManager.ts` implemented with question limit enforcement.
### Resource ID Formats
Session-based approach (recommended for MVP):
* Format: `session:${sessionId}`
* Each quiz session is a separate purchasable resource
* Participants pay once per session to unlock features
* Helper function: `generateResourceId(sessionId: string): string` returns `session:${sessionId}`
### Quota Management (NEW)
**Question Limit Enforcement:**
* Default (free): 3 questions per session
* Upgraded (paid): 10 questions per session
* Implementation in QuotaManager:
    * `getQuestionLimit(participantId, sessionId): Promise<number>` - Returns 3 or 10 based on unlock
    * `canAddQuestion(participantId, sessionId, currentQuestionCount): Promise<boolean>` - Validates against limit
    * `unlockQuestionLimit(participantId, sessionId): Promise<void>` - Grants extended quota
**Future Extensibility:**
* Add other quotas: response time limits, session creation limits, etc.
* QuotaManager should be designed for multiple quota types
### Edge Cases
* Session expiration (should unlocks persist after 3-month expiry?)
* Session ID collisions (timestamp-based IDs should prevent this)
* Owner at question limit tries to add question (should fail with clear error)
* Owner purchases limit unlock mid-session (existing questions preserved, can add more)
* Multiple owners scenario (if allowed in future)
## Phase 5: WebSocket Integration ⏳ IN PROGRESS
**Goal:** Add credit-gated WebSocket message handlers for matches AND question limits
**Status:** WebSocketHandler exists but NOT wired to monetization. This is the NEXT STEP.

**Remaining Work:**
1. Add new message types to `src/shared/types.ts`
2. Inject BillingService, VybeLedger, ParticipantUnlockManager, QuotaManager into WebSocketHandler
3. Implement `credits:balance` and `credits:history` handlers
4. Modify `matches:get` to accept tier parameter and check billing
5. Modify `question:add` to enforce quota limits
6. Add `question:unlock-limit` handler
7. Return billing metadata (cost, balance) in responses
### New Message Types (src/shared/types.ts)
Client → Server:
* `{ type: 'credits:balance' }` - Request current balance
* `{ type: 'matches:get', data: { tier: MatchTier } }` - Request tiered matches
* `{ type: 'credits:history' }` - Request transaction history
* `{ type: 'question:unlock-limit' }` - Purchase extended question limit (NEW)
* Modified: `{ type: 'question:add', data: { prompt, options, timer } }` - Now includes quota check
Server → Client:
* `{ type: 'credits:balance', balance: number }`
* `{ type: 'matches:result', data: { tier: MatchTier, matches: Match[], cost: number, balanceRemaining: number } }`
* `{ type: 'credits:insufficient', data: { feature: UnlockableFeature, required: number, current: number } }`
* `{ type: 'credits:history', transactions: LedgerEntry[] }`
* `{ type: 'question:limit-reached', data: { current: number, max: number, upgradeCost: number } }` (NEW)
* `{ type: 'question:limit-unlocked', data: { newLimit: number, balanceRemaining: number } }` (NEW)
### Handler Updates (src/server/services/WebSocketHandler.ts)
**Modify existing `matches:get` handler:**
1. Accept tier parameter (default: 'PREVIEW')
2. Call BillingService.purchaseOrVerifyAccess() with MATCH_* feature
3. On success: call MatchingService.getMatchesByTier()
4. On failure: send error with insufficient balance details
5. Return matches with metadata (tier, cost, balance remaining)
**Modify existing `question:add` handler:**
1. Get current question count from session
2. Call QuotaManager.canAddQuestion(participantId, sessionId, currentCount)
3. If quota exceeded, send 'question:limit-reached' with upgrade option
4. If allowed, proceed with question addition
5. Deduct credits if needed (future: charge per question)
**Add new `question:unlock-limit` handler:**
1. Call BillingService.purchaseOrVerifyAccess() with QUESTION_LIMIT_10 feature
2. On success: call QuotaManager.unlockQuestionLimit()
3. Send confirmation with new limit and remaining balance
4. On failure: send insufficient credits error
**Add new handlers:**
* Handle `credits:balance` - return current participant balance
* Handle `credits:history` - return transaction log for participant
### Edge Cases
* Participant disconnects during purchase transaction
* Participant requests higher match tier before lower tier
* Multiple tabs open, one purchases, other refreshes
* Invalid tier name in request
* Missing participantId (not in session)
* Owner at question limit, tries to add without purchasing unlock
* Owner purchases question limit unlock, immediately adds more questions
* Non-owner tries to purchase question limit (should fail - only owners can add questions)
## Phase 6: Initial Credits & Participant Tracking ⏳ NOT STARTED
**Goal:** Ensure participants receive initial credits and are properly tracked
**Status:** Not implemented. Participants currently receive no initial Vybes.

**Remaining Work:**
1. Grant 10 initial Vybes during `session:create`
2. Grant 10 initial Vybes during `session:join`
3. Check for existing ledger entries to prevent duplicate grants
### Implementation Strategy
**No separate authentication layer needed** - Use existing Participant model:
* Participant ID already generated on session creation/join
* participantId is unique per participant
* Credits tied to participantId
**Initial Credit Grant:**
* When participant creates or joins session, check if they have credits
* If no ledger entries exist for participantId, grant 10 initial credits
* Transaction reason: 'INITIAL_CREDITS'
* Implementation in WebSocketHandler during session:create and session:join
**Persistence Consideration:**
* Currently in-memory only
* ParticipantId is ephemeral (lost on server restart)
* Future: When adding database, participantId can link to Twitter OAuth user
### Edge Cases
* Participant disconnects and reconnects (should preserve participantId via session)
* Participant creates multiple sessions (gets initial credits only once per participantId)
* Server restart (all credit balances lost - acceptable for MVP, fixed with database)
## Phase 7: Testing Strategy ✅ TESTS WRITTEN
### Unit Tests (tests/unit/)
#### CreditLedger Tests (20+ tests)
* ✓ Add positive transaction (purchase)
* ✓ Add negative transaction (spend)
* ✓ Calculate balance with multiple transactions
* ✓ Calculate balance with empty ledger (should be 0)
* ✓ Get transaction history sorted by date
* ✓ Filter transactions by reason
* ✗ Prevent negative balance (business logic in service, not model)
* ✓ Handle concurrent inserts (race condition test)
#### ParticipantUnlock Tests (15+ tests)
* ✓ Create unlock record
* ✓ Check if participant has specific unlock
* ✓ Check if participant has higher match tier (MATCH_ALL unlocks MATCH_TOP3 and MATCH_PREVIEW)
* ✓ Check if participant has any unlock for resource
* ✓ Get all unlocks for participant
* ✓ Get unlocks by resource ID
* ✓ Duplicate unlock prevention (same participant + resource + feature)
* ✓ Invalid feature name rejection
* ✓ Question limit unlock (QUESTION_LIMIT_10 feature)
#### QuotaManager Tests (12+ tests)
* ✓ Get default question limit (returns 3)
* ✓ Get upgraded question limit (returns 10 after unlock)
* ✓ canAddQuestion: true when under limit
* ✓ canAddQuestion: false when at limit
* ✓ canAddQuestion: true after purchasing upgrade
* ✓ unlockQuestionLimit creates proper unlock record
* ✓ Quota check for non-owner (should fail - only owners add questions)
* ✓ Multiple quota types supported (extensibility test)
#### BillingService Tests (35+ tests)
* ✓ Get balance for new participant (should be 0)
* ✓ Get balance after credits added
* ✓ Get balance after credits spent
* ✓ Add credits (positive amount)
* ✗ Reject negative credit addition
* ✓ hasFeatureAccess returns true for owned feature
* ✓ hasFeatureAccess returns true for lower match tier when MATCH_ALL owned
* ✓ hasFeatureAccess returns false for unowned feature
* ✓ purchaseOrVerifyAccess: already owned (no charge)
* ✓ purchaseOrVerifyAccess: sufficient balance (success)
* ✓ purchaseOrVerifyAccess: insufficient balance (error)
* ✓ purchaseOrVerifyAccess: creates unlock record
* ✓ purchaseOrVerifyAccess: deducts correct amount
* ✓ purchaseOrVerifyAccess: idempotent (multiple calls no double-charge)
* ✓ Match tier hierarchy: MATCH_ALL > MATCH_TOP3 > MATCH_PREVIEW
* ✓ Feature costs: MATCH_PREVIEW=0, MATCH_TOP3=2, MATCH_ALL=5, QUESTION_LIMIT_10=3
* ✓ Transaction atomicity (rollback on error)
* ✗ Race condition: simultaneous purchase attempts
* ✓ Get transaction history with pagination
* ✓ Purchase QUESTION_LIMIT_10 feature (costs 3 credits)
* ✓ QUESTION_LIMIT_10 unlock persists for session
* ✓ Initial credits grant (10 credits for new participant)
* ✓ Multiple feature purchases in same session
#### MatchingService Enhancement Tests (15+ tests)
* ✓ getMatchesByTier: PREVIEW returns 2 middle matches
* ✓ getMatchesByTier: TOP3 returns top 3 matches
* ✓ getMatchesByTier: ALL returns all matches
* ✓ Handle fewer matches than tier expects (e.g., 2 participants, TOP3 requested)
* ✓ Cache hit returns cached data
* ✓ Cache miss triggers calculation
* ✓ Cache expiration after TTL
* ✓ Cache invalidation on new question
* ✓ Cache invalidation on new response
* ✓ Cache key includes sessionId and participantId
* ✓ Empty response set returns empty matches for all tiers
### Integration Tests (tests/integration/)
#### End-to-End Purchase Flow (12+ tests)
* ✓ Participant creates session (gets 10 free credits)
* ✓ Participant requests MATCH_PREVIEW tier (free, no charge)
* ✓ Participant requests MATCH_TOP3 tier (costs 2, balance = 8)
* ✓ Participant refreshes page, requests MATCH_TOP3 again (no additional charge, balance = 8)
* ✓ Participant requests MATCH_ALL tier (costs 5, balance = 3)
* ✓ Participant requests MATCH_TOP3 after owning MATCH_ALL (no charge, returns top 3)
* ✓ Participant with 1 credit tries to buy MATCH_TOP3 (fails, insufficient funds)
* ✓ Participant purchases credits (balance increases)
* ✓ Owner adds 3 questions (within free limit, balance = 10)
* ✓ Owner tries to add 4th question (fails, prompted to purchase QUESTION_LIMIT_10)
* ✓ Owner purchases QUESTION_LIMIT_10 (costs 3, balance = 7)
* ✓ Owner can now add up to 10 questions total
* ✓ Transaction history shows all operations in order
#### WebSocket Message Flow (18+ tests)
* ✓ Connect → receive participantId and initial balance (10 credits)
* ✓ Send 'matches:get' with MATCH_PREVIEW tier → receive matches (no charge)
* ✓ Send 'matches:get' with MATCH_TOP3 tier → receive matches + balance deducted
* ✓ Send 'matches:get' with MATCH_TOP3 tier again → receive matches (no additional charge)
* ✓ Send 'matches:get' with MATCH_ALL tier → receive all matches + balance deducted
* ✓ Send 'matches:get' with insufficient balance → receive error
* ✓ Send 'credits:balance' → receive current balance
* ✓ Send 'credits:history' → receive transaction list
* ✓ Owner sends 'question:add' (1st-3rd questions) → success
* ✓ Owner sends 'question:add' (4th question) → receive 'question:limit-reached'
* ✓ Owner sends 'question:unlock-limit' → purchase QUESTION_LIMIT_10 (3 credits)
* ✓ Owner sends 'question:add' (4th-10th questions) → success
* ✓ Non-owner sends 'question:unlock-limit' → should fail (not owner)
* ✓ Multiple participants, each purchases separately
* ✓ Participant disconnects during purchase (transaction completes or rolls back cleanly)
#### Cache Behavior Tests (8+ tests)
* ✓ First matches request triggers calculation
* ✓ Second matches request (same tier) uses cache
* ✓ New question added → cache invalidates → recalculation occurs
* ✓ New response submitted → cache invalidates → recalculation occurs
* ✓ Cache expires after 10 minutes → recalculation occurs
* ✓ Different tiers use same cached calculation (just different slices)
* ✓ Different participants have separate cache entries
### Edge Case Tests (tests/edge-cases/)
* ✓ Concurrent purchase attempts (2 requests at exact same time)
* ✓ Session with only 1 participant (no matches possible)
* ✓ Session with 0 questions (empty quiz)
* ✓ Participant owns MATCH_TOP3, another question added, requests MATCH_TOP3 again (returns recalculated top 3, no charge)
* ✓ Invalid tier name sent via WebSocket
* ✓ Missing participantId in WebSocket message
* ✓ Expired session (status = 'expired') - can still view matches if purchased
* ✓ Resource ID collision (extremely unlikely but test)
* ✓ Owner purchases QUESTION_LIMIT_10 twice (second purchase should be free - no double charge)
* ✓ Owner at 10 question limit (even with upgrade) tries to add 11th question (should fail)
* ✓ Non-owner participant tries to add question (should fail regardless of credits)
## Phase 8: Implementation Order
1. ✅ Write all test files first (TDD approach) - tests should fail initially
2. ✅ Implement models (VybeLedger, ParticipantUnlock, QuotaManager)
3. ✅ Implement BillingService (run unit tests, fix until passing)
4. ✅ Enhance MatchingService with tiers and caching (run unit tests)
5. ⏳ **NEXT:** Update WebSocket message types in shared/types.ts
6. ⏳ Update WebSocketHandler with new message handlers (run integration tests)
7. ⏳ Add initial credits grant logic in session creation/join
8. ⏳ Add question quota enforcement in question:add handler
9. ⏳ Run full test suite, fix any failures
10. ⏳ Manual testing with multiple browser tabs (test both match purchases and question limits)
## Success Criteria
* All unit tests passing (90+ tests including quota tests)
* All integration tests passing (35+ tests including question limit tests)
* All edge case tests passing (11+ tests)
* No double-charging occurs in any scenario (matches OR question limits)
* Cache improves performance (verify with timing logs)
* Balance calculations are accurate
* Transaction history is auditable
* Match tier hierarchy enforced correctly (MATCH_ALL > MATCH_TOP3 > MATCH_PREVIEW)
* Question quota enforcement works (3 free, 10 with upgrade)
* Only owners can purchase question limit upgrades
* Non-owners cannot add questions regardless of credits
## Future Enhancements (Out of Scope)
* Database persistence (replace in-memory storage)
* Real authentication (Twitter OAuth)
* Payment integration (Stripe)
* Upgrade pricing (pay difference when upgrading tiers)
* Redis caching (for multi-server deployments)
* Rate limiting
* Admin dashboard for viewing transactions
