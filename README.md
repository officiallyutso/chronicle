<div align="center">
  <img src="https://github.com/user-attachments/assets/b50924f3-6e28-440f-ae36-94f154cd27a7" alt="Chronicle AI Logo" width="100">
</div>

<div align="center">
   
![Chronicle Logo](https://img.shields.io/badge/Chronicle-AI%20Tracking%20%26%20Analysis-blue?style=for-the-badge&logo=brain&logoColor=white)

[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Node.js](https://img.shields.io/badge/Electron-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![LangChain](https://img.shields.io/badge/LangChain-121212?style=for-the-badge&logo=chainlink&logoColor=white)](https://langchain.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B6B?style=for-the-badge&logo=database&logoColor=white)](https://chromadb.com)
[![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=llama&logoColor=white)](https://ollama.ai)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Cross%20Platform-lightgrey?style=for-the-badge)](https://github.com/officiallyutso/chronicle)

**Revolutionizing Digital Workflow Intelligence with AI-Powered Activity Analysis**

*Chronicle is a comprehensive, privacy-first activity tracking and analysis platform that leverages cutting-edge AI technologies to monitor, analyze, and narrativize your digital workflow. Built with modern technologies including LangChain, Ollama, ChromaDB, and React, Chronicle provides intelligent insights into your development activities while keeping all data completely local and secure.*
</div>

---

# Table of Contents

<details>
<summary>System Architecture</summary>

- [Overview](#overview)
- [Technology Stack](#technology-stack)

</details>

<details>
<summary>Core Components</summary>

- [VS Code Extension](#vs-code-extension)
- [Browser Extension](#browser-extension)
- [System Monitor](#system-monitor)
- [Desktop Application](#desktop-application)

</details>

<details>
<summary>AI & Vector Database</summary>

- [Agentic AI System](#agentic-ai-system)
- [Vector Database Integration](#vector-database-integration)

</details>

<details>
<summary>Installation & Setup</summary>

- [Prerequisites](#prerequisites)
- [Step-by-Step Installation](#step-by-step-installation)
- [Advanced Configuration](#advanced-configuration)

</details>

<details>
<summary>API Reference</summary>

- [Core Backend Endpoints](#core-backend-endpoints)
- [WebSocket Events](#websocket-events)
- [Extension APIs](#extension-apis)

</details>

<details>
<summary>Performance & Security</summary>

- [Performance Optimization](#performance-optimization)
- [Security & Privacy](#security--privacy)

</details>

<details>
<summary>Development</summary>

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

</details>

<details>
<summary>Future Roadmap</summary>

- [Future Roadmap](#future-roadmap)

</details>

<details>
<summary>License & Acknowledgments</summary>

- [License](#license)
- [Acknowledgments](#acknowledgments)

</details>

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "User Environment"
        VSCode[VS Code Extension]
        Browser[Browser Extension]
        Desktop[Desktop App - Electron]
        System[System Monitor]
    end
    
    subgraph "Core Backend Microservices"
        Backend[Express Backend Server]
        Vector[ChromaDB Vector Store]
        AI[Ollama + LangChain]
        Agent[Enhanced Agent Service]
    end
    
    subgraph "AI Components"
        Embeddings[Nomic Embeddings]
        Chat[Conversational AI]
        Narrative[Story Generator]
        Memory[Context Memory]
    end
    
    subgraph "Data Layer"
        ChromaDB[(ChromaDB)]
        LocalFiles[(Local Files)]
        VectorData[(Vector Embeddings)]
    end
    
    VSCode --> Backend
    Browser --> Backend
    System --> Backend
    Desktop --> Backend
    
    Backend --> Vector
    Backend --> AI
    Backend --> Agent
    
    AI --> Embeddings
    AI --> Chat
    AI --> Narrative
    AI --> Memory
    
    Vector --> ChromaDB
    Agent --> VectorData
    Backend --> LocalFiles
    
    ChromaDB --> VectorData
```

---

## Technology Stack

### Core Technologies
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Frontend** | React 19 + TypeScript | 19.1.0 | Modern UI with type safety |
| **Desktop App** | Electron | 37.1.0 | Cross-platform desktop application |
| **Backend** | Express.js + TypeScript | 4.18.2 | RESTful API and WebSocket server |
| **AI Framework** | LangChain | 0.3.57 | Agentic AI and language model integration |
| **Vector Database** | ChromaDB | 3.0.6 | Semantic search and embeddings storage |
| **Embeddings** | Nomic-embed-text | Latest | High-quality text embeddings |
| **LLM** | Ollama + Llama3 | Latest | Local language model inference |
| **Build Tool** | Vite | 7.0.0 | Fast development and build system |

---

## Activity Tracker Features

| Description | Screenshot |
|-------------|------------|
| **Dashboard** - Main interface showing overview of your daily activities and statistics | <img src="https://github.com/user-attachments/assets/a0ef5a2e-43c0-4d9e-bd3e-8e6d9ac56179" width="400"> |
| **Activity Panel** - View and manage your tracked activities with detailed information | <img src="https://github.com/user-attachments/assets/f6612f23-5af7-4da8-9adc-38cd34997d69" width="400"> |
| **Activity Details** - Detailed view of individual activities with time tracking and metadata | <img src="https://github.com/user-attachments/assets/9a69dbdf-9b97-42cb-aeca-12a28edda50e" width="400"> |
| **Activity Sorting** - Sort and filter activities by different criteria for better organization | <img src="https://github.com/user-attachments/assets/1a8e088d-416d-469f-82ce-9b30c406c1cc" width="400"> |
| **Activity Based Narrative - Tone Selection** - Choose the tone and style for generating narratives from your activities | <img src="https://github.com/user-attachments/assets/ddbedafd-e2a5-4ab6-a6d9-401a310bf416" width="400"> |
| **Activity Based Narrative - Story Generation** - Generate compelling stories and narratives based on your tracked activities | <img src="https://github.com/user-attachments/assets/1c8a566e-f1f9-47a5-a5c4-f7e212ec41ec" width="400"> |
| **Activity Based Narrative - Achievement Summary** - View achievements and milestones based on your activity patterns | <img src="https://github.com/user-attachments/assets/44457de6-0171-40ea-a50b-1b425b57c0d0" width="400"> |
| **Agentic AI Context Chat** - Chat with AI about your daily activities and get insights from your data | <img src="https://github.com/user-attachments/assets/1f74b766-c82f-4084-8ac6-13e77f25ee02" width="400"> |
| **AI Chat Interface** - Interactive chat interface for discussing your activities with AI assistance | <img src="https://github.com/user-attachments/assets/ce19d11a-67a0-4e3c-8776-8d9c8248f2af" width="400"> |
| **AI Data Context** - AI shows the specific data it's referencing when providing insights about your activities | <img src="https://github.com/user-attachments/assets/398628eb-7958-4ea3-9193-70ea832cbe2a" width="400"> |
| **Project AI - VS Code Integration** - Automatically detects and connects to your VS Code projects for enhanced tracking | <img src="https://github.com/user-attachments/assets/3f8622b5-19d7-47e4-9af5-af5800f6d1e1" width="400"> |
| **Project AI - Project Summary** - Get comprehensive summaries of your projects including structure and progress | <img src="https://github.com/user-attachments/assets/5d03869f-e81e-43f5-b319-a813a5eed191" width="400"> |
| **Project AI - File Structure** - View detailed file structure and organization of your projects | <img src="https://github.com/user-attachments/assets/ad031c26-c54f-48f6-862b-5144cf821735" width="400"> |
| **Project AI - README Generation** - Generate perfect README files automatically based on your project structure and activity | <img src="https://github.com/user-attachments/assets/c798dcd0-bded-4eae-b6cc-99970070f2ba" width="400"> |
| **Settings & Clear Data** - Manage application settings and clear your data when needed | <img src="https://github.com/user-attachments/assets/8ac70688-c174-4c4d-aba8-30f78fd336bb" width="400"> |
| **Browser Extension** - Track your web browsing activities and integrate with the main application | <img src="https://github.com/user-attachments/assets/faab72a9-2220-46ea-9ccc-f47851f5eebd" height="400"> |
| **Browser Extension Integration** - Seamless integration between browser extension and main application | <img src="https://github.com/user-attachments/assets/46cf3aa5-72b7-4fa7-9653-a88467899b20" height="400"> |
| **VS Code Extension - Available Commands** - View all available commands and features within the VS Code extension | <img src="https://github.com/user-attachments/assets/56103246-74ca-4f0e-9e43-0cd6fcccdff3" width="400"> |
| **VS Code Extension - Activity Log** - Track your coding activities directly within VS Code with detailed logging | <img src="https://github.com/user-attachments/assets/8bf979d9-d57e-452c-ba78-901ae23194fd" width="400"> |
| **VS Code Extension - Project Summary** - Get project summaries and insights directly within your VS Code workspace | <img src="https://github.com/user-attachments/assets/fc4b20ac-f2d9-4937-8027-a7cfc145b0f5" width="400"> |
| **UNITY - AI package** - Package to generate npc characters - Agentic AI  | <img src="https://github.com/user-attachments/assets/d39735f4-857b-472a-a105-7d6f1f214634" width="400"> |
| **UNITY - NPC AI** - Package to generate scriptable npc characters - Agentic AI  | <img src="https://github.com/user-attachments/assets/ec63e718-f1b9-48fd-bb25-6f363b75686a" width="600"> |

---





## VS Code Extension Architecture

### Extension Components

```mermaid

graph LR

    subgraph "VS Code Extension"
        ExtMain[extension.ts]
        Summarizer[summarizer.ts]
        Commands[Command Handlers]
        FileWatcher[File System Watcher]
    end
    
    subgraph "VS Code API"
        Workspace[Workspace API]
        TextDoc[TextDocument API]
        Commands2[Commands API]
        FileSystem[FileSystem API]
    end
    
    subgraph "Backend Integration"
        ProjectAPI[Project API]
        OllamaAPI[Ollama API]
        ChromaStore[ChromaDB Storage]
    end
    
    ExtMain --> Commands
    ExtMain --> FileWatcher
    ExtMain --> Summarizer
    
    Commands --> Workspace
    FileWatcher --> FileSystem
    Summarizer --> TextDoc
    
    Summarizer --> OllamaAPI
    ExtMain --> ProjectAPI
    ProjectAPI --> ChromaStore
```


### Core Features

**File Activity Tracking**
- Monitors file open/close/save operations
- Tracks file modifications and creations
- Captures project-level context and metadata
- Filters development-relevant file types

**Intelligent Project Analysis**
- Generates comprehensive project summaries using Ollama
- Analyzes folder structures and file relationships
- Creates contextual file summaries with AI
- Exports structured project data to backend

**Command Integration**
```typescript
// Key VS Code commands implemented
'chronicle.activateChronicle'     // Start tracking
'chronicle.deactivateChronicle'   // Stop tracking
'chronicle.summarizeProject'      // Full project analysis
'chronicle.summarizeCurrentFile'  // Single file summary
'chronicle.summarizeCurrentFolder' // Folder analysis
'chronicle.openLog'              // View activity log
```


### Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant VSCode
    participant Extension
    participant Ollama
    participant Backend
    participant ChromaDB
    
    User->>VSCode: Opens/Edits File
    VSCode->>Extension: File Event
    Extension->>Extension: Log Activity
    User->>Extension: Summarize Project
    Extension->>Ollama: Generate Summary
    Ollama->>Extension: AI Summary
    Extension->>Backend: Send Project Data
    Backend->>ChromaDB: Store Embeddings
    ChromaDB->>Backend: Confirm Storage
    Backend->>Extension: Success Response
    Extension->>VSCode: Show Results
```

---

## Browser Extension Architecture

### Extension Components

```mermaid
graph TB
    subgraph "Browser Extension"
        Background[background.jsService Worker]
        Content[content.jsContent Script]
        Popup[popup.html/jsUser Interface]
        Manifest[manifest.jsonConfiguration]
    end
    
    subgraph "Browser APIs"
        Tabs[Tabs API]
        History[History API]
        Storage[Storage API]
        WebNav[WebNavigation API]
    end
    
    subgraph "Web Pages"
        SearchEngines[Search Engines]
        Websites[Regular Websites]
        SPA[Single Page Apps]
    end
    
    subgraph "Backend"
        BrowserAPI[Browser Events API]
        EventStore[Event Storage]
    end
    
    Background --> Tabs
    Background --> History
    Background --> Storage
    Content --> SearchEngines
    Content --> Websites
    Content --> SPA
    
    Background --> BrowserAPI
    BrowserAPI --> EventStore
    
    Popup --> Background
    Content --> Background
```

### Tracking Capabilities

**Search Activity Monitoring**
- Detects searches across major search engines (Google, Bing, DuckDuckGo, Yahoo)
- Extracts search queries and tracks search result clicks
- Monitors search result positions and engagement
- Tracks search session duration and patterns

**Website Activity Tracking**
- Monitors website visits and session durations
- Tracks tab switching and focus events
- Captures page titles and domain information
- Detects single-page application navigation

**Engagement Analytics**
- Scroll depth tracking for content engagement
- Page visibility change detection
- Click pattern analysis
- Session time measurement

### Search Engine Integration

```mermaid
graph LR
    subgraph "Search Engines"
        Google[Google Search]
        Bing[Bing Search]
        Duck[DuckDuckGo]
        Yahoo[Yahoo Search]
    end
    
    subgraph "Detection Logic"
        URLParser[URL Parser]
        QueryExtractor[Query Extractor]
        ResultDetector[Result Detector]
    end
    
    subgraph "Event Types"
        SearchPerformed[Search Performed]
        ResultClicked[Result Clicked]
        EngineVisited[Engine Visited]
    end
    
    Google --> URLParser
    Bing --> URLParser
    Duck --> URLParser
    Yahoo --> URLParser
    
    URLParser --> QueryExtractor
    QueryExtractor --> ResultDetector
    
    ResultDetector --> SearchPerformed
    ResultDetector --> ResultClicked
    ResultDetector --> EngineVisited
```

---

## System Monitor Microservice

### Architecture Overview

```mermaid
graph TB
    subgraph "System Monitor Service"
        Monitor[SystemMonitor Class]
        AppTracker[Application Tracker]
        FileWatcher[File System Watcher]
        TerminalMonitor[Terminal Monitor]
        MetricsCollector[System Metrics]
    end
    
    subgraph "OS Integration"
        ProcessAPI[Process APIs]
        FileSystemAPI[File System APIs]
        HistoryFiles[Shell History Files]
        SystemAPIs[System APIs]
    end
    
    subgraph "Data Processing"
        EventEmitter[Event Emitter]
        DataFilter[Data Filtering]
        ContextEnricher[Context Enricher]
    end
    
    subgraph "Output"
        WebSocket[WebSocket Events]
        APIEndpoints[REST API]
        VectorStore[Vector Storage]
    end
    
    Monitor --> AppTracker
    Monitor --> FileWatcher
    Monitor --> TerminalMonitor
    Monitor --> MetricsCollector
    
    AppTracker --> ProcessAPI
    FileWatcher --> FileSystemAPI
    TerminalMonitor --> HistoryFiles
    MetricsCollector --> SystemAPIs
    
    Monitor --> EventEmitter
    EventEmitter --> DataFilter
    DataFilter --> ContextEnricher
    
    ContextEnricher --> WebSocket
    ContextEnricher --> APIEndpoints
    ContextEnricher --> VectorStore
```

### Cross-Platform Monitoring

**Application Tracking**
```typescript
// Platform-specific application monitoring
switch (this.platform) {
  case 'darwin':
    // macOS: ps -eo comm
    const { stdout } = await execAsync('ps -eo comm | grep -v "^COMMAND"');
    break;
  case 'win32':
    // Windows: tasklist /fo csv
    const { stdout } = await execAsync('tasklist /fo csv');
    break;
  case 'linux':
    // Linux: ps -eo comm --no-headers
    const { stdout } = await execAsync('ps -eo comm --no-headers');
    break;
}
```

**Terminal Command Monitoring**
- Bash history file monitoring (`~/.bash_history`)
- Zsh history tracking (`~/.zsh_history`)
- PowerShell history on Windows
- Real-time process monitoring for active terminals
- Command context detection (git, npm, python, etc.)

**File System Monitoring**
- Recursive directory watching with exclusion filters
- Development file type filtering (.js, .ts, .py, .java, etc.)
- Project context detection and classification
- Change type detection (create, modify, delete)

### Event Processing Pipeline

```mermaid
flowchart TD
    A[Raw System Event] --> B{Event Type}
    B -->|Application| C[App Event Processor]
    B -->|File System| D[File Event Processor]
    B -->|Terminal| E[Terminal Event Processor]
    B -->|System| F[System Event Processor]
    
    C --> G[Context Enrichment]
    D --> G
    E --> G
    F --> G
    
    G --> H[Data Validation]
    H --> I[Event Emission]
    I --> J[WebSocket Broadcast]
    I --> K[Vector Storage]
    I --> L[Real-time Dashboard]
```

---

## Agentic AI System

### Enhanced Agent Architecture

```mermaid
graph TB
    subgraph "Enhanced Agent Service"
        Agent[EnhancedAgentService]
        Memory[BufferMemory]
        Chain[ConversationChain]
        Tools[Analysis Tools]
    end
    
    subgraph "LangChain Components"
        LLM[ChatOllama]
        Prompt[ChatPromptTemplate]
        MemoryBuffer[Memory Buffer]
    end
    
    subgraph "Custom Tools"
        ActivityTool[ActivityAnalysisTool]
        MemoryTool[ConversationMemoryTool]
        VectorTool[VectorSearchTool]
    end
    
    subgraph "Data Sources"
        VectorDB[ChromaDB]
        EventStream[Activity Events]
        Context[Conversation Context]
    end
    
    Agent --> Memory
    Agent --> Chain
    Agent --> Tools
    
    Chain --> LLM
    Chain --> Prompt
    Memory --> MemoryBuffer
    
    Tools --> ActivityTool
    Tools --> MemoryTool
    Tools --> VectorTool
    
    ActivityTool --> VectorDB
    ActivityTool --> EventStream
    MemoryTool --> Context
    VectorTool --> VectorDB
```

### AI Agent Capabilities

**Conversational Intelligence**
- Persistent conversation memory across sessions
- Context-aware response generation
- Activity data integration in responses
- Natural language query processing

**Activity Analysis Tools**
```typescript
class ActivityAnalysisTool extends Tool {
  name = 'activity_analysis';
  description = 'Analyze and search through user activity data';
  
  async _call(input: string): Promise {
    const events = await this.vectorStore.searchSimilarActivities(input, 50);
    const analysis = this.analyzeEvents(events);
    return JSON.stringify(analysis);
  }
}
```

**Data Processing Pipeline**
- Event categorization and grouping
- Time-based analysis and patterns
- Application usage statistics
- File modification tracking
- Terminal command analysis

### Prompt Engineering

```mermaid
graph LR
    subgraph "Prompt Components"
        SystemPrompt[System Instructions]
        ActivityData[Activity Data Context]
        ConversationHistory[Conversation History]
        UserQuery[User Query]
    end
    
    subgraph "Processing"
        PromptTemplate[Prompt Template]
        ContextInjection[Context Injection]
        ResponseGeneration[Response Generation]
    end
    
    subgraph "Output"
        StructuredResponse[Structured Response]
        AnalysisData[Analysis Data]
        ConversationUpdate[Memory Update]
    end
    
    SystemPrompt --> PromptTemplate
    ActivityData --> ContextInjection
    ConversationHistory --> ContextInjection
    UserQuery --> PromptTemplate
    
    PromptTemplate --> ResponseGeneration
    ContextInjection --> ResponseGeneration
    
    ResponseGeneration --> StructuredResponse
    ResponseGeneration --> AnalysisData
    ResponseGeneration --> ConversationUpdate
```

---

## Vector Database Integration

### ChromaDB Architecture

```mermaid
graph TB
    subgraph "ChromaDB Service"
        ChromaServer[ChromaDB Server]
        Collections[Collections]
        Embeddings[Embedding Engine]
        QueryEngine[Query Engine]
    end
    
    subgraph "Data Types"
        ActivityEvents[Activity Events]
        ProjectSummaries[Project Summaries]
        ConversationHistory[Chat History]
        FileContents[File Contents]
    end
    
    subgraph "Embedding Models"
        NomicEmbed[Nomic-embed-text]
        OllamaEmbed[Ollama Embeddings]
    end
    
    subgraph "Query Types"
        SemanticSearch[Semantic Search]
        SimilaritySearch[Similarity Search]
        ContextRetrieval[Context Retrieval]
    end
    
    ActivityEvents --> ChromaServer
    ProjectSummaries --> ChromaServer
    ConversationHistory --> ChromaServer
    FileContents --> ChromaServer
    
    ChromaServer --> Collections
    Collections --> Embeddings
    Embeddings --> NomicEmbed
    Embeddings --> OllamaEmbed
    
    Collections --> QueryEngine
    QueryEngine --> SemanticSearch
    QueryEngine --> SimilaritySearch
    QueryEngine --> ContextRetrieval
```

### Vector Storage Implementation

**Event Vectorization**
```typescript
async storeActivityEvent(event: ActivityEvent): Promise {
  const document = new Document({
    pageContent: this.eventToText(event),
    metadata: {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      category: event.category,
      data: JSON.stringify(event.data),
    },
  });
  
  await this.chroma!.addDocuments([document], { ids: [event.id] });
}
```

**Semantic Search Capabilities**
- Natural language activity queries
- Time-based activity retrieval
- Context-aware similarity matching
- Multi-modal data correlation

---

## Desktop Application Architecture

### Electron Frontend Structure

```mermaid
graph TB
    subgraph "Electron App"
        Main[Main Process]
        Renderer[Renderer Process]
        IPC[IPC Communication]
    end
    
    subgraph "React Frontend"
        App[App.tsx]
        Dashboard[Dashboard Component]
        ActivityFeed[Activity Feed]
        ChatPanel[Chat Panel]
        NarrativePanel[Narrative Panel]
        Projects[Projects Component]
        Settings[Settings Panel]
    end
    
    subgraph "Services"
        ApiService[API Service]
        AgentService[Agent API Service]
        ChatService[Chat Service]
        OllamaService[Ollama Service]
        SystemTracker[System Tracker]
    end
    
    subgraph "Backend Communication"
        WebSocket[WebSocket Client]
        RestAPI[REST API Client]
        EventStream[Event Stream]
    end
    
    Main --> Renderer
    Renderer --> IPC
    
    Renderer --> App
    App --> Dashboard
    App --> ActivityFeed
    App --> ChatPanel
    App --> NarrativePanel
    App --> Projects
    App --> Settings
    
    App --> ApiService
    App --> AgentService
    App --> ChatService
    App --> OllamaService
    App --> SystemTracker
    
    ApiService --> WebSocket
    ApiService --> RestAPI
    WebSocket --> EventStream
```

### Component Architecture

**Dashboard Component**
- Real-time activity statistics
- Session tracking and metrics
- Recent activity feed
- Achievement display system

**Chat Panel Integration**
```typescript
const handleSendMessage = async () => {
  const response: ChatResponse = await chatService.sendMessage(inputMessage);
  const assistantMessage: ChatMessage = {
    id: `assistant_${Date.now()}`,
    type: 'assistant',
    content: response.output,
    timestamp: Date.now(),
    analysis: response.analysis
  };
  setMessages(prev => [...prev, assistantMessage]);
};
```

**Narrative Generation System**
- Multiple tone options (casual, professional, gamified, technical)
- Format variations (story, log, achievements, summary)
- Export capabilities (JSON, Markdown, clipboard)
- Achievement system integration

---

## Data Flow Architecture

### Real-time Event Processing

```mermaid
sequenceDiagram
    participant Extensions as Extensions
    participant Backend as Backend Server
    participant Vector as Vector Store
    participant AI as AI Agent
    participant Frontend as Desktop App
    
    Extensions->>Backend: Activity Event
    Backend->>Vector: Store Event Embedding
    Backend->>Frontend: WebSocket Broadcast
    Frontend->>Frontend: Update UI
    
    Frontend->>Backend: User Query
    Backend->>Vector: Semantic Search
    Vector->>Backend: Relevant Events
    Backend->>AI: Generate Response
    AI->>Backend: AI Response
    Backend->>Frontend: Response + Analysis
```

### Project Analysis Workflow

```mermaid
flowchart TD
    A[VS Code Project] --> B[Extension Analysis]
    B --> C[File Summarization]
    C --> D[Folder Analysis]
    D --> E[Project Summary Generation]
    E --> F[Backend API Call]
    F --> G[Vector Storage]
    G --> H[Frontend Display]
    
    I[User Request] --> J[README Generation]
    J --> K[AI Processing]
    K --> L[Structured Output]
    L --> M[Export Options]
```

---

## Installation & Setup

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | ≥18.0.0 | Runtime environment |
| npm | ≥8.0.0 | Package management |
| Python | ≥3.8 | Backend AI services |
| Ollama | Latest | Local AI model serving |
| ChromaDB | ≥0.5.15 | Vector database |

### Step-by-Step Installation

**1. Install Ollama and Models**
```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: Download from https://ollama.ai/download

# Install required models
ollama pull llama3
ollama pull nomic-embed-text
```

**2. Clone and Setup Main Application**
```bash
# Clone the repository
git clone https://github.com/officiallyutso/chronicle.git
cd chronicle

# Install dependencies
npm install

# Build TypeScript for Electron
npm run build:electron
```

**3. Setup Backend Services**
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Start the backend server
npm run dev
```

**4. Setup ChromaDB Vector Database**
```bash
# Install ChromaDB
pip install chromadb

# Start ChromaDB server
chroma run --host 0.0.0.0 --port 8000 --path ../chronicle_data
```

**5. Install VS Code Extension**
```bash
# Navigate to VS Code extension directory
cd vs-code-extension

# Install dependencies
npm install

# Compile the extension
npm run compile

# Install in VS Code
# Method 1: Press F5 to run in development mode
# Method 2: Package and install
vsce package
code --install-extension chronicle-*.vsix
```

**6. Install Browser Extension**

**Chrome/Edge:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chronicle-browser-extension` folder

**Firefox:**
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the extension folder

**7. Start the Complete System**
```bash
# Terminal 1: Start ChromaDB
chroma run --host 0.0.0.0 --port 8000 --path ./chronicle_data

# Terminal 2: Start Backend
cd backend && npm run dev

# Terminal 3: Start Desktop App
npm run dev:all
```

---

## Advanced Configuration

### Environment Variables
```bash
# Backend Configuration (.env)
PORT=3001
OLLAMA_BASE_URL=http://localhost:11434
CHROMA_URL=http://localhost:8000
EMBEDDING_MODEL=nomic-embed-text
CHAT_MODEL=llama3
```

### VS Code Extension Settings
```json
{
  "chronicle.autoSummarize": true,
  "chronicle.trackFileChanges": true,
  "chronicle.backendUrl": "http://localhost:3001",
  "chronicle.maxFileSummaryLines": 80
}
```

### Browser Extension Configuration
```javascript
// Extension settings
const BACKEND_URL = 'http://localhost:3001';
const SEARCH_ENGINES = {
  'google.com': 'Google',
  'bing.com': 'Bing',
  'duckduckgo.com': 'DuckDuckGo'
};
```

---

## API Reference

### Core Backend Endpoints

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/api/events` | GET | Retrieve activity events | Query params: type, limit, startTime, endTime |
| `/api/stats` | GET | Get session statistics | None |
| `/api/ai/chat` | POST | Chat with AI agent | `{ message: string }` |
| `/api/ai/narrative` | POST | Generate activity narrative | `{ style: NarrativeStyle }` |
| `/api/projects` | GET/POST | Project management | Project data object |
| `/api/projects/:id/readme` | POST | Generate README | None |
| `/api/tracking/start` | POST | Start activity tracking | None |
| `/api/tracking/stop` | POST | Stop activity tracking | None |

### WebSocket Events

```typescript
interface WebSocketMessage {
  type: 'INITIAL_EVENTS' | 'NEW_EVENT';
  data: ActivityEvent | ActivityEvent[];
}

interface ActivityEvent {
  id: string;
  timestamp: number;
  type: ActivityType;
  data: any;
  category: string;
}
```

### Extension APIs

**VS Code Extension Commands**
```typescript
// Available commands
'chronicle.activateChronicle'      // Start tracking
'chronicle.deactivateChronicle'    // Stop tracking
'chronicle.summarizeProject'       // Analyze entire project
'chronicle.summarizeCurrentFile'   // Analyze current file
'chronicle.summarizeCurrentFolder' // Analyze current folder
'chronicle.openLog'               // View activity log
```

**Browser Extension Messages**
```javascript
// Message types
chrome.runtime.sendMessage({
  type: 'SEARCH_RESULT_CLICK',
  url: string,
  title: string,
  searchEngine: string,
  searchQuery: string,
  position: number
});
```

---

## Performance Optimization

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended for large projects)
- **Storage**: 2GB free space for models and data
- **CPU**: Modern multi-core processor for AI inference
- **Network**: Local network for service communication

### Optimization Strategies

**Vector Database Optimization**
```typescript
// Batch processing for better performance
const batchSize = 100;
const eventBatches = chunk(events, batchSize);
for (const batch of eventBatches) {
  await vectorStore.addDocuments(batch);
}
```

**Memory Management**
- Conversation history limited to last 6 messages
- Event cleanup after 10 minutes of inactivity
- Automatic garbage collection for old embeddings

**AI Model Optimization**
- Use quantized models for better performance
- Implement response caching for common queries
- Batch similar requests for efficiency

---

## Security & Privacy

### Data Protection
- **100% Local Processing**: All data remains on your machine
- **No Cloud Dependencies**: Complete offline functionality
- **Encrypted Storage**: Vector embeddings provide data abstraction
- **User Control**: Full data export and deletion capabilities

### Security Features
- **Sandboxed Extensions**: Browser and VS Code extensions run in isolated environments
- **API Validation**: Input sanitization and validation
- **Local Inference**: AI processing entirely on local machine
- **No Telemetry**: Zero data transmission to external servers

---

## Troubleshooting

### Common Issues and Solutions

**Ollama Connection Issues**
```bash
# Check Ollama status
ollama list

# Restart Ollama service
ollama serve

# Pull required models
ollama pull llama3
ollama pull nomic-embed-text
```

**ChromaDB Connection Problems**
```bash
# Verify ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# Restart ChromaDB with correct path
chroma run --host 0.0.0.0 --port 8000 --path ./chronicle_data

# Check ChromaDB logs
chroma run --host 0.0.0.0 --port 8000 --path ./chronicle_data --log-level DEBUG
```

**Extension Issues**
1. **VS Code Extension Not Working**
   - Check extension activation in VS Code output panel
   - Verify backend server is running on port 3001
   - Ensure Ollama is accessible at localhost:11434

2. **Browser Extension Not Tracking**
   - Check extension permissions in browser settings
   - Verify background script is active
   - Check browser console for errors

**Backend Service Issues**
```bash
# Check all services status
curl http://localhost:3001/api/health
curl http://localhost:11434/api/tags
curl http://localhost:8000/api/v1/heartbeat

# Restart services in order
# 1. ChromaDB
# 2. Ollama
# 3. Backend server
# 4. Desktop app
```

---

## Development & Contributing

### Development Setup
```bash
# Frontend development
npm run dev

# Backend development
cd backend && npm run dev

# Extension development
cd vs-code-extension && npm run compile

# Full stack development
npm run dev:all
```

### Project Structure
```
chronicle/
├── backend/                    # Express.js backend
│   ├── src/
│   │   ├── services/          # Core services
│   │   │   ├── agentService.ts
│   │   │   ├── systemMonitor.ts
│   │   │   └── vectorStore.ts
│   │   └── server.ts          # Main server file
│   └── package.json
├── src/                       # React frontend
│   ├── components/            # UI components
│   ├── services/             # Frontend services
│   └── App.tsx               # Main application
├── chronicle-browser-extension/
│   ├── background.js         # Service worker
│   ├── content.js            # Content script
│   └── manifest.json         # Extension manifest
├── vs-code-extension/
│   ├── src/
│   │   ├── extension.ts      # Main extension file
│   │   └── summarizer.ts     # AI summarization
│   └── package.json
└── electron/
    └── main.ts               # Electron main process
```

---

## Future Roadmap

### Upcoming Features
- **Mobile Companion App**: iOS/Android activity sync
- **Team Analytics**: Collaborative productivity insights
- **Advanced Visualizations**: Interactive activity charts and graphs
- **Plugin System**: Extensible architecture for custom integrations
- **Cloud Sync Option**: Optional encrypted cloud backup
- **Multi-Language Support**: Support for additional programming languages

### Performance Improvements
- **Streaming Responses**: Real-time AI response streaming
- **Incremental Indexing**: Efficient vector database updates
- **Background Processing**: Non-blocking activity analysis
- **Caching Layer**: Intelligent response caching system

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **LangChain**: For the powerful AI framework and tool ecosystem
- **Ollama**: For enabling local AI model serving and inference
- **ChromaDB**: For providing excellent vector database capabilities
- **React Team**: For the excellent frontend framework and ecosystem
- **Electron**: For enabling cross-platform desktop development
- **VS Code Team**: For the comprehensive extension API
- **Chrome Extensions**: For the robust browser extension platform

**Chronicle** - Transform your digital activities into intelligent insights, completely locally and securely. Experience the future of productivity tracking with AI-powered analysis and narrative generation.








