# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## General Idea and Goals

• Concept: an online, near-live quiz generated from Twitter Spaces discussions, using rapid-fire true/false questions tied to speakers' stances.
• Engagement: timed answering (5-10 seconds) so responses can keep pace with the conversation and results can feed back into the space.
• Long-running Quizzes: Quizzes remain active for 2-3 months after the Twitter Space ends, allowing new participants to join and take the quiz asynchronously.
• Matching Logic: There are no correct/incorrect answers. Participants are matched based on answer agreement - the more questions two participants answer the same way (both True or both False), the higher their similarity score.
• Monetization: Multiple display options for viewing matches, with premium visualizations and detailed match insights locked behind credit system; sell credits (example given: $5 for 20 credits) and charge non-space users for participation/insights.
• Visualization: Multiple result display modes including radar/spider charts, with some display options requiring credits to unlock.

## Development Commands

### Build & Run
```bash
npm run build     # Compile TypeScript to dist/
npm run dev       # Build and start server (development mode)
npm start         # Start production server (requires prior build)
```

### Testing
```bash
npm test                    # Run all tests with Vitest
npm test -- --ui            # Run tests with UI
npm test -- --coverage      # Run with coverage report
npm test QuizSession        # Run specific test file
```

### Development Server
After running `npm run dev`, access the app at `http://localhost:3000`

## Tech Stack
- WebSockets for real-time communication
- Node.js + Express
- TypeScript (ES2022 modules, strict mode)
- Vitest for testing

## Development Plan

### Phase 1: Foundation ✅
- Set up basic web server
- Create simple HTML/CSS frontend
- Establish WebSocket connection between client and server
- Test basic message passing (ping/pong)

### Phase 2: Quiz Session & Participant Management ✅
**Status: COMPLETED** - Backend implementation with 96 passing tests

Built using vertical slicing approach (Slices 1-6):

#### Slice 1: Session Creation with Owner ✅
- QuizSession class with unique session IDs (timestamp-based)
- Owner participant tracking with `isOwner` flag
- Session lifecycle: `live` → `active` → `expired` (3-month duration)
- Owner permission validation (`canAddQuestion`)
- 19 unit tests

#### Slice 2: Dynamic Question Addition ✅
- Question model: id, prompt, options (exactly 2), timer (optional), addedAt
- Question validation: exactly 2 options enforced, no duplicates, non-empty fields
- Questions stored in order (`quiz` array tracks question IDs)
- Owner-only question addition with server-side validation
- 19 unit tests

#### Slice 3: Multiple Participants Join ✅
- Participant model: id, username, connection, isOwner, joinedAt, lastActiveAt, isActive
- Participant management: add, remove, retrieve by ID, count
- Active/inactive participant tracking
- Multiple owners prevented (validation enforced)
- 15 integration tests

#### Slice 4: Response Submission ✅
- Response model: id, participantId, questionId, sessionId, optionChosen, answeredAt
- Flat array storage (not nested) for efficient querying
- Comprehensive validation:
  - Participant must exist
  - Question must exist
  - Option must be valid for that question
  - No duplicate responses (one answer per question per participant)
- Response retrieval by participant with question ordering
- Completion tracking (`hasParticipantCompletedQuiz`)
- 20 unit tests

#### Slice 5: Match Calculation ✅
- MatchingService with agreement-based matching algorithm
- `getResponseValues()`: Extract responses in question order
- `calculateMatch()`: Calculate percentage agreement between participants
- `getMatchesForParticipant()`: Get all matches sorted by similarity (highest first)
- Handles partial responses (participants with different completion levels)
- Ignores unanswered questions in calculations
- 16 unit tests

#### Slice 6: Dynamic Match Updates ✅
- Questions can be added after participants have answered
- Matches automatically recalculate with new responses
- Rankings update when new questions change relative percentages
- Example: 0% match (0/3) → 25% match (1/4) when both answer new question
- 7 integration tests

#### Implementation Notes
- **96 total tests passing** across all slices
- Participant IDs: timestamp + random string generation
- Strict TypeScript: no `any` types
- ES2022 modules throughout
- Models in `src/server/models/`
- Services in `src/server/services/`
- Tests in `tests/unit/` and `tests/integration/`

### Phase 3: UI & WebSocket Integration
**Status: PENDING** - Backend complete, need to build UI layer

#### Backend Complete ✅
- Question system with exactly 2 options per question
- Response submission and validation
- Match calculation between participants
- Dynamic question addition support

#### Client UI (TODO)
- WebSocket client connection
- Session creation/joining interface
- Owner controls for adding questions
- Question display with answer buttons (2 options)
- Participant list with real-time updates
- Response submission interface
- Match results display (basic percentages)
- Connection status indicators

#### WebSocket Message Protocol (TODO)
Define messages in `src/shared/types.ts`:

