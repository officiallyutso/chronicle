import json
import chromadb
from datetime import datetime
import requests

# Connect to ChromaDB server
client = chromadb.HttpClient(host="localhost", port=8000)

# Backend API base URL
BACKEND_URL = "http://localhost:3001"

def check_services_status():
    """Check if all services are running"""
    print("🔍 Checking Services Status")
    print("-" * 40)
    
    # Check ChromaDB
    try:
        heartbeat = client.heartbeat()
        print("ChromaDB is running")
        print(f"   Heartbeat: {heartbeat}")
        chroma_ok = True
    except Exception as e:
        print(f"ChromaDB connection failed: {e}")
        chroma_ok = False
    
    # Check Backend
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=5)
        if response.ok:
            health_data = response.json()
            print("Backend is running")
            print(f"   Events count: {health_data.get('eventsCount', 0)}")
            print(f"   Tracking: {health_data.get('isTracking', False)}")
            backend_ok = True
        else:
            print("Backend is not responding properly")
            backend_ok = False
    except Exception as e:
        print(f"Backend connection failed: {e}")
        backend_ok = False
    
    # Check Ollama
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.ok:
            models = response.json()
            model_names = [model.get('name', '') for model in models.get('models', [])]
            llama_available = any('llama2' in name for name in model_names)
            print("Ollama is running")
            print(f"   Models: {len(model_names)}")
            print(f"   Llama2 available: {llama_available}")
            ollama_ok = True
        else:
            print("Ollama is not responding")
            ollama_ok = False
    except Exception as e:
        print(f"Ollama connection failed: {e}")
        ollama_ok = False
    
    return chroma_ok, backend_ok, ollama_ok

def list_collections():
    """List all collections in ChromaDB"""
    try:
        collections = client.list_collections()
        print(f"\n📚 Collections found: {len(collections)}")
        for collection in collections:
            print(f"  - {collection.name}")
        return collections
    except Exception as e:
        print(f"Error listing collections: {e}")
        return []

