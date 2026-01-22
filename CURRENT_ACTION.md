# CURRENT ACTION: Phase 2 - Quiz Session & Participant Management

## Overview
Build the multiplayer foundation to track quiz participants and synchronize quiz state. This phase establishes the core architecture for managing multiple participants taking the quiz simultaneously or asynchronously, with support for dynamic question addition by the quiz owner.

## Goals
- Track multiple participants across quiz sessions
- Support owner/creator role who can dynamically add questions
- Synchronize quiz state in real-time for live participants
- Support asynchronous participation (participants joining after the Space ends)
- Lay foundation for long-running quiz sessions with evolving questions

## Folder Structure

```
vybecheck/
├── src/
│   ├── server/
│   │   ├── index.ts                    # Main server entry point (refactored from server.ts)
│   │   ├── websocket/
│   │   │   ├── connectionManager.ts    # WebSocket connection handling
│   │   │   └── messageHandler.ts       # Message routing and handling
│   │   ├── models/
│   │   │   ├── QuizSession.ts          # QuizSession class
│   │   │   ├── Participant.ts          # Participant interface/class
│   │   │   ├── Question.ts             # Question model
│   │   │   ├── Response.ts             # Response model
│   │   │   └── types.ts                # Shared types and interfaces
│   │   ├── services/
│   │   │   ├── quizManager.ts          # Quiz session management logic
│   │   │   ├── participantManager.ts   # Participant tracking and management
│   │   │   └── matchingService.ts      # Calculate participant matches
│   │   └── utils/
│   │       ├── idGenerator.ts          # Unique ID generation
│   │       └── logger.ts               # Logging utilities
│   ├── client/
│   │   ├── index.ts                    # Main client entry point (refactored from client.ts)
│   │   ├── websocket/
│   │   │   └── connection.ts           # WebSocket connection management
│   │   ├── components/
│   │   │   ├── ParticipantList.ts      # Display active participants
│   │   │   ├── QuizStatus.ts           # Show quiz state and participant count
│   │   │   └── OwnerControls.ts        # Owner-only controls (add questions, etc.)
│   │   ├── state/
│   │   │   └── quizState.ts            # Local state management
│   │   └── utils/
│   │       └── helpers.ts              # Client utility functions
│   └── shared/
│       ├── types.ts                    # Shared types between client/server
│       └── constants.ts                # Shared constants
├── tests/
│   ├── unit/
│   │   ├── QuizSession.test.ts
│   │   ├── Participant.test.ts
│   │   ├── quizManager.test.ts
│   │   └── matchingService.test.ts
│   └── integration/
│       └── websocket.test.ts
├── dist/                               # Compiled JavaScript output
├── index.html
├── package.json
├── tsconfig.json
├── README.md
└── CURRENT_ACTION.md
```

## Data Model (Based on Provided Schema)

### Question Model (`src/server/models/Question.ts`)
```typescript
interface Question {
  id: string;                    // e.g., "q1", "q2"
  prompt: string;                // e.g., "red vs blue"
  options: string[];             // e.g., ["red", "blue"] or ["agree", "disagree"]
  timer?: number;                // Optional: override default timer (in seconds)
  addedAt: Date;                 // When question was added to session
}
```

### Response Model (`src/server/models/Response.ts`)
```typescript
interface Response {
  id: string;                    // e.g., "01", "02"
  participantId: string;         // e.g., "123Abc"
  questionId: string;            // e.g., "q1"
  sessionId: string;             // e.g., "aabaox8aol"
  optionChosen: string;          // e.g., "red", "blue"
  answeredAt: Date;              // Timestamp
}
```

### Participant Interface (`src/server/models/Participant.ts`)
```typescript
interface Participant {
  id: string;                    // e.g., "123Abc"
  username: string | null;       // null for anonymous, later tied to Twitter
  connection: WebSocket | null;  // null for async participants
  isOwner: boolean;              // true if this participant created the quiz
  joinedAt: Date;
  lastActiveAt: Date;
  isActive: boolean;             // currently connected
}
```

### QuizSession Class (`src/server/models/QuizSession.ts`)
```typescript
interface QuizSessionData {
  sessionId: string;                          // e.g., "aabaox8aol"
  ownerId: string;                            // Participant who created the session
  status: 'live' | 'active' | 'expired';
  questions: Question[];                       // All questions in this session
  quiz: string[];                             // Ordered list of question IDs
  responses: Response[];                       // Flat array of all responses
  participants: Map<string, Participant>;     // All participants
  createdAt: Date;
  expiresAt: Date;
}

class QuizSession {
  // Methods:
  - constructor(ownerId: string)
  - addQuestion(question: Question): void
  - addParticipant(participant: Participant): void
  - removeParticipant(participantId: string): void
  - recordResponse(response: Response): void
  - getResponsesForParticipant(participantId: string): Response[]
  - getResponseValuesForParticipant(participantId: string): string[]  // Derived field
  - getState(): QuizSessionData
  - isExpired(): boolean
  - canAddQuestion(participantId: string): boolean  // Check if participant is owner
}
```

