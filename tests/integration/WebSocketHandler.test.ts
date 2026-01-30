import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketHandler } from '../../src/server/services/WebSocketHandler';

describe('WebSocketHandler: Question Creation with Owner Response', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wss: WebSocketServer;
  let wsHandler: WebSocketHandler;
  let port: number;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = createServer();
    wss = new WebSocketServer({ server: httpServer });
    wsHandler = new WebSocketHandler();

    // Setup WebSocket handler
    wss.on('connection', (ws) => {
      wsHandler.handleConnection(ws);
    });

    // Start server on random port and wait for it
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as any).port;
        console.log(`Test server started on port ${port}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      wss.close(() => {
        httpServer.close(() => {
          resolve();
        });
      });
    });
  });

  test('should create session, add question, and record owner response when ownerResponse is included', async () => {
    const ownerWs = new WebSocket(`ws://localhost:${port}`);
    
    await new Promise<void>((resolve, reject) => {
      let questionAddedReceived = false;
      let quizStateReceived = false;

      ownerWs.on('open', () => {
        // Step 1: Create session
        ownerWs.send(JSON.stringify({
          type: 'session:create',
          data: { username: 'TestOwner' }
        }));
      });

      ownerWs.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'session:created') {
          // Capture session and participant IDs
          const sessionId = message.data.sessionId;
          const ownerId = message.data.participantId;
          
          expect(sessionId).toBeDefined();
          expect(ownerId).toBeDefined();
        }

        if (message.type === 'quiz:state' && !questionAddedReceived) {
          // After initial quiz state, add question with owner response
          ownerWs.send(JSON.stringify({
            type: 'question:add',
            data: {
              prompt: 'Coffee or tea?',
              options: ['coffee', 'tea'],
              ownerResponse: 'coffee'
            }
          }));
        }

        if (message.type === 'question:added') {
          questionAddedReceived = true;
          const { question } = message.data;
          
          // Verify question was added
          expect(question).toBeDefined();
          expect(question.prompt).toBe('Coffee or tea?');
          expect(question.options).toEqual(['coffee', 'tea']);
          expect(question.id).toBeDefined();
        }

        if (message.type === 'quiz:state' && questionAddedReceived && !quizStateReceived) {
          quizStateReceived = true;
          
          // Verify quiz state includes the question and owner response
          expect(message.data.questions).toHaveLength(1);
          expect(message.data.questions[0].prompt).toBe('Coffee or tea?');
          
          // Verify owner's response was recorded
          expect(message.data.myResponses).toBeDefined();
          expect(message.data.myResponses).toHaveLength(1);
          expect(message.data.myResponses[0]).toBe('coffee');
          
          ownerWs.close();
          resolve();
        }
      });

      ownerWs.on('error', (error) => {
        ownerWs.close();
        reject(error);
      });
    });
  }, 10000);

  test('should add question without recording response when ownerResponse is omitted', async () => {
    const clientWs = new WebSocket(`ws://localhost:${port}`);
    
    await new Promise<void>((resolve, reject) => {
      let questionAddedReceived = false;

      clientWs.on('open', () => {
        // Create session
        clientWs.send(JSON.stringify({
          type: 'session:create',
          data: { username: 'TestOwner2' }
        }));
      });

      clientWs.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'quiz:state' && !questionAddedReceived) {
          // Add question WITHOUT owner response
          clientWs.send(JSON.stringify({
            type: 'question:add',
            data: {
              prompt: 'Yes or no?',
              options: ['yes', 'no']
              // ownerResponse is omitted
            }
          }));
        }

        if (message.type === 'question:added') {
          questionAddedReceived = true;
          const { question } = message.data;
          
          expect(question).toBeDefined();
          expect(question.prompt).toBe('Yes or no?');
        }

        if (message.type === 'quiz:state' && questionAddedReceived) {
          // Verify question exists but NO response recorded
          expect(message.data.questions).toHaveLength(1);
          expect(message.data.myResponses).toHaveLength(1);
          expect(message.data.myResponses[0]).toBe(''); // Empty = no response
          
          clientWs.close();
          resolve();
        }
      });

      clientWs.on('error', (error) => {
        clientWs.close();
        reject(error);
      });
    });
  }, 10000);
});
