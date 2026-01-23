// Shared types between client and server

import type { Question } from '../server/models/Question';
import type { Participant } from '../server/models/Participant';
import type { Response } from '../server/models/Response';

// Client → Server Messages
export type ClientMessage =
  | { type: 'session:create'; data: { username?: string } }
  | { type: 'session:join'; data: { sessionId: string; username?: string } }
  | { type: 'session:leave' }
  | { type: 'question:add'; data: { prompt: string; options: [string, string]; timer?: number } }
  | { type: 'response:submit'; data: { questionId: string; optionChosen: string } }
  | { type: 'matches:get' }
  | { type: 'ping'; timestamp: number };

// Server → Client Messages
export type ServerMessage =
  | { type: 'session:created'; data: { sessionId: string; participantId: string } }
  | { type: 'session:joined'; data: { sessionId: string; participantId: string; isOwner: boolean } }
  | { type: 'quiz:state'; data: QuizState }
  | { type: 'question:added'; data: { question: Question } }
  | { type: 'participant:joined'; data: ParticipantInfo }
  | { type: 'participant:left'; data: { participantId: string } }
  | { type: 'response:recorded'; data: { participantId: string; questionId: string } }
  | { type: 'matches:result'; data: { matches: MatchResult[] } }
  | { type: 'notification'; message: string }
  | { type: 'pong'; timestamp: number }
  | { type: 'error'; message: string };

// Simplified types for client
export interface QuizState {
  sessionId: string;
  ownerId: string;
  status: 'live' | 'active' | 'expired';
  questions: Question[];
  participants: ParticipantInfo[];
  participantCount: number;
  activeParticipantCount: number;
  myResponses: string[]; // Response values in question order
  myCompletionStatus: boolean; // Has participant completed all questions
}

export interface ParticipantInfo {
  id: string;
  username: string | null;
  isOwner: boolean;
  isActive: boolean;
}

export interface MatchResult {
  participantId: string;
  username: string | null;
  matchPercentage: number;
}
