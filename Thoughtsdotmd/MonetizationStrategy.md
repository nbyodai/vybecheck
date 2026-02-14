My definitive suggestion is to use Split Endpoints combined with Decorator-based Gating.

This is the safest, cleanest, and most "TypeScript" way to build this. It separates your money logic from your business logic, making it nearly impossible to accidentally give data away for free.

Here is the step-by-step breakdown of exactly how to build this system from the ground up.

The Architecture Visualization
Step 1: The Database (The Ledger)
Do not store a simple "balance" number that you overwrite. Store a history of transactions so you can audit where tokens went.

Table: token_ledger

id (Primary Key)

user_id (Foreign Key)

amount (Integer: +50 for purchase, -5 for spend)

reason (String: e.g., "PURCHASE_PACK", "UNLOCK_TOP3")

created_at (Timestamp)

To get a user's balance, you sum this column: SELECT SUM(amount) FROM token_ledger WHERE user_id = '123'

Step 2: The "Guard" (The Decorator)
This is your security layer. It checks if the user has enough tokens before the function even runs.

If you are using NestJS, use Guards. If using Express/Node, use a Higher-Order Function (wrapper).

The Wrapper Code (Concept):

TypeScript
// This is your reusable monetization tool
export const GatedAction = (cost: number, handler: Function) => {
  return async (req: Request, res: Response) => {
    const userId = req.user.id;

    if (cost > 0) {
      // 1. Check Balance
      const balance = await db.getBalance(userId);

      if (balance < cost) {
        return res.status(402).json({ error: "Insufficient Tokens" });
      }

      // 2. Charge the User (Atomic Insert)
      await db.insertTransaction({ userId, amount: -cost, reason: req.path });
    }

    // 3. Run the actual business logic
    return handler(req, res);
  };
};
Step 3: The Controller (The Endpoints)
Instead of one messy endpoint with if/else statements, create three clear endpoints. This makes your API self-documenting and secure.

TypeScript
import { matchService } from './services';
import { GatedAction } from './middleware/gate';

// Endpoint 1: Free Preview (Safe default)
// GET /api/matches/preview
router.get('/matches/preview', GatedAction(0, async (req, res) => {
  // Logic: Fetch only indices 5 and 6
  const data = await matchService.getMatches(req.user.id, 'preview');
  res.json(data);
}));

// Endpoint 2: Top 3 (Cheap Tier)
// GET /api/matches/top-3
router.get('/matches/top-3', GatedAction(2, async (req, res) => {
  // Logic: Fetch indices 0-2
  const data = await matchService.getMatches(req.user.id, 'top3');
  res.json(data);
}));

// Endpoint 3: Full Reveal (Premium Tier)
// GET /api/matches/all
router.get('/matches/all', GatedAction(5, async (req, res) => {
  // Logic: Fetch everything
  const data = await matchService.getMatches(req.user.id, 'all');
  res.json(data);
}));
Step 4: The Service (The Logic)
This is where you handle the "Heavy Lifting" so you don't repeat code.

Crucial: Use a caching strategy (like Redis or a simple in-memory map) so if a user calls "Preview" and then immediately buys "Top 3," you don't have to recalculate the matches from scratch.

TypeScript
class MatchService {
  async getMatches(userId: string, tier: 'preview' | 'top3' | 'all') {

    // 1. Try to get cached calculation
    let allMatches = await cache.get(`matches:${userId}`);

    // 2. If missing, calculate and cache for 10 mins
    if (!allMatches) {
      allMatches = await this.heavyCalculationAlgorithm(userId);
      await cache.set(`matches:${userId}`, allMatches, 600);
    }

    // 3. Slice based on the requested tier
    switch (tier) {
      case 'preview': return allMatches.slice(5, 7);
      case 'top3':    return allMatches.slice(0, 3);
      case 'all':     return allMatches;
    }
  }
}



he previous code was stateless—it would charge the user every single time they refreshed the page. That is a critical bug.

To fix this, we need to introduce "Entitlements" (also known as Unlocks or Purchases).

