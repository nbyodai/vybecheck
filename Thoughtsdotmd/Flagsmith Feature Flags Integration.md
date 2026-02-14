Flagsmith Feature Flags Integration
Problem Statement
Integrate Flagsmith feature flags to enable A/B testing and experimentation for:
VybesPage: Different payment options/packs (pricing, vybe amounts, pack names)
MatchesPage: Different unlock costs for match tiers (TOP3, ALL)
Current State
VybesPage (src/frontend/pages/VybesPage.tsx) has hardcoded vybePacks array with fixed pricing
BillingService (src/server/services/BillingService.ts) uses hardcoded costs for feature unlocks
Pricing structure:
MATCH_TOP3: 2 credits
MATCH_ALL: 5 credits
QUESTION_LIMIT_10: 3 credits
Tech stack: React (frontend), Express + WebSocket (backend), TypeScript throughout
Proposed Architecture
Dual SDK Approach
Backend: flagsmith-nodejs SDK for server-side flag evaluation (unlock costs)
Frontend: flagsmith SDK for client-side flag evaluation (vybe packs UI)
Flag Configuration (in Flagsmith Dashboard)
Payment Options Flag (vybe_packs_config) - Multivariate:
Create multiple variations with percentage weights for A/B testing:
| Variation | Weight | Description |
|-----------|--------|-------------|
| control | 50% | Current pricing (baseline) |
| high_value | 25% | More vybes per pack |
| low_price | 25% | Lower prices |
Each variation has its own JSON value:
// control (50%)
[{"id":1,"name":"Starter","vybes":20,"price":5},{"id":2,"name":"Pro","vybes":50,"price":10,"popular":true},{"id":3,"name":"Ultimate","vybes":120,"price":20}]
// high_value (25%)
[{"id":1,"name":"Starter","vybes":25,"price":5},{"id":2,"name":"Pro","vybes":65,"price":10,"popular":true},{"id":3,"name":"Ultimate","vybes":150,"price":20}]
// low_price (25%)
[{"id":1,"name":"Starter","vybes":20,"price":4},{"id":2,"name":"Pro","vybes":50,"price":8,"popular":true},{"id":3,"name":"Ultimate","vybes":16}]
Unlock Costs Flag (unlock_costs_config) - Multivariate:
| Variation | Weight | Value |
|-----------|--------|-------|
| control | 50% | {"MATCH_TOP3":2,"MATCH_ALL":5,"QUESTION_LIMIT_10":3} |
| cheaper | 25% | {"MATCH_TOP3":1,"MATCH_ALL":3,"QUESTION_LIMIT_10":2} |
| premium | 25% | {"MATCH_TOP3":3,"MATCH_ALL":7,"QUESTION_LIMIT_10":4} |
Critical: Users must be identified with participantId for consistent variation assignment.
Implementation Steps
1. Install Dependencies
npm install flagsmith-nodejs flagsmith
2. Create Flagsmith Service (Backend)
File: src/server/services/FlagsmithService.ts
Initialize Flagsmith Node.js client with server-side environment key
Provide methods: getUnlockCosts(), getVybePacksConfig()
Cache flag values locally with configurable TTL (default 60s)
Return sensible defaults if Flagsmith unavailable
3. Create Feature Config Types
File: src/shared/featureFlags.ts
export interface VybePackConfig {
  id: number;
  name: string;
  vybes: number;
  price: number;
  popular?: boolean;
}
export interface UnlockCostsConfig {
  MATCH_TOP3: number;
  MATCH_ALL: number;
  QUESTION_LIMIT_10: number;
}
export const DEFAULT_VYBE_PACKS: VybePackConfig[] = [
  { id: 1, name: 'Starter Pack', vybes: 20, price: 5 },
  { id: 2, name: 'Pro Pack', vybes: 50, price: 10, popular: true },
  { id: 3, name: 'Ultimate Pack', vybes: 120, price: 20 },
];
export const DEFAULT_UNLOCK_COSTS: UnlockCostsConfig = {
  MATCH_TOP3: 2,
  MATCH_ALL: 5,
  QUESTION_LIMIT_10: 3,
};
4. Integrate with BillingService
Modify BillingService.ts to:
Accept unlock costs from FlagsmithService
Add getFeatureCost(feature: UnlockableFeature): number method
Use flag values instead of hardcoded costs in purchaseOrVerifyAccess()
5. Create WebSocket Handler for Config
Add new message types to src/shared/types.ts:
// Client → Server
| { type: 'config:get' }
// Server → Client
| { type: 'config:data'; data: { vybePacks: VybePackConfig[]; unlockCosts: UnlockCostsConfig } }
6. Create Feature Flags Store (Frontend)
File: src/frontend/store/featureFlagStore.ts
Using Zustand (consistent with existing stores):
interface FeatureFlagState {
  vybePacks: VybePackConfig[];
  unlockCosts: UnlockCostsConfig;
  isLoading: boolean;
  variation: string | null; // Track which A/B variation user is in
  initFlagsmith: (participantId: string) => Promise<void>;
}
Key A/B Testing Logic:
Call flagsmith.identify(participantId) when participant joins session
Flagsmith hashes participantId to consistently assign same variation
Store the assigned variation for analytics tracking
Same participantId always gets same variation (sticky assignment)
7. Update VybesPage
Modify src/frontend/pages/VybesPage.tsx:
Replace hardcoded vybePacks with useVybePacks() hook
Add loading state while fetching config
Gracefully fallback to defaults if unavailable
8. Update Matches Display (when implemented)
When matches page is implemented, use useUnlockCosts() to display:
"Unlock Top 3 matches for X Vybes"
"Unlock All matches for X Vybes"
9. Environment Configuration
Add to environment variables:
FLAGSMITH_SERVER_KEY=<server-side-environment-key>
FLAGSMITH_CLIENT_KEY=<client-side-environment-key>
Flagsmith Dashboard Setup
Create project "VybeCheck" at flagsmith.com
Create two environments: "Development" and "Production"
Create multivariate feature flags:
   For vybe_packs_config:
Enable "Multivariate" toggle
Add variations: control (50%), high_value (25%), low_price (25%)
Set JSON value for each variation
   For unlock_costs_config:
Enable "Multivariate" toggle
Add variations: control (50%), cheaper (25%), premium (25%)
Set JSON value for each variation
Copy environment keys (Server-side and Client-side) for each environment
Important: Enable "Use Identity Overrides" if you want to force specific users into variations for testing
Testing Strategy
Unit tests for FlagsmithService with mocked Flagsmith client
Integration tests verifying flag value propagation to BillingService
Frontend tests verifying VybesPage renders correct packs
Manual testing: toggle flags in dashboard, verify UI updates
Rollout Plan
Deploy with flags matching current hardcoded values (no behavior change)
Test flag changes in development environment
Gradually experiment with different pricing in production
Monitor conversion metrics to determine optimal pricing