## Implementation Details

### 1. Derived Data: Response Values for Easy Matching

The model includes `responsesValuesForEasyLooks` - a computed view of each participant's responses:

```typescript
// Example output:
{
  "123Abc": ["red", "beyonce", "agree", "sony"],      // Owner
  "456Xyz": ["blue", "rihanna", "disagree", "sony"],  // 25% match
  "789Otp": ["red", "rihanna", "disagree", "nintendo"] // 25% match
}
```

**Implementation in Matching Service (`src/server/services/matchingService.ts`):**

```typescript
class MatchingService {
  /**
   * Get ordered response values for a participant
   * Used for quick matching calculations
   */
  getResponseValues(
    participantId: string, 
    responses: Response[], 
    questionOrder: string[]
  ): string[] {
    const responseMap = new Map<string, string>();
    
    // Build map of questionId -> optionChosen
    responses
      .filter(r => r.participantId === participantId)
      .forEach(r => responseMap.set(r.questionId, r.optionChosen));
    
    // Return in question order
    return questionOrder.map(qId => responseMap.get(qId) || '');
  }

  /**
   * Calculate match percentage between two participants
   * Returns percentage of questions answered the same way
   */
  calculateMatch(
    participant1Values: string[], 
    participant2Values: string[]
  ): number {
    const minLength = Math.min(participant1Values.length, participant2Values.length);
    if (minLength === 0) return 0;
    
    let matches = 0;
    for (let i = 0; i < minLength; i++) {
      if (participant1Values[i] === participant2Values[i]) {
        matches++;
      }
    }
    
    return (matches / minLength) * 100;
  }

  /**
   * Get all matches for a participant, sorted by similarity
   */
  getMatchesForParticipant(
    participantId: string,
    session: QuizSession
  ): Array<{participantId: string, matchPercentage: number}> {
    const targetValues = this.getResponseValues(
      participantId, 
      session.responses, 
      session.quiz
    );
    
    const matches = [];
    for (const [otherId, _] of session.participants) {
      if (otherId === participantId) continue;
      
      const otherValues = this.getResponseValues(otherId, session.responses, session.quiz);
      const matchPercentage = this.calculateMatch(targetValues, otherValues);
      
      matches.push({ participantId: otherId, matchPercentage });
    }
    
    return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }
}
```

### 2. Server Components

#### Quiz Manager (`src/server/services/quizManager.ts`)
- Manage multiple quiz sessions: `Map<sessionId, QuizSession>`
- Create new quiz sessions with owner
- Handle quiz lifecycle (live → active → expired)
- Broadcast quiz state to connected participants
- Handle dynamic question addition
- Clean up expired sessions

Key methods:
```typescript
- createSession(ownerId: string): QuizSession
- getSession(sessionId: string): QuizSession | null
- addQuestionToSession(sessionId: string, question: Question, requesterId: string): boolean
- broadcastQuizState(sessionId: string): void
- broadcastNewQuestion(sessionId: string, question: Question): void
```

#### Participant Manager (`src/server/services/participantManager.ts`)
- Add/remove participants from quiz sessions
- Track participant activity
- Generate unique participant IDs
- Handle participant state transitions
- Distinguish between owner and regular participants

#### Connection Manager (`src/server/websocket/connectionManager.ts`)
- Handle WebSocket connections and disconnections
- Maintain `Map<connectionId, {participantId, sessionId}>`
- Associate connections with participants
- Handle reconnection logic

#### Message Handler (`src/server/websocket/messageHandler.ts`)
Handle incoming message types:
- `session:create` - Owner creates new quiz session
- `session:join` - Participant joins existing session
- `session:leave` - Participant leaves
- `question:add` - Owner adds new question (owner-only)
- `response:submit` - Participant submits response to question
- `quiz:getState` - Request current quiz state
- `ping` - Connection health check

### 3. Client Components

#### Quiz State Manager (`src/client/state/quizState.ts`)
```typescript
interface ClientQuizState {
  sessionId: string | null;
  participantId: string | null;
  isOwner: boolean;
  participantCount: number;
  participants: Array<{id: string, username: string | null, isOwner: boolean}>;
  questions: Question[];
  myResponses: Map<string, string>;  // questionId -> optionChosen
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  pendingQuestions: string[];  // Question IDs not yet answered
}
```