**Client → Server:**
- `session:create` - Owner creates new quiz
- `session:join` - Participant joins with sessionId
- `question:add` - Owner adds new question
- `response:submit` - Submit answer to question
- `matches:get` - Request match results

**Server → Client:**
- `session:created` - Returns sessionId and participantId
- `session:joined` - Confirms join with participant info
- `quiz:state` - Full quiz state sync
- `question:added` - New question notification
- `participant:joined/left` - Participant updates
- `matches:result` - Match calculation results

#### Notes
- No countdown timer initially (can add later)
- No "correct/incorrect" answers - matching only
- Focus on minimal, functional UI first
- Real-time updates via WebSocket broadcasts

### Phase 4: Results Visualization & Matching
**Status: Backend COMPLETE, UI PENDING**

#### Participant Matching Algorithm ✅
- Calculate response agreement percentage between all participant pairs (number of matching responses / total questions)
- Rank matches from highest to lowest similarity (highest agreement = best match)
- Matches work across participants who completed at different times
- Handles partial responses (participants who haven't answered all questions)
- Implemented in `MatchingService` with full test coverage

#### Results UI (TODO)
- Display match results to participants
- Show match percentages and rankings
- Later: add tiered visualization modes (free/standard/premium)

### Phase 5: AI Question Generation
**Status: NOT STARTED**

Integrate AI to generate questions from Twitter Spaces audio.

#### Question Generation Service
- Create src/services/questionGenerator.ts
- Integrate OpenAI API or similar high-quality LLM
- Design prompt template: analyze transcript → generate questions with exactly 2 options
- Implement question validation and quality filtering
- Add human review workflow for generated questions before going live

#### Audio/Transcript Processing
- Set up audio transcription pipeline (e.g., Whisper API)
- Parse Twitter Spaces audio data
- Extract speaker information and timestamps
- Feed transcript chunks to question generator
- Store generated questions in database

#### Pre-generated Question System
- Create question review dashboard (admin interface)
- Implement question approval workflow
- Build reviewed question database/storage
- Use approved questions for initial launch

### Phase 6: Tiered Results Display System
**Status: NOT STARTED**

Implement multiple visualization modes with credit-gated access:

**Free Tier (No credits required):**
- Basic match percentage display (e.g., "You matched with 157 other participants")
- Top 3 match percentages shown without names (e.g., "Best match: 89%, 2nd: 84%, 3rd: 81%")
- Simple bar chart of response distribution

**Standard Tier (Low credit cost, e.g., 1-2 credits):**
- Reveal usernames/handles of top 5 matches
- Basic radar/spider chart visualization of your response pattern
- See which specific questions you agreed/disagreed on with top match

**Premium Tier (Higher credit cost, e.g., 5-10 credits):**
- Full radar chart with comparison overlay (your responses vs top match)
- Detailed breakdown of all matches with filtering options
- Export results as shareable image for social media
- Historical comparison if participant takes quiz multiple times

**Display Mode Implementation:**
- Add charting library (Chart.js or D3.js)
- Create src/components/resultsDisplay/ with multiple visualization components
- Implement credit check before rendering premium visualizations
- Create locked/preview state for premium features
- Add "Unlock with X credits" buttons for gated content

### Phase 7: Authentication & Twitter Integration
Add user authentication with Twitter OAuth.

#### Twitter OAuth Setup
- Register Twitter Developer app and obtain API keys
- Add passport and passport-twitter packages
- Create src/auth/twitter.ts authentication strategy
- Implement OAuth callback handling
- Store user tokens securely (environment variables/secrets manager)

#### User Session Management
- Add session middleware (express-session)
- Create User model: twitterId, username, displayName, profileImage, credits
- Link WebSocket connections to authenticated users
- Implement guest user flow (limited features)
- Store user data in database

#### Feature Gating
- Allow non-signed-in users to view public stats only
- Require Twitter auth for quiz participation
- Implement credit check before revealing closest match

### Phase 8: Payment & Monetization
Integrate payment processing for credit purchases.

#### Payment Integration
- Add Stripe SDK (stripe npm package)
- Create src/services/payment.ts
- Implement credit packages (e.g., $5 for 20 credits)
- Build checkout flow and payment confirmation
- Handle webhooks for payment verification

#### Credit System
- Add credits column to User model
- Implement tiered credit deduction logic:
  - Standard display features: 1-2 credits
  - Premium display features: 5-10 credits
  - Quiz participation for non-Space users: variable pricing
- Create credit purchase UI
- Display current credit balance prominently on results page
- Handle insufficient credits gracefully with upgrade prompts
- Show preview/teaser of locked content to encourage purchases

#### Pricing for Non-Space Users
- Add participation fee for non-Twitter Space users
- Charge credits for quiz entry
- Display pricing information clearly

### Phase 9: Public Statistics Dashboard
Build analytics dashboard for non-authenticated users.
Non-signed-in users can view general platform statistics including:
- Total participation numbers
- Questions generated
- Questions rated
- And more engagement metrics

#### Statistics Collection
- Track metrics: total participants, questions generated, questions rated, quiz completions
- Create src/services/analytics.ts
- Store aggregate statistics (not individual user data)
- Update stats in real-time or batch processing

#### Dashboard UI
- Create public-stats.html or dedicated route
- Display key metrics with visualizations
- Show trending topics and popular questions
- Add real-time participant count
- Make stats publicly accessible without login

### Phase 10: Database & Persistence
Add database layer for data persistence.

#### Database Setup
- Choose database (PostgreSQL or MongoDB recommended)
- Add database driver (pg or mongoose)
- Create src/db/schema.ts with models: Users, Questions, QuizSessions (with status and expirationDate), Responses, Matches
- Implement connection pooling and error handling
- Add indexing for efficient querying of long-running quizzes and historical data

#### Data Persistence
- Store users, questions, and quiz sessions persistently with status tracking
- Save participant responses and match results with timestamps
- Track historical matching data and response patterns
- Support querying active quizzes (available for new participants)
- Archive expired quizzes (older than 2-3 months) but keep data accessible
- Add database migrations system
- Implement efficient queries for matching participants across different completion times

### Phase 11: Production Readiness
Prepare for deployment and scale.

#### Infrastructure
- Set up production environment variables
- Configure HTTPS/WSS for secure connections
- Add rate limiting and DDoS protection
- Implement logging (Winston or Pino)
- Add error tracking (Sentry)

#### Deployment
- Containerize with Docker
- Set up CI/CD pipeline
- Choose hosting provider (AWS, Railway, Render)
- Configure database backups
- Set up monitoring and alerts

#### Testing
- Add unit tests for quiz logic
- Add integration tests for WebSocket flows
- Test payment flows in sandbox mode
- Load test with multiple concurrent users
- Test Twitter OAuth flow end-to-end

#### Documentation
- Write API documentation
- Create deployment guide
- Document environment variables
- Add contributing guidelines

## Important Implementation Notes

### Question Constraints
**CRITICAL:** Quiz questions must have **exactly 2 options**. No more, no less.
- Type system enforces: `options: [string, string]` (tuple type)
- Runtime validation: Rejects questions with < 2 or > 2 options
- Error message: "Question must have exactly 2 options"
- Examples: Yes/No, Agree/Disagree, A/B, True/False

### Owner Permission Validation
Always validate owner permissions **server-side** for sensitive operations:
- Adding questions (`question:add`)
- Managing session lifecycle
- Accessing participant data

### Response Storage Pattern
Store responses in a **flat array** structure, not nested within participants. This design choice optimizes for:
- Efficient database queries
- Easier match calculations
- Simpler response aggregation

### Long-Running Quiz Sessions
- Quizzes remain active for 2-3 months after creation
- New participants can join and complete quizzes asynchronously
- Status transitions: `live` (during Twitter Space) → `active` (open for new users) → `expired`
- Match calculations work across participants who completed at different times

### Monetization Model
- Free tier: Basic match count and top 3 percentages (no names)
- Standard tier (1-2 credits): Top 5 match names + basic visualizations
- Premium tier (5-10 credits): Full radar charts, detailed breakdowns, social sharing
- Non-Space users pay for quiz participation

### TypeScript Standards
- Strict mode enabled
- No `any` types allowed
- ES2022 module syntax
- All interfaces and types in `shared/types.ts` for client/server consistency

### WebSocket Scaling Considerations
Plan for Redis pub/sub when scaling to multiple server instances in production phases.

## Testing Strategy

### Unit Tests
Focus on core business logic:
- QuizSession class (CRUD operations, owner permissions)
- Matching algorithm (various match percentages, dynamic questions)
- Quiz manager (multi-session handling)
- Participant manager (join/leave flows)

### Integration Tests
Test end-to-end WebSocket flows:
- Session creation and joining
- Message broadcasting
- Dynamic question addition
- Response recording
- Disconnection handling

### Manual Testing Checklist
1. Owner creates session and sees owner badge
2. Multiple participants join (3-4 browser tabs)
3. Participant count updates in real-time
4. Non-owners cannot see "add question" controls
5. Owner adds questions dynamically
6. All participants receive question notifications
7. Participants submit responses
8. Match percentages calculate correctly
9. New question addition updates match percentages
10. Disconnection handled gracefully

Run manual tests by starting dev server and opening multiple browser tabs to `http://localhost:3000`.

## File References

When making changes, key files to reference:
- Server logic: `src/server.ts` (Phase 1) → `src/server/` (Phase 2+)
- Client logic: `src/client.ts` (Phase 1) → `src/client/` (Phase 2+)
- Build output: `dist/`
- Configuration: `tsconfig.json`, `package.json`
- Development plan: `README.md`, `CURRENT_ACTION.md`
