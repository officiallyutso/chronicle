import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';
import http from 'http';
import { ActivityEvent, ActivityType, SystemMonitor } from './services/systemMonitor';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// System monitor instance
const systemMonitor = new SystemMonitor();
let events: ActivityEvent[] = [];

// WebSocket connections
const clients = new Set<WebSocket>();

// WebSocket connection handling
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');

  // Send existing events to new client
  ws.send(JSON.stringify({
    type: 'INITIAL_EVENTS',
    data: events
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast event to all connected clients
function broadcastEvent(event: ActivityEvent) {
  const message = JSON.stringify({
    type: 'NEW_EVENT',
    data: event
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// System monitor event handler
systemMonitor.onEvent((event) => {
  events.push(event);
  broadcastEvent(event);
});

// REST API Routes
app.get('/api/events', (req, res) => {
  const { type, limit, startTime, endTime } = req.query;
  
  let filteredEvents = events;
  
  if (type) {
    filteredEvents = filteredEvents.filter(e => e.type === type);
  }
  
  if (startTime && endTime) {
    const start = parseInt(startTime as string);
    const end = parseInt(endTime as string);
    filteredEvents = filteredEvents.filter(e => 
      e.timestamp >= start && e.timestamp <= end
    );
  }
  
  if (limit) {
    const limitNum = parseInt(limit as string);
    filteredEvents = filteredEvents.slice(-limitNum);
  }
  
  res.json(filteredEvents);
});

app.get('/api/stats', (req, res) => {
  const stats = {
    total: events.length,
    applications: new Set(
      events
        .filter(e => e.type === ActivityType.APP_OPENED)
        .map(e => e.data.appName)
    ).size,
    filesModified: events.filter(e => e.type === ActivityType.FILE_CHANGED).length,
    terminalCommands: events.filter(e => e.type === ActivityType.TERMINAL_COMMAND).length,
    sessionDuration: events.length > 0 ? 
      Math.round((events[events.length - 1].timestamp - events[0].timestamp) / 1000 / 60) : 0,
    isTracking: systemMonitor.isTracking()
  };
  
  res.json(stats);
});

app.post('/api/tracking/start', (req, res) => {
  systemMonitor.startTracking();
  res.json({ success: true, message: 'Tracking started' });
});

app.post('/api/tracking/stop', (req, res) => {
  systemMonitor.stopTracking();
  res.json({ success: true, message: 'Tracking stopped' });
});

app.delete('/api/events', (req, res) => {
  events = [];
  broadcastEvent({
    id: `clear_${Date.now()}`,
    timestamp: Date.now(),
    type: ActivityType.SYSTEM_ACTIVE,
    data: { action: 'events_cleared' },
    category: 'system'
  });
  res.json({ success: true, message: 'Events cleared' });
});

// Extension data endpoints (for future VS Code and browser extensions)
app.post('/api/extensions/vscode', (req, res) => {
  const { action, file, project } = req.body;
  
  const event: ActivityEvent = {
    id: `vscode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type: ActivityType.VSCODE_ACTION,
    data: { action, file, project },
    category: 'editor'
  };
  
  events.push(event);
  broadcastEvent(event);
  
  res.json({ success: true, eventId: event.id });
});

app.post('/api/extensions/browser', (req, res) => {
  const { url, title, action } = req.body;
  
  const event: ActivityEvent = {
    id: `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type: ActivityType.BROWSER_SEARCH,
    data: { url, title, action },
    category: 'browser'
  };
  
  events.push(event);
  broadcastEvent(event);
  
  res.json({ success: true, eventId: event.id });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    eventsCount: events.length,
    isTracking: systemMonitor.isTracking()
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Chronicle Backend Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  
  // Start system monitoring
  systemMonitor.startTracking();
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  systemMonitor.stopTracking();
  server.close(() => {
    process.exit(0);
  });
});