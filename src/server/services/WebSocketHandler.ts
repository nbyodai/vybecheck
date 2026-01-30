import type { WebSocket } from 'ws';
import { QuizSession } from '../models/QuizSession';
import type { Participant } from '../models/Participant';
import type { Question } from '../models/Question';
import type { Response } from '../models/Response';
import { MatchingService } from './MatchingService';
import { generateParticipantId, generateQuestionId, generateResponseId } from '../utils/idGenerator';
import type { ClientMessage, ServerMessage, QuizState, ParticipantInfo, MatchResult } from '../../shared/types';

export class WebSocketHandler {
  private sessions: Map<string, QuizSession> = new Map();
  private connections: Map<WebSocket, { sessionId: string; participantId: string }> = new Map();
  private matchingService: MatchingService = new MatchingService();

  handleConnection(ws: WebSocket) {
    console.log('Client connected');

    ws.on('message', (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleMessage(ws: WebSocket, message: ClientMessage) {
    switch (message.type) {
      case 'session:create':
        this.handleSessionCreate(ws, message.data);
        break;
      case 'session:join':
        this.handleSessionJoin(ws, message.data);
        break;
      case 'question:add':
        this.handleQuestionAdd(ws, message.data);
        break;
      case 'response:submit':
        this.handleResponseSubmit(ws, message.data);
        break;
      case 'matches:get':
        this.handleMatchesGet(ws);
        break;
      case 'ping':
        this.send(ws, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  private handleSessionCreate(ws: WebSocket, data: { username?: string }) {
    const participantId = generateParticipantId();
    const session = new QuizSession(participantId);

    const owner: Participant = {
      id: participantId,
      username: data.username || null,
      connection: ws,
      isOwner: true,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };

    session.addParticipant(owner);
    this.sessions.set(session.sessionId, session);
    this.connections.set(ws, { sessionId: session.sessionId, participantId });

    this.send(ws, {
      type: 'session:created',
      data: { sessionId: session.sessionId, participantId }
    });

    this.sendQuizState(ws, session, participantId);
  }

  private handleSessionJoin(ws: WebSocket, data: { sessionId: string; username?: string }) {
    const session = this.sessions.get(data.sessionId);

    if (!session) {
      this.sendError(ws, `Session ${data.sessionId} not found`);
      return;
    }

    const participantId = generateParticipantId();
    const participant: Participant = {
      id: participantId,
      username: data.username || null,
      connection: ws,
      isOwner: false,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };

    session.addParticipant(participant);
    this.connections.set(ws, { sessionId: session.sessionId, participantId });

    this.send(ws, {
      type: 'session:joined',
      data: { sessionId: session.sessionId, participantId, isOwner: false }
    });

    this.sendQuizState(ws, session, participantId);
    this.broadcastToSession(session, {
      type: 'participant:joined',
      data: this.toParticipantInfo(participant)
    }, ws);
  }

  private handleQuestionAdd(ws: WebSocket, data: { prompt: string; options: [string, string]; timer?: number; ownerResponse?: string }) {
    const connectionInfo = this.connections.get(ws);
    if (!connectionInfo) {
      this.sendError(ws, 'Not in a session');
      return;
    }

    const session = this.sessions.get(connectionInfo.sessionId);
    if (!session) {
      this.sendError(ws, 'Session not found');
      return;
    }

    if (!session.canAddQuestion(connectionInfo.participantId)) {
      this.sendError(ws, 'Only owner can add questions');
      return;
    }

    const question: Question = {
      id: generateQuestionId(),
      prompt: data.prompt,
      options: data.options,
      timer: data.timer,
      addedAt: new Date()
    };

    try {
      session.addQuestion(question);
      
      // If owner provided a response, record it
      if (data.ownerResponse) {
        const ownerResponse: Response = {
          id: generateResponseId(),
          participantId: connectionInfo.participantId,
          questionId: question.id,
          sessionId: session.sessionId,
          optionChosen: data.ownerResponse,
          answeredAt: new Date()
        };
        session.recordResponse(ownerResponse);
      }
      
      this.broadcastToSession(session, {
        type: 'question:added',
        data: { question }
      });
      
      // Send updated quiz state to owner (includes their response if recorded)
      this.sendQuizState(ws, session, connectionInfo.participantId);
      
      this.broadcastToSession(session, {
        type: 'notification',
        message: 'New question added!'
      });
    } catch (error: any) {
      this.sendError(ws, error.message);
    }
  }

  private handleResponseSubmit(ws: WebSocket, data: { questionId: string; optionChosen: string }) {
    const connectionInfo = this.connections.get(ws);
    if (!connectionInfo) {
      this.sendError(ws, 'Not in a session');
      return;
    }

    const session = this.sessions.get(connectionInfo.sessionId);
    if (!session) {
      this.sendError(ws, 'Session not found');
      return;
    }

    const response: Response = {
      id: generateResponseId(),
      participantId: connectionInfo.participantId,
      questionId: data.questionId,
      sessionId: session.sessionId,
      optionChosen: data.optionChosen,
      answeredAt: new Date()
    };

    try {
      session.recordResponse(response);
      this.sendQuizState(ws, session, connectionInfo.participantId);
      this.broadcastToSession(session, {
        type: 'response:recorded',
        data: { participantId: connectionInfo.participantId, questionId: data.questionId }
      }, ws);
    } catch (error: any) {
      this.sendError(ws, error.message);
    }
  }

  private handleMatchesGet(ws: WebSocket) {
    const connectionInfo = this.connections.get(ws);
    if (!connectionInfo) {
      this.sendError(ws, 'Not in a session');
      return;
    }

    const session = this.sessions.get(connectionInfo.sessionId);
    if (!session) {
      this.sendError(ws, 'Session not found');
      return;
    }

    const matches = this.matchingService.getMatchesForParticipant(connectionInfo.participantId, session);
    const matchResults: MatchResult[] = matches.map(m => ({
      participantId: m.participantId,
      username: session.participants.get(m.participantId)?.username || null,
      matchPercentage: m.matchPercentage
    }));

    this.send(ws, {
      type: 'matches:result',
      data: { matches: matchResults }
    });
  }

  private handleDisconnect(ws: WebSocket) {
    const connectionInfo = this.connections.get(ws);
    if (connectionInfo) {
      const session = this.sessions.get(connectionInfo.sessionId);
      if (session) {
        const participant = session.participants.get(connectionInfo.participantId);
        if (participant) {
          participant.isActive = false;
          this.broadcastToSession(session, {
            type: 'participant:left',
            data: { participantId: connectionInfo.participantId }
          });
        }
      }
      this.connections.delete(ws);
    }
    console.log('Client disconnected');
  }

  private sendQuizState(ws: WebSocket, session: QuizSession, participantId: string) {
    const quizState: QuizState = {
      sessionId: session.sessionId,
      ownerId: session.ownerId,
      status: session.status,
      questions: session.questions,
      participants: Array.from(session.participants.values()).map(p => this.toParticipantInfo(p)),
      participantCount: session.getParticipantCount(),
      activeParticipantCount: session.getActiveParticipantCount(),
      myResponses: session.getResponseValuesForParticipant(participantId),
      myCompletionStatus: session.hasParticipantCompletedQuiz(participantId)
    };

    this.send(ws, { type: 'quiz:state', data: quizState });
  }

  private broadcastToSession(session: QuizSession, message: ServerMessage, exclude?: WebSocket) {
    for (const participant of session.participants.values()) {
      if (participant.connection && participant.connection !== exclude && participant.isActive) {
        this.send(participant.connection, message);
      }
    }
  }

  private toParticipantInfo(participant: Participant): ParticipantInfo {
    return {
      id: participant.id,
      username: participant.username,
      isOwner: participant.isOwner,
      isActive: participant.isActive
    };
  }

  private send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.send(ws, { type: 'error', message });
  }
}