def analyze_collection(collection_name="chronicle_activities"):
    """Analyze the Chronicle activities collection"""
    try:
        collection = client.get_collection(collection_name)
        count = collection.count()
        print(f"\nCollection '{collection_name}' Analysis:")
        print(f"  Total documents: {count}")
        
        if count > 0:
            # Get a sample of documents
            sample_size = min(10, count)
            results = collection.get(limit=sample_size)
            
            print(f"\nSample Documents (showing {sample_size} of {count}):")
            for i, (doc_id, document, metadata) in enumerate(zip(results['ids'], results['documents'], results['metadatas'])):
                timestamp = datetime.fromtimestamp(metadata.get('timestamp', 0)/1000)
                print(f"\n--- Document {i+1} ---")
                print(f"ID: {doc_id}")
                print(f"Type: {metadata.get('type', 'unknown')}")
                print(f"Time: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"Content: {document[:150]}...")
                
                # Show parsed data for better understanding
                try:
                    data = json.loads(metadata.get('data', '{}'))
                    if metadata.get('type') == 'app_opened':
                        print(f"App: {data.get('appName', 'unknown')}")
                    elif metadata.get('type') == 'file_changed':
                        print(f"File: {data.get('fileName', 'unknown')} ({data.get('action', 'unknown')})")
                    elif metadata.get('type') == 'terminal_command':
                        print(f"Command: {data.get('command', 'unknown')}")
                except:
                    pass
                
            # Analyze activity types with time distribution
            all_results = collection.get(limit=count)
            activity_types = {}
            hourly_distribution = {}
            
            for metadata in all_results['metadatas']:
                # Activity type distribution
                activity_type = metadata.get('type', 'unknown')
                activity_types[activity_type] = activity_types.get(activity_type, 0) + 1
                
                # Hourly distribution
                timestamp = metadata.get('timestamp', 0)
                if timestamp:
                    hour = datetime.fromtimestamp(timestamp/1000).hour
                    hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1
            
            print(f"\nActivity Types Distribution:")
            for activity_type, count in sorted(activity_types.items(), key=lambda x: x[1], reverse=True):
                percentage = (count / len(all_results['metadatas'])) * 100
                print(f"  {activity_type}: {count} ({percentage:.1f}%)")
            
            print(f"\nMost Active Hours:")
            sorted_hours = sorted(hourly_distribution.items(), key=lambda x: x[1], reverse=True)[:5]
            for hour, count in sorted_hours:
                print(f"  {hour:02d}:00 - {count} activities")
                
        return collection
    except Exception as e:
        print(f"Error analyzing collection: {e}")
        return None

def query_agent(query):
    """Query the Chronicle AI agent"""
    try:
        response = requests.post(f"{BACKEND_URL}/api/ai/query", 
                               json={"query": query}, 
                               timeout=30)
        if response.ok:
            result = response.json()
            return result.get('output', 'No response')
        else:
            return f"Error: HTTP {response.status_code}"
    except Exception as e:
        return f"Error querying agent: {e}"

def get_filter_rules():
    """Get current filter rules from backend"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/filters", timeout=5)
        if response.ok:
            return response.json()
        else:
            return []
    except Exception as e:
        print(f"Error getting filter rules: {e}")
        return []

def show_filter_status():
    """Show current filtering status"""
    rules = get_filter_rules()
    if rules:
        print(f"\n🔍 Active Filter Rules:")
        for rule in rules:
            status = "✅" if rule.get('enabled') else "❌"
            print(f"  {status} {rule.get('name', 'Unknown')}: {rule.get('pattern', '')}")
    else:
        print("\n🔍 No filter rules found")

def export_to_json(collection_name="chronicle_activities", filename=None):
    """Export all ChromaDB data to JSON file"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chronicle_data_{timestamp}.json"
    
    try:
        collection = client.get_collection(collection_name)
        count = collection.count()
        
        if count == 0:
            print("No data to export")
            return
        
        print(f"\nExporting {count} documents to {filename}...")
        
        # Fetch all documents
        results = collection.get(limit=count)
        
        # Get backend stats for additional context
        backend_stats = {}
        try:
            response = requests.get(f"{BACKEND_URL}/api/stats", timeout=5)
            if response.ok:
                backend_stats = response.json()
        except:
            pass
        
        data = {
            "export_info": {
                "collection_name": collection_name,
                "export_timestamp": datetime.now().isoformat(),
                "total_documents": count,
                "backend_stats": backend_stats,
                "data_location": "../chronicle_data"  # Updated path
            },
            "documents": []
        }
        
        for doc_id, document, metadata in zip(results['ids'], results['documents'], results['metadatas']):
            # Convert timestamp to readable format
            readable_timestamp = datetime.fromtimestamp(metadata.get('timestamp', 0)/1000).isoformat()
            
            # Parse the data for better export
            parsed_data = {}
            try:
                parsed_data = json.loads(metadata.get('data', '{}'))
            except:
                parsed_data = metadata.get('data', {})
            
            data["documents"].append({
                'id': doc_id,
                'content': document,
                'metadata': metadata,
                'parsed_data': parsed_data,
                'readable_timestamp': readable_timestamp,
                'activity_type': metadata.get('type', 'unknown')
            })
        
        # Save to JSON file
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Data exported successfully to {filename}")
        print(f"File size: {round(len(json.dumps(data))/1024, 2)} KB")
        
        # Show export summary
        activity_summary = {}
        for doc in data["documents"]:
            activity_type = doc.get('activity_type', 'unknown')
            activity_summary[activity_type] = activity_summary.get(activity_type, 0) + 1
        
        print(f"\nExport Summary:")
        for activity_type, count in sorted(activity_summary.items()):
            print(f"  {activity_type}: {count}")
        
    except Exception as e:
        print(f"Export failed: {e}")

def search_activities(query="", limit=10):
    """Search for specific activities"""
    try:
        collection = client.get_collection("chronicle_activities")
        
        if query:
            print(f"\n🔍 Searching for: '{query}'")
            # Get all and filter manually for demo
            all_results = collection.get()
            matching_docs = []
            
            for doc_id, document, metadata in zip(all_results['ids'], all_results['documents'], all_results['metadatas']):
                if query.lower() in document.lower():
                    matching_docs.append((doc_id, document, metadata))
                    if len(matching_docs) >= limit:
                        break
            
            print(f"Found {len(matching_docs)} matching documents:")
            for i, (doc_id, document, metadata) in enumerate(matching_docs):
                timestamp = datetime.fromtimestamp(metadata.get('timestamp', 0)/1000)
                print(f"\n{i+1}. {metadata.get('type', 'unknown')} - {timestamp.strftime('%H:%M:%S')}")
                print(f"   {document[:100]}...")
        else:
            # Get recent documents
            results = collection.get(limit=limit)
            print(f"\n📋 Recent {len(results['ids'])} activities:")
            for i, (doc_id, document, metadata) in enumerate(zip(results['ids'], results['documents'], results['metadatas'])):
                timestamp = datetime.fromtimestamp(metadata.get('timestamp', 0)/1000)
                print(f"\n{i+1}. {metadata.get('type', 'unknown')} - {timestamp.strftime('%H:%M:%S')}")
                print(f"   {document[:100]}...")
                
    except Exception as e:
        print(f"Search failed: {e}")

def interactive_ai_chat():
    """Interactive chat with Chronicle AI"""
    print(f"\nChronicle AI Chat Session")
    print("Type 'quit' to exit, 'help' for suggestions")
    print("-" * 40)
    
    suggestions = [
        "What applications do I use most?",
        "Show me my productivity patterns",
        "When am I most active?",
        "Analyze my recent coding session",
        "What files have I been working on?",
        "Give me productivity recommendations"
    ]
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            elif user_input.lower() == 'help':
                print("\nTry asking:")
                for i, suggestion in enumerate(suggestions, 1):
                    print(f"  {i}. {suggestion}")
                continue
            elif not user_input:
                continue
            
            print("\nChronicle AI: Thinking...")
            response = query_agent(user_input)
            print(f"\nChronicle AI: {response}")
            
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break

def main():
    """Main function to run all checks"""
    print("Chronicle ChromaDB Data Inspector & AI Chat")
    print("=" * 60)
    
    # Check all services
    chroma_ok, backend_ok, ollama_ok = check_services_status()
    
    if not chroma_ok:
        print("\nChromaDB is not available. Please start it with:")
        print("chroma run --host localhost --port 8000 --path ../chronicle_data")
        return
    
    # List collections
    collections = list_collections()
    
    # Show filter status
    if backend_ok:
        show_filter_status()
    
    # Analyze Chronicle collection
    if any(c.name == "chronicle_activities" for c in collections):
        collection = analyze_collection()
        
        if collection and collection.count() > 0:
            # Enhanced menu
            print("\nWhat would you like to do?")
            print("1. Export all data to JSON")
            print("2. Search for specific activities")
            print("3. Chat with Chronicle AI")
            print("4. Show analysis only")
            print("5. Interactive AI session")
            
            try:
                choice = input("\nEnter your choice (1-5): ").strip()
                
                if choice == "1":
                    export_to_json()
                elif choice == "2":
                    query = input("Enter search term (or press Enter for recent activities): ").strip()
                    search_activities(query)
                elif choice == "3":
                    if backend_ok and ollama_ok:
                        query = input("Ask Chronicle AI: ").strip()
                        if query:
                            print("\nChronicle AI Response:")
                            response = query_agent(query)
                            print(response)
                    else:
                        print("Backend or Ollama not available for AI queries")
                elif choice == "4":
                    print("Analysis complete!")
                elif choice == "5":
                    if backend_ok and ollama_ok:
                        interactive_ai_chat()
                    else:
                        print("Backend or Ollama not available for AI chat")
                else:
                    print("Analysis complete!")
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
    else:
        print("Chronicle activities collection not found.")
        print("Make sure your backend is running and tracking activities.")
        if backend_ok:
            print("Backend is running but no data collected yet.")

if __name__ == "__main__":
    main()
