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

# **1. Install Ollama and Models**
```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: Download from https://ollama.ai/download

# Install required models
ollama pull llama3
ollama pull nomic-embed-text
```

# **2. Clone and Setup Main Application**
```bash
# Clone the repository
git clone https://github.com/officiallyutso/chronicle.git
cd chronicle

# Install dependencies
npm install

# Run TypeScript for Electron
npm run dev:all
```

# **3. Setup Backend MicroServices**
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Start the backend server
npm run dev
```

# **4. Setup ChromaDB Vector Database**
```bash
# Install ChromaDB (in root dir)
pip install chromadb

# Start ChromaDB server
chroma run --host 0.0.0.0 --port 8000 --path ../chronicle_data
```
# 
# **5. Install VS Code Extension**
```bash
# Navigate to VS Code extension directory
cd vs-code-extension

# Install dependencies
npm install

# Compile the extension
npm run compile

# Install in VS Code
# Method 1: Press F5 to run in development mode (preferred)
# Method 2: Package and install
vsce package
code --install-extension chronicle-*.vsix
```

# **6. Install Browser Extension**

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

# **7. Start the Complete System**
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