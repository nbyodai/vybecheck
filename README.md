# RushSquad

A web-based multiplayer quiz app for Twitter Spaces built with WebSockets.

## General Idea and Goals

•	Concept: an online, near-live quiz generated from Twitter Spaces discussions, using rapid-fire true/false questions tied to speakers' stances.
•	Engagement: timed answering (5-10 seconds) so responses can keep pace with the conversation and results can feed back into the space.
•	Long-running Quizzes: Quizzes remain active for 2-3 months after the Twitter Space ends, allowing new participants to join and take the quiz asynchronously.
•	Matching Logic: There are no correct/incorrect answers. Participants are matched based on answer agreement - the more questions two participants answer the same way (both True or both False), the higher their similarity score.
•	Monetization: Multiple display options for viewing matches, with premium visualizations and detailed match insights locked behind credit system; sell credits (example given: $5 for 20 credits) and charge non-space users for participation/insights.
•	Visualization: Multiple result display modes including radar/spider charts, with some display options requiring credits to unlock.

## Development Plan

This project will be built incrementally, following these phases:

### Phase 1: Foundation ✅
- Set up basic web server
- Create simple HTML/CSS frontend
- Establish WebSocket connection between client and server
- Test basic message passing (ping/pong)

### Phase 2: Quiz Session & Participant Management
Build the multiplayer foundation to track quiz participants and synchronize quiz state.

#### Server Changes
- Create QuizSession class to hold quiz data (participants, current question, collected responses, status, expirationDate)
- Add quiz session states: live (during Twitter Space), active (open for new participants), expired (2-3 months passed)
- Create Participant interface with properties: id, username, connection, responses (map of questionId to boolean), completedAt timestamp
- Replace single WebSocket handler with participant management system using Map<string, Participant>
- Implement broadcastQuizState() function to send quiz state to all connected participants
- Handle participant join/leave events and update quiz state accordingly
- Allow new participants to join and take quiz even after Twitter Space ends
- Assign unique participant IDs using UUID or timestamp-based generation
- Later: tie participant IDs to Twitter handles once sign-in with Twitter is completed

#### Client Changes
- Parse incoming quiz state messages and update local state
- Display participant count and the user's own participant ID
- Show list of active participants

### Phase 3: Quiz Question System
Implement the core quiz functionality with true/false Yes/No Agree/Disagree essentially boolean style response-questions.

#### Question Data Model
- Create Question interface: id, text, correctAnswer (boolean), speaker, topic, timestamp
- Create PlayerAnswer interface: playerId, questionId, answer, responseTime
- Build question queue system on server

#### Quiz Flow Logic
- Implement question lifecycle states: waiting, active, revealing, completed
- Add 5-10 second countdown timer per question
- Broadcast current question to all players
- Collect player answers within time limit
- Calculate and broadcast results (correct answer, player scores)
- Track answer streaks and response times

#### Client Quiz UI
- Display current question text prominently
- Show countdown timer with visual indicator
- Add True/False answer buttons
- Implement answer submission and lock-in
- Display immediate feedback (correct/incorrect)
- Show updated scores after each question
- Animate transitions between questions
- Focus on clean, minimal UI suitable for Twitter Spaces context

### Phase 4: AI Question Generation
Integrate AI to generate questions from Twitter Spaces audio.

#### Question Generation Service
- Create src/services/questionGenerator.ts
- Integrate OpenAI API or similar high-quality LLM
- Design prompt template: analyze transcript → generate true/false questions about speakers' stances
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

### Phase 5: Results Visualization & Matching
Implement multiple display modes for participant matching with tiered access.

#### Participant Matching Algorithm
- Calculate response agreement percentage between all participant pairs (number of matching responses / total questions)
- Rank matches from highest to lowest similarity (highest agreement = best match)
- Store match results for future reference
- Calculate matches for all participants in quiz, regardless of when they completed it

#### Tiered Results Display System
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

### Phase 6: Authentication & Twitter Integration
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

### Phase 7: Payment & Monetization
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

### Phase 8: Public Statistics Dashboard
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

### Phase 9: Database & Persistence
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

### Phase 10: Production Readiness
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

## Implementation Notes
- Start with Phase 2 immediately as Phase 1 is complete
- Use pre-generated, human-reviewed questions for initial launch (Phase 4)
- Implement tiered results display system early to validate monetization model
- Design database schema to efficiently handle long-running quizzes with thousands of participants
- Keep public stats dashboard simple and fast to load
- Consider WebSocket scaling strategy (Redis pub/sub) before production launch
- Test thoroughly with multiple concurrent users before public launch
- Plan for quiz lifecycle management (live → active → expired transitions)
- Implement caching strategy for match calculations on popular long-running quizzes

## Tech Stack
- WebSockets for real-time communication
- NodeJS(Express)
- TypeScript



