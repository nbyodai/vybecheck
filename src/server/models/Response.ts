export interface Response {
  id: string;                    // e.g., "01", "02"
  participantId: string;         // e.g., "123Abc"
  questionId: string;            // e.g., "q1"
  sessionId: string;             // e.g., "aabaox8aol"
  optionChosen: string;          // e.g., "red", "blue"
  answeredAt: Date;              // Timestamp
}