#### Owner Controls Component (`src/client/components/OwnerControls.ts`)
Owner-only UI for:
- Adding new questions
- Setting custom timer per question
- Viewing participant progress
- Managing session lifecycle

#### Participant List Component (`src/client/components/ParticipantList.ts`)
- Display list of active participants
- Show participant count
- Highlight owner with badge/icon
- Highlight current user
- Update in real-time as participants join/leave

#### Quiz Status Component (`src/client/components/QuizStatus.ts`)
- Display connection status
- Show quiz state (live, active, expired)
- Display participant's own ID and role (owner/participant)
- Show participant count
- Show questions answered vs total questions

### 4. Message Protocol

Define shared message types (`src/shared/types.ts`):

```typescript
// Client → Server
type ClientMessage =
  | { type: 'session:create', data: { username?: string } }
  | { type: 'session:join', data: { sessionId: string, username?: string } }
  | { type: 'session:leave' }
  | { type: 'question:add', data: { sessionId: string, question: Omit<Question, 'id' | 'addedAt'> } }
  | { type: 'response:submit', data: { questionId: string, optionChosen: string } }
  | { type: 'quiz:getState' }
  | { type: 'ping', timestamp: number };

// Server → Client
type ServerMessage =
  | { type: 'session:created', data: { sessionId: string, participantId: string } }
  | { type: 'session:joined', data: { sessionId: string, participantId: string, isOwner: boolean } }
  | { type: 'quiz:state', data: QuizSessionData }
  | { type: 'question:added', data: { question: Question } }
  | { type: 'participant:joined', data: Participant }
  | { type: 'participant:left', data: { participantId: string } }
  | { type: 'response:recorded', data: { participantId: string, questionId: string } }
  | { type: 'notification', message: string }  // e.g., "New question available!"
  | { type: 'pong', timestamp: number }
  | { type: 'error', message: string };
```

## Key Workflows

### Workflow 1: Owner Creates Session and Adds Questions
1. Owner connects and sends `session:create`
2. Server creates `QuizSession` with owner as participant
3. Server responds with `session:created` containing `sessionId` and `participantId`
4. Owner adds first question via `question:add`
5. Server validates owner permission, adds question, broadcasts `question:added`
6. Owner can continue adding questions dynamically

### Workflow 2: Participant Joins and Answers
1. Participant connects and sends `session:join` with `sessionId`
2. Server adds participant to session, responds with `session:joined`
3. Server sends current `quiz:state` with all questions and responses
4. Participant answers questions via `response:submit`
5. Server records response, broadcasts `response:recorded`

### Workflow 3: Dynamic Question Addition
1. Owner adds new question (q4) via `question:add`
2. Server validates owner permission
3. Server adds question to `session.questions` and `session.quiz`
4. Server broadcasts to all connected participants:
   - `question:added` with new question
   - `notification`: "New question available! Answer to update your match score."
5. Participants answer new question
6. Match percentages recalculate automatically with new responses

### Workflow 4: Match Calculation After New Question
```
Before q4:
  Owner:   ["red", "beyonce", "agree"]
  456Xyz:  ["blue", "rihanna", "disagree"]  → 0% match (0/3)
  789Otp:  ["red", "rihanna", "disagree"]   → 33% match (1/3)

After q4 added and answered:
  Owner:   ["red", "beyonce", "agree", "sony"]
  456Xyz:  ["blue", "rihanna", "disagree", "sony"]  → 25% match (1/4)
  789Otp:  ["red", "rihanna", "disagree", "nintendo"] → 25% match (1/4)
```

## Testing Strategy

### Unit Tests

#### Test QuizSession Class (`tests/unit/QuizSession.test.ts`)
```typescript
describe('QuizSession', () => {
  test('should create new quiz session with owner')
  test('should add participant successfully')
  test('should add question when requester is owner')
  test('should reject question addition from non-owner')
  test('should record responses in flat array')
  test('should get response values for participant in correct order')
  test('should handle dynamic question addition')
  test('should detect expired sessions')
});
```

#### Test Matching Service (`tests/unit/matchingService.test.ts`)
```typescript
describe('MatchingService', () => {
  test('should calculate 0% match for completely different responses')
  test('should calculate 100% match for identical responses')
  test('should calculate 33% match correctly')
  test('should recalculate match after new question added')
  test('should handle participants with different numbers of responses')
  test('should return sorted matches (highest first)')
});
```

