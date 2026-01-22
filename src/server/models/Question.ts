export interface Question {
  id: string;                    // e.g., "q1", "q2"
  prompt: string;                // e.g., "Is the sky blue?"
  options: [string, string];     // MUST be exactly 2 options, e.g., ["Yes", "No"] or ["A", "B"]
  timer?: number;                // Optional: override default timer (in seconds)
  addedAt: Date;                 // When question was added to session
}
