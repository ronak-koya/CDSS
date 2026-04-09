import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import diagnosisRoutes from './routes/diagnosis';
import alertRoutes from './routes/alerts';
import adminRoutes from './routes/admin';
import appointmentRoutes from './routes/appointments';
import availabilityRoutes from './routes/availability';
import portalRoutes from './routes/portal';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/diagnosis', diagnosisRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/portal', portalRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// WebSocket server for real-time alerts
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`WebSocket client connected. Total: ${clients.size}`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', () => clients.delete(ws));

  // Send welcome ping
  ws.send(JSON.stringify({ type: 'connected', message: 'CDSS Real-time Alert System Connected' }));
});

// Export broadcast function for other modules
export const broadcast = (data: unknown) => {
  const msg = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
};

// Simulate real-time alert push every 60s (demo)
setInterval(() => {
  if (clients.size > 0) {
    broadcast({ type: 'ping', timestamp: new Date().toISOString(), activeClients: clients.size });
  }
}, 60000);

server.listen(PORT, () => {
  console.log(`\n🏥 CDSS Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`💊 API: http://localhost:${PORT}/api`);
  console.log(`\n🔑 Test accounts:`);
  console.log(`   Doctor: dr.smith@cdss.com / Password123!`);
  console.log(`   Nurse:  nurse.jones@cdss.com / Password123!`);
  console.log(`   Admin:  admin@cdss.com / Password123!\n`);
});

export default app;