#### Test Quiz Manager (`tests/unit/quizManager.test.ts`)
```typescript
describe('QuizManager', () => {
  test('should create session and assign owner')
  test('should add question only if requester is owner')
  test('should broadcast new question to all participants')
  test('should handle multiple sessions independently')
});
```

### Integration Tests

#### Test WebSocket Flow (`tests/integration/websocket.test.ts`)
```typescript
describe('WebSocket Integration', () => {
  test('should create session as owner')
  test('should join existing session as participant')
  test('should broadcast participant join to other clients')
  test('should sync quiz state across multiple connections')
  test('should allow owner to add questions')
  test('should reject question addition from non-owner')
  test('should notify all participants when new question added')
  test('should record responses and update state')
  test('should handle disconnection and cleanup')
});
```

### Manual Testing Procedures

#### Test 1: Owner Creates Session
1. Start server: `npm run dev`
2. Open browser at `http://localhost:3000`
3. Click "Create New Quiz Session" (or auto-create for now)
4. Verify:
   - Session ID is displayed
   - Participant ID is displayed
   - "Owner" badge is visible
   - Owner controls are visible (add question UI)

#### Test 2: Add Questions as Owner
1. As owner, add a question:
   - Prompt: "red vs blue"
   - Options: ["red", "blue"]
2. Verify:
   - Question appears in question list
   - Question ID is assigned
   - Owner can answer their own question
3. Add 2-3 more questions
4. Verify all questions are tracked

#### Test 3: Multiple Participants Join
1. Keep owner tab open
2. Copy session ID
3. Open 2-3 new browser tabs
4. In each tab, join using session ID
5. Verify:
   - Each tab shows unique participant ID
   - Participant count increments (2, 3, 4)
   - Owner tab shows all participants
   - Non-owner tabs don't see "add question" controls

#### Test 4: Participants Answer Questions
1. Have each participant answer all questions
2. Verify in console/logs:
   - Responses are recorded with correct format
   - Each response has unique ID
   - Responses stored in flat array
3. Check that responses are synced across tabs

#### Test 5: Dynamic Question Addition
1. As owner, add new question (q4): "sony vs nintendo"
2. Verify in all participant tabs:
   - Notification appears: "New question available!"
   - New question shows up in question list
   - All participants can answer it
3. Have all participants answer q4
4. Check in console:
   - Response array grows
   - Match percentages update

#### Test 6: Match Calculation
1. Open browser console in owner tab
2. After all participants answer all questions, trigger match calculation
3. Verify:
   - Response values array is correct for each participant
   - Match percentages calculated correctly
   - Matches sorted by percentage (highest first)

### Testing Tools Setup

Add testing dependencies:
```json
{
  "devDependencies": {
    "vitest": "^1.0.4",
    "@vitest/ui": "^1.0.4",
    "ws": "^8.14.2",
    "@types/ws": "^8.5.10"
  }
}
```

Run tests:
```bash
npm test                 # Run all tests
npm test -- --ui         # Run with UI
npm test -- --coverage   # Run with coverage report
npm test QuizSession     # Run specific test file
```

## Success Criteria

Phase 2 is complete when:
- ✅ Owner can create quiz session
- ✅ Owner can dynamically add questions to session
- ✅ Multiple participants can join session
- ✅ Each participant receives unique ID
- ✅ Participants can submit responses
- ✅ Responses stored in flat array structure
- ✅ Response values derived correctly for matching
- ✅ Match percentages calculated correctly
- ✅ Match percentages update when new questions/responses added
- ✅ Non-owners cannot add questions
- ✅ Quiz state broadcasts to all connected participants
- ✅ Disconnection is handled gracefully
- ✅ Participant list updates in real-time
- ✅ Unit tests pass with >80% coverage
- ✅ Integration tests pass
- ✅ Manual testing procedures complete successfully

## Next Steps (Phase 3 Preview)
- Build actual quiz UI for question display and answering
- Implement countdown timer (with per-question overrides)
- Add question lifecycle states (waiting → active → collecting → completed)
- Build results display (basic match percentages)
- Add notification system for new questions
- Create shareable session links

## Notes
- Focus on clean architecture and separation of concerns
- Keep WebSocket logic separate from business logic
- Responses are stored in flat array (not nested) for easier querying
- Owner role is critical - validate permissions server-side
- Design for scalability (later phases will add database persistence)
- Match calculation should be efficient (cache derived response values)
- Use TypeScript strictly - no `any` types
- Document all public interfaces
- Consider performance: match calculation on large sessions may need optimization
