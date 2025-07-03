import os

# Disable ChromaDB telemetry to prevent capture() argument errors - nawab ye change mat karna nhito model load nhi hoh rhe
os.environ["ANONYMIZED_TELEMETRY"] = "False"

# Ollama Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")

# ChromaDB Configuration - SAME as Chronicle project
CHROMA_HOST = os.getenv("CHROMA_HOST", "http://localhost:8000")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "../chronicle_data")

# NPC System Configuration
DEFAULT_WORLD_THEME = "Medieval Fantasy"
DEFAULT_LOCATION = "Village"
MAX_DIALOGUE_HISTORY = 10
MAX_SEARCH_RESULTS = 5

# Dialogue Generation Settings
DIALOGUE_TEMPERATURE = 0.7
NPC_ENHANCEMENT_TEMPERATURE = 0.8
