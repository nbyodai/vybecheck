import { Router, Request, Response } from 'express';
import type { VybeLedger } from '../models/VybeLedger';

export function createVybesRoutes(vybeLedger: VybeLedger): Router {
  const router = Router();

  /**
   * GET /api/vybes/balance
   * Get Vybes balance for a participant
   */
  router.get('/balance', (req: Request, res: Response) => {
    const participantId = req.query.participantId as string;

    if (!participantId) {
      res.status(400).json({ error: 'Missing participantId' });
      return;
    }

    const balance = vybeLedger.getBalance(participantId);
    res.json({ balance });
  });

  /**
   * GET /api/vybes/history
   * Get transaction history for a participant
   */
  router.get('/history', (req: Request, res: Response) => {
    const participantId = req.query.participantId as string;

    if (!participantId) {
      res.status(400).json({ error: 'Missing participantId' });
      return;
    }

    const transactions = vybeLedger.getTransactionHistory(participantId);
    res.json({ transactions });
  });

  return router;
}