Here is the corrected architecture that checks "Do they own this?" before asking "Can they pay for this?".

The Missing Piece: The user_unlocks Table
You need a table to track what a user has already purchased.

Table: user_unlocks | id | user_id | resource_id | tier | created_at | | :--- | :--- | :--- | :--- | :--- | | 1 | user_123 | match_session_555 | ALL | 10:00 AM |

resource_id: This identifies what they paid for (e.g., daily_matches_2026_01_27 or a specific session ID).

tier: The level they bought (TOP3, ALL).

The Logic Update: Check -> Charge -> Grant
We need to move the billing logic out of the middleware and into a Service Method that can handle the "Check if owned" logic smartly.

Step 1: The "Purchase or Verify" Service
This is the heart of the fix. This function guarantees you never charge twice for the same thing.

TypeScript
// billing.service.ts

export async function purchaseOrVerifyAccess(
  userId: string,
  resourceId: string,
  requiredTier: 'TOP3' | 'ALL',
  cost: number
): Promise<boolean> {

  // 1. CHECK ENTITLEMENT (The Fix)
  // Check if they already bought this SPECIFIC tier OR the 'ALL' tier
  const existingUnlock = await db.unlocks.findFirst({
    where: {
      userId: userId,
      resourceId: resourceId,
      tier: { in: [requiredTier, 'ALL'] } // 'ALL' grants access to everything
    }
  });

  // If they own it, return TRUE immediately. Do not charge.
  if (existingUnlock) {
    return true;
  }

  // 2. CHECK BALANCE
  // If they don't own it, we proceed to charge logic
  const userBalance = await db.ledger.getBalance(userId);
  if (userBalance < cost) {
    throw new Error("Insufficient Funds");
  }

  // 3. ATOMIC PURCHASE TRANSACTION
  // We wrap this in a transaction to ensure money and unlock happen together
  await db.$transaction(async (tx) => {
    // Deduct Money
    await tx.ledger.create({
      data: { userId, amount: -cost, reason: `Unlock ${requiredTier}` }
    });

    // Grant Access (Create the Unlock Record)
    await tx.unlocks.create({
      data: { userId, resourceId, tier: requiredTier }
    });
  });

  return true;
}
Step 2: The Controller Implementation
Now your endpoints look like this. They call the service to ensure access is valid before returning data.

Scenario: The user wants to see the "Top 3" matches for today.

TypeScript
// match.controller.ts

// GET /matches/top-3
router.get('/matches/top-3', async (req, res) => {
  const userId = req.user.id;

  // Define a unique ID for this "product".
  // If matches reset daily, use the date string.
  const resourceId = `matches_${new Date().toISOString().split('T')[0]}`;

  try {
    // 1. Verify or Purchase Access
    // This handles the "Did they buy it?" and "Charge them" logic in one go.
    await billingService.purchaseOrVerifyAccess(userId, resourceId, 'TOP3', 2);

    // 2. If we passed step 1, they have access. Fetch Data.
    const data = await matchService.getTop3(userId);
    res.json(data);

  } catch (error) {
    if (error.message === "Insufficient Funds") {
      res.status(402).json({ error: "Please buy more tokens" });
    } else {
      res.status(500).json({ error: "Server Error" });
    }
  }
});
Step 3: Handling Upgrades (The "Tier Upgrade" Problem)
The Problem:

User pays 2 tokens for TOP3.

User later decides to pay for ALL (Cost: 5 tokens).

Total spent: 7 tokens.

Desired behavior: They should probably only pay the difference (3 tokens), OR simple overwrite (pay full 5).

For a simple implementation, pay full price (total 7) is easiest. If you want "Upgrade Pricing" (pay difference), the logic in Step 1 slightly changes:

TypeScript
// Advanced: "Upgrade" Logic
const existingUnlock = await db.unlocks.findFirst({ ... });

// If they have TOP3 and want ALL:
let finalCost = cost;
if (existingUnlock?.tier === 'TOP3' && requiredTier === 'ALL') {
   finalCost = cost - 2; // Reduce price by what they already paid
}
