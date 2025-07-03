## **Chronicle Agentic AI Setup Guide**

### **Prerequisites**
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- Git

### **Step 1: Install Ollama**

**Windows:**
```bash
# Download and install from: https://ollama.ai/download
# Or use winget
winget install Ollama.Ollama
```

**macOS:**
```bash
# Download from: https://ollama.ai/download
# Or use Homebrew
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Pull required models:**
```bash
ollama pull llama3
ollama pull nomic-embed-text
```

### **Step 2: Install ChromaDB**

```bash
pip install chromadb
```

### **Step 3: Clone and Setup Project**

```bash
# Clone your Chronicle project
git clone 
cd chronicle

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### **Step 4: Install Additional Dependencies (if error in previous steps)**

**Frontend packages:**
```bash
npm install @langchain/ollama @langchain/community chromadb uuid
npm install --save-dev @types/uuid
```

**Backend packages:**
```bash
cd backend
npm install @langchain/ollama @langchain/community chromadb uuid
npm install --save-dev @types/uuid
cd ..
```

### **Step 5: Create Configuration Files(pushed it on repo because its all local)**

**Create `backend/.env`:**
```env
OLLAMA_BASE_URL=http://localhost:11434
CHROMA_URL=http://localhost:8000
OLLAMA_MODEL=llama3
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### **Step 6: Create ChromaDB Data Directory**

```bash
# Create data directory outside project to avoid file watching issues
mkdir -p ../chronicle_data
```

### **Step 7: Start Services (In Order)**

**Terminal 1 - Start ChromaDB:**
```bash
chroma run --host localhost --port 8000 --path ../chronicle_data
```

**Terminal 2 - Start Ollama:**
```bash
ollama serve
```

**Terminal 3 - Start Backend:**
```bash
cd backend
npm run dev
```

**Terminal 4 - Start Frontend:**
```bash
npm run dev:all
```

### **Step 8: Verify Setup**

1. **Check ChromaDB:** Visit `http://localhost:8000/api/v1/heartbeat`
2. **Check Ollama:** Run `curl http://localhost:11434/api/tags`
3. **Check Backend:** Visit `http://localhost:3001/api/health`
4. **Check Frontend:** Visit `http://localhost:3000`

### **Step 9: Test Agentic AI Features**

1. **Start tracking** in the Dashboard
2. **Perform some activities** (open apps, edit files, run commands)
3. **Ask the AI** questions like:
   - "What applications do I use most?"
   - "Show me my productivity patterns"
   - "Analyze my recent coding session"

### **Project Structure**
```
chronicle/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   └── services/
│   │       ├── systemMonitor.ts
│   │       ├── vectorStore.ts
│   │       ├── agentService.ts
│   │       └── activityFilter.ts
│   ├── package.json
│   └── .env
├── src/
│   ├── services/
│   │   ├── agentApiService.ts
│   │   ├── apiService.ts
│   │   ├── ollamaService.ts
│   │   └── types.ts
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── NarrativePanel.tsx
│   │   └── SettingsPanel.tsx
│   └── App.tsx
├── vite.config.js
└── package.json
```

### **Key Features**

**Agentic AI Capabilities:**
- **Autonomous decision-making** - Agent decides when to query ChromaDB vs direct response
- **Pattern analysis** - Analyzes stored activity data for insights
- **Contextual responses** - Answers based on real user data, not generic prompts
- **Tool usage** - Uses PatternAnalysisTool to retrieve and analyze data

**Activity Tracking:**
- **Application monitoring** - Tracks app opens/closes
- **File system monitoring** - Monitors file changes in development directories
- **Terminal command tracking** - Captures relevant terminal commands
- **System metrics** - Monitors system performance and usage

**Data Storage:**
- **ChromaDB vector storage** - Stores activity embeddings for semantic search
- **Real-time processing** - Events stored immediately with vector embeddings
- **Filtering system** - Filters out system processes and unwanted activities

### **Troubleshooting**

**If ChromaDB fails:**
- Ensure port 8000 is free
- Check data directory permissions
- Restart ChromaDB service

**If Ollama fails:**
- Verify models are downloaded: `ollama list`
- Check if service is running: `ollama serve`
- Ensure port 11434 is free

**If Backend fails:**
- Check all dependencies installed
- Verify .env file exists
- Ensure ChromaDB and Ollama are running first

**If Frontend reloads continuously:**
- Check vite.config.js excludes ChromaDB files
- Ensure ChromaDB data is outside project directory

### **Usage Examples**

**Ask the AI:**
- "What have I been working on today?"
- "When am I most productive?"
- "What applications do I use most frequently?"
- "Give me recommendations to improve my workflow"
- "Analyze my coding patterns"

The system will provide **data-driven responses** based on your actual tracked activities, not generic answers.

### **Data Export**

Use the included Python script to export and analyze your data:
```bash
python check_chroma_data.py
```