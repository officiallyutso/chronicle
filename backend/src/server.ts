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
    console.log('AI services initialized successfully');
    
    // Test vector store
    const testEvent: ActivityEvent = {
      id: 'test_init',
      timestamp: Date.now(),
      type: ActivityType.SYSTEM_ACTIVE,
      data: { action: 'vector_store_test' },
      category: 'system'
    };
    await vectorStore.storeActivityEvent(testEvent);
    console.log('Vector store test successful');
    
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
app.post('/api/extensions/browser', async (req, res) => {
  const { url, title, action, domain, searchEngine, searchQuery } = req.body;
  
  const event: ActivityEvent = {
    id: `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type: ActivityType.BROWSER_SEARCH,
    data: { 
      url, 
      title, 
      action, 
      domain, 
      searchEngine, 
      searchQuery 
    },
    category: 'browser'
  };

  events.push(event);
  broadcastEvent(event);
  
  // CRITICAL FIX: Store browser events in vector database
  try {
    await vectorStore.storeActivityEvent(event);
    console.log(`Browser event stored in vector DB: ${action} on ${url}`);
  } catch (error) {
    console.error('Failed to store browser event in vector database:', error);
  }

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


async function generateReadmeFromProject(project: any): Promise<string> {
  const fileSummariesText = project.fileSummaries
    .map((summary: string) => `- ${summary}`)
    .join('\n');

  const folderSummariesText = Object.entries(project.folderSummaries || {})
    .map(([folder, summary]) => `## ${folder}\n${summary}`)
    .join('\n\n');

  // Detect project type and technologies
  const projectType = detectProjectType(project);
  const technologies = detectTechnologies(project);
  
  const enhancedPrompt = `You are an expert technical writer specializing in creating comprehensive, engaging GitHub README files. Generate a professional README.md that follows GitHub best practices.

PROJECT ANALYSIS:
- Project Name: ${project.name}
- Project Type: ${projectType}
- Technologies: ${technologies.join(', ')}

PROJECT OVERVIEW:
${project.projectSummary}

FOLDER STRUCTURE:
${folderSummariesText}

DETAILED FILE ANALYSIS:
${fileSummariesText}

REQUIREMENTS:
Create a comprehensive README.md with the following structure:

# ${project.name}

## Overview
Write an engaging 2-3 paragraph description that explains:
- What the project does
- Why it exists (problem it solves)
- Who it's for
- Key value proposition

## Features
Create a bulleted list of key features based on the code analysis. Use emojis and be specific about functionality.

## Tech Stack
List the technologies, frameworks, and tools used (based on file analysis).

## Project Structure
\`\`\`
${project.name}/
├── [create a visual tree structure based on folder summaries]
\`\`\`

## Getting Started

### Prerequisites
List required software, versions, and dependencies.

### Installation
Provide step-by-step installation instructions with code blocks.

### Configuration
Explain any configuration files or environment variables needed.

## Usage
Provide clear usage examples with code snippets and expected outputs.

## API Documentation
(If applicable) Document key API endpoints, parameters, and responses.

## Contributing
Standard contribution guidelines with:
- How to fork and clone
- Development setup
- Code style guidelines
- Pull request process

## License
Specify the license (default to MIT if not specified).

## Support
Contact information and support channels.

FORMATTING REQUIREMENTS:
- Use GitHub-flavored markdown
- Include appropriate badges (build status, version, license)
- Use less emojis for section headers
- Include code syntax highlighting
- Make it visually appealing and scannable
- Ensure all sections are relevant to the actual codebase
- Be specific, not generic - reference actual files and functionality
- Include installation commands specific to the project type
- Add usage examples that reflect the actual code

Make this README stand out and be genuinely helpful for developers who want to understand, install, and contribute to this project.`;

  try {
    const response = await enhancedAgentService.processConversationalQuery(enhancedPrompt);
    return response.output;
  } catch (error) {
    console.error('README generation error:', error);
    return 'Failed to generate README. Please ensure Ollama is running.';
  }
}

// Helper functions to detect project characteristics
function detectProjectType(project: any): string {
  const summaries = JSON.stringify(project.fileSummaries).toLowerCase();
  const folders = Object.keys(project.folderSummaries).join(' ').toLowerCase();
  
  if (summaries.includes('react') || summaries.includes('jsx') || summaries.includes('tsx')) {
    return 'React Application';
  } else if (summaries.includes('vue')) {
    return 'Vue.js Application';
  } else if (summaries.includes('angular')) {
    return 'Angular Application';
  } else if (summaries.includes('express') || summaries.includes('fastify')) {
    return 'Node.js Backend API';
  } else if (summaries.includes('flask') || summaries.includes('django')) {
    return 'Python Web Application';
  } else if (summaries.includes('spring') || summaries.includes('java')) {
    return 'Java Application';
  } else if (folders.includes('mobile') || summaries.includes('flutter') || summaries.includes('react native')) {
    return 'Mobile Application';
  } else if (summaries.includes('electron')) {
    return 'Desktop Application';
  } else {
    return 'Software Project';
  }
}

function detectTechnologies(project: any): string[] {
  const technologies = new Set<string>();
  const content = JSON.stringify(project).toLowerCase();
  
  // Frontend frameworks
  if (content.includes('react')) technologies.add('React');
  if (content.includes('vue')) technologies.add('Vue.js');
  if (content.includes('angular')) technologies.add('Angular');
  if (content.includes('svelte')) technologies.add('Svelte');
  
  // Backend frameworks
  if (content.includes('express')) technologies.add('Express.js');
  if (content.includes('fastify')) technologies.add('Fastify');
  if (content.includes('flask')) technologies.add('Flask');
  if (content.includes('django')) technologies.add('Django');
  if (content.includes('spring')) technologies.add('Spring Boot');
  
  // Languages
  if (content.includes('typescript') || content.includes('.ts')) technologies.add('TypeScript');
  if (content.includes('javascript') || content.includes('.js')) technologies.add('JavaScript');
  if (content.includes('python') || content.includes('.py')) technologies.add('Python');
  if (content.includes('java')) technologies.add('Java');
  if (content.includes('rust')) technologies.add('Rust');
  if (content.includes('go')) technologies.add('Go');
  
  // Databases
  if (content.includes('mongodb')) technologies.add('MongoDB');
  if (content.includes('postgresql') || content.includes('postgres')) technologies.add('PostgreSQL');
  if (content.includes('mysql')) technologies.add('MySQL');
  if (content.includes('redis')) technologies.add('Redis');
  if (content.includes('chromadb')) technologies.add('ChromaDB');
  
  // Tools
  if (content.includes('docker')) technologies.add('Docker');
  if (content.includes('kubernetes')) technologies.add('Kubernetes');
  if (content.includes('webpack')) technologies.add('Webpack');
  if (content.includes('vite')) technologies.add('Vite');
  if (content.includes('tailwind')) technologies.add('Tailwind CSS');
  
  return Array.from(technologies);
}


// Store project summaries from VS Code extension
app.post('/api/projects', async (req, res) => {
  try {
    console.log('Received project data:', JSON.stringify(req.body, null, 2)); // Debug log
    
    const { projectId, name, projectSummary, fileSummaries, folderSummaries, workspacePath } = req.body;
    
    const projectData = {
      id: projectId || `project_${Date.now()}`,
      name: name || 'Unknown Project',
      projectSummary: projectSummary || 'No summary available',
      fileSummaries: fileSummaries || [],
      folderSummaries: folderSummaries || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      workspacePath: workspacePath || ''
    };

    console.log('Storing project data:', JSON.stringify(projectData, null, 2)); // Debug log

    // Store in ChromaDB
    await vectorStore.storeProjectSummary(projectData);
    
    res.json({ success: true, projectId: projectData.id });
  } catch (error) {
    console.error('Failed to store project summary:', error);
    res.status(500).json({ error: 'Failed to store project summary' });
  }
});


// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    console.log('Fetching all projects...'); // Debug log
    const projects = await vectorStore.getAllProjects();
    console.log('Projects found:', projects.length); // Debug log
    console.log('Projects data:', projects); // Debug log
    res.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get specific project
app.get('/api/projects/:id', async (req, res) => {
  try {
    console.log('Fetching project:', req.params.id); // Debug log
    
    const project = await vectorStore.getProject(req.params.id);
    
    if (!project) {
      console.log('Project not found:', req.params.id);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    console.log('Returning project:', JSON.stringify(project, null, 2)); // Debug log
    res.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Generate README for project
app.post('/api/projects/:id/readme', async (req, res) => {
  try {
    const project = await vectorStore.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const readme = await generateReadmeFromProject(project);
    res.json({ readme });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate README' });
  }
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
