/**
 * Generate a unique participant ID
 * Uses timestamp + random string for uniqueness
 */
export function generateParticipantId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${randomPart}`;
}

/**
 * Generate a unique response ID
 * Uses incrementing counter for simplicity
 */
let responseCounter = 0;
export function generateResponseId(): string {
  responseCounter++;
  return responseCounter.toString().padStart(2, '0');
}

/**
 * Generate a unique question ID
 * Format: q1, q2, q3, etc.
 */
let questionCounter = 0;
export function generateQuestionId(): string {
  questionCounter++;
  return `q${questionCounter}`;
}

/**
 * Reset all counters (useful for testing)
 */
export function resetCounters(): void {
  responseCounter = 0;
  questionCounter = 0;
}
