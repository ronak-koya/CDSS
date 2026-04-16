import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import diagnosisRoutes from './routes/diagnosis';
import alertRoutes from './routes/alerts';
import adminRoutes from './routes/admin';
import appointmentRoutes from './routes/appointments';
import availabilityRoutes from './routes/availability';
import portalRoutes from './routes/portal';
import callRoutes from './routes/calls';

const app: Application = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/diagnosis', diagnosisRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/calls', callRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── WebSocket: alerts broadcast + WebRTC signaling ──────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });

/** All connected clients (used for general alert broadcast) */
const clients = new Set<WebSocket>();

/** call rooms: callId → Map<userId, WebSocket> */
const callRooms = new Map<string, Map<string, WebSocket>>();

interface SigMsg { type: string; [k: string]: unknown }

function sendWs(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function relayToRoom(callId: string, fromUserId: string, payload: unknown) {
  callRooms.get(callId)?.forEach((ws, uid) => {
    if (uid !== fromUserId) sendWs(ws, payload);
  });
}

wss.on('connection', (ws) => {
  clients.add(ws);
  let roomCallId: string | null  = null;
  let roomUserId: string | null  = null;

  sendWs(ws, { type: 'connected', message: 'CDSS Real-time System Connected' });

  ws.on('message', (raw) => {
    let msg: SigMsg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {

      // ── Join a video-call room (verifies JWT room token) ─────────────────
      case 'call:join': {
        const { callId, token } = msg as { type: string; callId: string; token: string };
        try {
          const p = jwt.verify(token, process.env.JWT_SECRET!) as { callId: string; userId: string; role: string };
          if (p.callId !== callId) { sendWs(ws, { type: 'call:error', message: 'Invalid room token' }); return; }

          roomCallId = callId;
          roomUserId = p.userId;

          if (!callRooms.has(callId)) callRooms.set(callId, new Map());
          callRooms.get(callId)!.set(p.userId, ws);

          const peerCount = callRooms.get(callId)!.size - 1;
          sendWs(ws, { type: 'call:joined', callId, userId: p.userId, role: p.role, peerCount });
          relayToRoom(callId, p.userId, { type: 'call:peer-joined', callId, peerId: p.userId, role: p.role });
        } catch {
          sendWs(ws, { type: 'call:error', message: 'Unauthorized' });
        }
        break;
      }

      // ── WebRTC signaling — relay offer / answer / ICE to the other peer ──
      case 'call:offer':
      case 'call:answer':
      case 'call:ice': {
        if (roomCallId && roomUserId) relayToRoom(roomCallId, roomUserId, msg);
        break;
      }

      // ── In-call chat message ──────────────────────────────────────────────
      case 'call:chat': {
        if (roomCallId && roomUserId)
          relayToRoom(roomCallId, roomUserId, { ...msg, senderId: roomUserId });
        break;
      }

      // ── Leave call room ───────────────────────────────────────────────────
      case 'call:leave': {
        if (roomCallId && roomUserId) {
          callRooms.get(roomCallId)?.delete(roomUserId);
          relayToRoom(roomCallId, roomUserId, { type: 'call:peer-left', callId: roomCallId });
          if (callRooms.get(roomCallId)?.size === 0) callRooms.delete(roomCallId);
          roomCallId = null;
          roomUserId = null;
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (roomCallId && roomUserId) {
      callRooms.get(roomCallId)?.delete(roomUserId);
      relayToRoom(roomCallId, roomUserId, { type: 'call:peer-left', callId: roomCallId });
      if (callRooms.get(roomCallId)?.size === 0) callRooms.delete(roomCallId);
    }
  });

  ws.on('error', () => clients.delete(ws));
});

// ─── Broadcast to all connected clients (for alerts) ─────────────────────────
export const broadcast = (data: unknown) => {
  const msg = JSON.stringify(data);
  clients.forEach((ws) => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
};

setInterval(() => {
  if (clients.size > 0) broadcast({ type: 'ping', timestamp: new Date().toISOString() });
}, 60000);

// ─── Start server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🏥 CDSS Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket + WebRTC signaling at ws://localhost:${PORT}/ws`);
  console.log(`💊 API: http://localhost:${PORT}/api`);
  console.log(`\n🔑 Test accounts:`);
  console.log(`   Doctor: dr.smith@cdss.com / Password123!`);
  console.log(`   Nurse:  nurse.jones@cdss.com / Password123!`);
  console.log(`   Admin:  admin@cdss.com / Password123!\n`);
});

export default app;
