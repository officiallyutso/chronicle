import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';
import http from 'http';
import { ActivityEvent, ActivityType, SystemMonitor } from './services/systemMonitor';
import { VectorStore } from './services/vectorStore';
import { EnhancedAgentService } from './services/agentService'; // Import the new service

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// System monitor instance
const systemMonitor = new SystemMonitor();
let events: ActivityEvent[] = [];

// WebSocket clients
const clients = new Set<WebSocket>();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('🔌 WebSocket client connected');

  // Send all existing events on connection
  ws.send(JSON.stringify({
    type: 'INITIAL_EVENTS',
    data: events
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast event to all connected WebSocket clients
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

// Initialize AI services
const vectorStore = new VectorStore();
const enhancedAgentService = new EnhancedAgentService(vectorStore); // Use new service

async function initializeAIServices() {
  try {
    await vectorStore.initialize();
    await enhancedAgentService.initialize();
    console.log('AI services initialized');
  } catch (error) {
    console.error('Failed to initialize AI services:', error);
  }
}

// Handle system events
systemMonitor.onEvent(async (event) => {
  events.push(event);
  broadcastEvent(event);

  // Store in vector database
  try {
    await vectorStore.storeActivityEvent(event);
  } catch (error) {
    console.error('Failed to store event in vector database:', error);
  }

  // Pretty console logging for each activity type
  switch (event.type) {
    case ActivityType.APP_OPENED:
      console.log(`App opened: ${event.data.appName}`);
      break;
    case ActivityType.APP_CLOSED:
      console.log(`App closed: ${event.data.appName}`);
      break;
    case ActivityType.TERMINAL_COMMAND:
      console.log(`Terminal command: ${event.data.command} (Shell: ${event.data.shell})`);
      break;
    case ActivityType.FILE_CHANGED:
      console.log(`File ${event.data.action}: ${event.data.fullPath}`);
      break;
    case ActivityType.VSCODE_ACTION:
      console.log(`VS Code: ${event.data.action} -> ${event.data.file} (${event.data.project})`);
      break;
    case ActivityType.BROWSER_SEARCH:
      console.log(`Browser: ${event.data.action} on ${event.data.url}`);
      break;
    case ActivityType.SYSTEM_ACTIVE:
      console.log(`System metrics: uptime=${(event.data.uptime / 60).toFixed(1)} mins, CPU=${event.data.cpuCount}, mem=${(event.data.freeMemory / 1e9).toFixed(2)}GB free`);
      break;
    default:
      console.log(`Other Event:`, event);
      break;
  }
});

// Updated AI endpoints
app.post('/api/ai/query', async (req, res) => {
  try {
    const { query } = req.body;
    const result = await enhancedAgentService.processConversationalQuery(query); // Use new method
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process AI query' });
  }
});

app.post('/api/ai/narrative', async (req, res) => {
  try {
    const { style } = req.body;
    const recentEvents = events.slice(-50);
    // Create a simple narrative method for backward compatibility
    const narrative = await generateSimpleNarrative(recentEvents, style);
    res.json({ narrative });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate narrative' });
  }
});

// Add new chat endpoints
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const result = await enhancedAgentService.processConversationalQuery(message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

app.get('/api/ai/chat/history', async (req, res) => {
  try {
    const history = await enhancedAgentService.getChatHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

app.delete('/api/ai/chat/history', async (req, res) => {
  try {
    await enhancedAgentService.clearChatHistory();
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// Simple narrative generation for backward compatibility
async function generateSimpleNarrative(events: ActivityEvent[], style: any): Promise<string> {
  const recentEvents = events.slice(-100); // Get more events for better context
  
  // Analyze events by type
  const appEvents = recentEvents.filter(e => e.type === ActivityType.APP_OPENED);
  const fileEvents = recentEvents.filter(e => e.type === ActivityType.FILE_CHANGED);
  const terminalEvents = recentEvents.filter(e => e.type === ActivityType.TERMINAL_COMMAND);
  const browserEvents = recentEvents.filter(e => e.type === ActivityType.BROWSER_SEARCH);

  // Create detailed context
  const sessionDuration = recentEvents.length > 0 
    ? Math.round((recentEvents[recentEvents.length - 1].timestamp - recentEvents[0].timestamp) / 1000 / 60)
    : 0;

  const uniqueApps = [...new Set(appEvents.map(e => e.data.appName))];
  const uniqueFiles = [...new Set(fileEvents.map(e => e.data.fileName))];
  const projects = [...new Set(terminalEvents.map(e => e.data.projectName).filter(Boolean))];

  let prompt = '';

  switch (style.tone) {
    case 'gamified':
      prompt = `You are a Game Master narrating an epic coding adventure! Create a ${style.format} that tells the story of a developer's coding session.

SESSION STATS:
- Duration: ${sessionDuration} minutes of epic coding
- Applications Used: ${uniqueApps.join(', ')}
- Files Modified: ${uniqueFiles.slice(0, 5).join(', ')}${uniqueFiles.length > 5 ? ' and more' : ''}
- Terminal Commands: ${terminalEvents.length} powerful spells cast
- Projects: ${projects.join(', ')}

RECENT ACTIVITIES:
${recentEvents.slice(-20).map(e => `- ${e.type}: ${JSON.stringify(e.data)}`).join('\n')}

Write this as an EPIC GAMING ADVENTURE with:
- RPG-style language (quests, battles, achievements, XP)
- Exciting action words
- Gaming metaphors for coding activities
- Achievement unlocks and level-ups
- Boss battles (debugging, complex features)
- Power-ups (new tools, successful builds)

Make it feel like the developer is the hero of an epic coding quest!`;
      break;

    case 'professional':
      prompt = `Create a professional development session report in ${style.format} format.

SESSION OVERVIEW:
- Duration: ${sessionDuration} minutes
- Total Activities: ${recentEvents.length}
- Applications: ${uniqueApps.join(', ')}
- Projects Worked On: ${projects.join(', ')}

DETAILED BREAKDOWN:
- File Operations: ${fileEvents.length} files modified
- Terminal Operations: ${terminalEvents.length} commands executed
- Primary Files: ${uniqueFiles.slice(0, 5).join(', ')}

RECENT ACTIVITY LOG:
${recentEvents.slice(-15).map(e => `${new Date(e.timestamp).toLocaleTimeString()}: ${e.type} - ${JSON.stringify(e.data)}`).join('\n')}

Write a PROFESSIONAL, BUSINESS-STYLE report with:
- Clear metrics and KPIs
- Structured analysis
- Productivity insights
- Technical accomplishments
- Time management observations
- Professional language and tone

Focus on efficiency, productivity, and technical achievements.`;
      break;

    case 'technical':
      prompt = `Generate a technical system log analysis in ${style.format} format.

SYSTEM METRICS:
- Session Duration: ${sessionDuration}m
- Process Count: ${recentEvents.length}
- File I/O Operations: ${fileEvents.length}
- Shell Executions: ${terminalEvents.length}
- Application Contexts: ${uniqueApps.length}

PROCESS TREE:
${recentEvents.slice(-10).map(e => `[${new Date(e.timestamp).toISOString()}] ${e.type.toUpperCase()}: ${JSON.stringify(e.data)}`).join('\n')}

PROJECT ANALYSIS:
${projects.map(project => `- ${project}: ${terminalEvents.filter(e => e.data.projectName === project).length} operations`).join('\n')}

Write in TECHNICAL DOCUMENTATION STYLE with:
- System-level terminology
- Process and thread references
- File system operations
- Memory and performance metrics
- Code-like formatting
- Technical precision
- Engineering terminology

Make it sound like a detailed system analysis report.`;
      break;

    case 'casual':
    default:
      prompt = `Write a casual, friendly summary in ${style.format} format about a coding session.

What happened in the last ${sessionDuration} minutes:
- Used these apps: ${uniqueApps.join(', ')}
- Worked on: ${projects.join(', ')}
- Modified ${fileEvents.length} files
- Ran ${terminalEvents.length} commands

Recent stuff:
${recentEvents.slice(-10).map(e => `- ${e.type}: ${JSON.stringify(e.data)}`).join('\n')}

Write this in a CASUAL, FRIENDLY tone like you're telling a friend:
- Use everyday language
- Be conversational and relaxed
- Include some humor if appropriate
- Make it relatable
- Use "you" to address the developer
- Keep it light and encouraging

Make it feel like a friendly chat about what they accomplished!`;
      break;
  }

  try {
    const response = await enhancedAgentService.processConversationalQuery(prompt);
    return response.output;
  } catch (error) {
    console.error('Narrative generation error:', error);
    return 'Unable to generate narrative. Please ensure Ollama is running with the llama3 model.';
  }
}

// Keep all your existing endpoints (getEvents, getStats, etc.)
app.get('/api/ai/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    const results = await vectorStore.searchSimilarActivities(query as string, parseInt(limit as string));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search activities' });
  }
});

// REST API: Get all events
app.get('/api/events', (req, res) => {
  const { type, limit, startTime, endTime } = req.query;
  let filtered = events;

  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }

  if (startTime && endTime) {
    const start = parseInt(startTime as string);
    const end = parseInt(endTime as string);
    filtered = filtered.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  if (limit) {
    const limitNum = parseInt(limit as string);
    filtered = filtered.slice(-limitNum);
  }

  res.json(filtered);
});

// REST API: Stats summary
app.get('/api/stats', (req, res) => {
  const stats = {
    total: events.length,
    applications: new Set(events.filter(e => e.type === ActivityType.APP_OPENED).map(e => e.data.appName)).size,
    filesModified: events.filter(e => e.type === ActivityType.FILE_CHANGED).length,
    terminalCommands: events.filter(e => e.type === ActivityType.TERMINAL_COMMAND).length,
    sessionDuration: events.length > 0
      ? Math.round((events[events.length - 1].timestamp - events[0].timestamp) / 1000 / 60)
      : 0,
    isTracking: systemMonitor.isTracking()
  };
  res.json(stats);
});

// Start/Stop Tracking
app.post('/api/tracking/start', (req, res) => {
  systemMonitor.startTracking();
  res.json({ success: true, message: 'Tracking started' });
});

app.post('/api/tracking/stop', (req, res) => {
  systemMonitor.stopTracking();
  res.json({ success: true, message: 'Tracking stopped' });
});

// Clear Events
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

// VS Code extension input
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

// Browser extension input
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

// Start the HTTP + WS server
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`Chronicle Backend Server running on port ${PORT}`);
  console.log(`WebSocket server at ws://localhost:${PORT}`);

  // Initialize AI services
  await initializeAIServices();

  // Auto-start tracking
  systemMonitor.startTracking();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  systemMonitor.stopTracking();
  server.close(() => process.exit(0));
});
