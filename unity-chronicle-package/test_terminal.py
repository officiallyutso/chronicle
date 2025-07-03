import os
import sys

# Disable ChromaDB telemetry FIRST
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from typing import Dict, Any

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.npc_generator import NPCGenerator
from src.dialogue_engine import DialogueEngine
from models.npc_model import DialogueContext


class NPCTestInterface:
    def __init__(self):
        self.npc_generator = NPCGenerator()
        self.dialogue_engine = DialogueEngine()
        self.current_npc_id = None
        
    def run(self):
        """Main test interface loop"""
        print("NPC System Test Interface")
        print("=" * 50)
        
        while True:
            print("\nMAIN MENU:")
            print("1. Create New NPC")
            print("2. Load Existing NPC")
            print("3. Search NPCs")
            print("4. Talk to Current NPC")
            print("5. View NPC Summary")
            print("6. View Conversation History")
            print("7. Exit")
            
            choice = input("\nSelect option (1-7): ").strip()
            
            if choice == "1":
                self.create_npc_wizard()
            elif choice == "2":
                self.load_npc()
            elif choice == "3":
                self.search_npcs()
            elif choice == "4":
                self.talk_to_npc()
            elif choice == "5":
                self.view_npc_summary()
            elif choice == "6":
                self.view_conversation_history()
            elif choice == "7":
                print("👋 Goodbye!")
                break
            else:
                print("❌ Invalid option. Please try again.")
    
    def create_npc_wizard(self):
        """Wizard for creating a new NPC"""
        print("\n🧙 NPC Creation Wizard")
        print("-" * 30)
        
        # Character Parameters
        print("\n📝 CHARACTER DETAILS:")
        character_params = {
            "name": input("Name: ").strip() or "Unnamed NPC",
            "gender": input("Gender (Male/Female/Non-binary/None): ").strip() or "Male",
            "age": input("Age (Young/Adult/Middle-aged/Old): ").strip() or "Adult",
            "race_species": input("Race/Species: ").strip() or "Human",
            "profession_role": input("Profession/Role: ").strip() or "Citizen",
            "alignment": input("Alignment (Good/Neutral/Evil): ").strip() or "Neutral",
            "faction": input("Faction: ").strip() or "None"
        }
        
        # Personality traits
        personality_input = input("Personality traits (comma-separated): ").strip()
        character_params["personality"] = [p.strip() for p in personality_input.split(",")] if personality_input else ["Friendly"]
        
        # Skills
        skills_input = input("Skills (comma-separated): ").strip()
        character_params["skills"] = [s.strip() for s in skills_input.split(",")] if skills_input else []
        
        # Backstory
        character_params["backstory"] = input("Brief backstory (optional): ").strip()
        
        # Traits/Flaws
        traits_input = input("Traits/Flaws (comma-separated): ").strip()
        character_params["traits_flaws"] = [t.strip() for t in traits_input.split(",")] if traits_input else []
        
        # World Settings
        print("\n🌍 WORLD SETTINGS:")
        world_settings = {
            "world_theme": input("World Theme (Medieval Fantasy/Sci-Fi/Modern/etc.): ").strip() or "Medieval Fantasy",
            "location": input("Location: ").strip() or "Village",
            "time_period": input("Time Period: ").strip() or "Medieval",
            "environment": input("Environment: ").strip() or "Temperate",
            "tech_level": input("Tech Level (Low/Medium/High): ").strip() or "Low",
            "faction_tensions": input("Faction Tensions (Low/Medium/High): ").strip() or "Medium"
        }
        
        # Behavior Parameters
        print("\n⚔️ BEHAVIOR SETTINGS:")
        behavior_params = {
            "gives_quest": input("Can give quests? (y/n): ").strip().lower() == 'y',
            "combat_role": input("Combat Role (Passive/Guard/Aggressive): ").strip() or "Passive"
        }
        
        if behavior_params["gives_quest"]:
            behavior_params["quest_id"] = input("Quest ID (optional): ").strip()
        
        # Services
        services_input = input("Available Services (comma-separated): ").strip()
        behavior_params["available_services"] = [s.strip() for s in services_input.split(",")] if services_input else []
        
        # Trade items
        trade_input = input("Trade Items (comma-separated): ").strip()
        behavior_params["trade_items"] = [t.strip() for t in trade_input.split(",")] if trade_input else []
        
        # Custom prompt
        custom_prompt = input("\n✨ Custom requirements/prompt (optional): ").strip()
        
        print("\n🔄 Generating NPC...")
        try:
            npc_id = self.npc_generator.generate_npc(
                character_params, world_settings, behavior_params, custom_prompt
            )
            self.current_npc_id = npc_id
            print(f"✅ NPC created successfully! ID: {npc_id}")
            
            # Show summary
            summary = self.npc_generator.get_npc_summary(npc_id)
            if summary:
                print("\n" + summary)
                
        except Exception as e:
            print(f"❌ Error creating NPC: {e}")
    
    def load_npc(self):
        """Load an existing NPC by ID"""
        npc_id = input("\nEnter NPC ID: ").strip()
        if not npc_id:
            return
        
        summary = self.npc_generator.get_npc_summary(npc_id)
        if summary:
            self.current_npc_id = npc_id
            print(f"✅ Loaded NPC: {npc_id}")
            print(summary)
        else:
            print("❌ NPC not found")
    
    def search_npcs(self):
        """Search for NPCs"""
        query = input("\nSearch query (describe what you're looking for): ").strip()
        if not query:
            return
        
        npcs = self.npc_generator.storage.search_npcs(query, limit=5)
        
        if not npcs:
            print("❌ No NPCs found matching your search")
            return
        
        print(f"\n🔍 Found {len(npcs)} NPCs:")
        for i, npc in enumerate(npcs, 1):
            print(f"{i}. {npc['name']} ({npc['profession']}) - {npc['faction']} - {npc['location']}")
        
        try:
            choice = int(input("\nSelect NPC (number): ")) - 1
            if 0 <= choice < len(npcs):
                selected_npc = npcs[choice]
                self.current_npc_id = selected_npc['npc_id']
                print(f"✅ Selected: {selected_npc['name']}")
                
                summary = self.npc_generator.get_npc_summary(self.current_npc_id)
                if summary:
                    print(summary)
            else:
                print("❌ Invalid selection")
        except ValueError:
            print("❌ Invalid input")
    
    def talk_to_npc(self):
        """Start conversation with current NPC"""
        if not self.current_npc_id:
            print("❌ No NPC selected. Please create or load an NPC first.")
            return
        
        npc_data = self.npc_generator.storage.get_npc(self.current_npc_id)
        if not npc_data:
            print("❌ Current NPC not found")
            return
        
        npc_name = npc_data['npc']['name']
        print(f"\n💬 Starting conversation with {npc_name}")
        print("Type 'quit' to end conversation")
        print("-" * 40)
        
        # Set up dialogue context
        dialogue_context = DialogueContext(
            dialogue_type=input("Dialogue type (GREETING/QUEST/TRADE/FLAVOR): ").strip() or "GREETING",
            dialogue_stage=input("Dialogue stage (FIRST_MEET/REPEAT/ONGOING): ").strip() or "FIRST_MEET",
            mood=input("NPC mood (Neutral/Happy/Angry/Suspicious): ").strip() or "Neutral",
            player_reputation=input("Your reputation (Unknown/Trusted/Feared): ").strip() or "Unknown",
            quest_state=input("Quest state (Not Given/In Progress/Completed): ").strip() or "Not Given"
        )
        
        print(f"\n🎭 {npc_name} is ready to talk...")
        
        while True:
            player_input = input(f"\nYou: ").strip()
            
            if player_input.lower() in ['quit', 'exit', 'bye']:
                print(f"{npc_name}: Farewell!")
                break
            
            if not player_input:
                continue
            
            print("🤔 Thinking...")
            response = self.dialogue_engine.generate_dialogue(
                self.current_npc_id, player_input, dialogue_context
            )
            
            print(f"{npc_name}: {response}")
    
    def view_npc_summary(self):
        """View summary of current NPC"""
        if not self.current_npc_id:
            print("❌ No NPC selected")
            return
        
        summary = self.npc_generator.get_npc_summary(self.current_npc_id)
        if summary:
            print(summary)
        else:
            print("❌ NPC not found")
    
    def view_conversation_history(self):
        """View conversation history with current NPC"""
        if not self.current_npc_id:
            print("❌ No NPC selected")
            return
        
        history = self.dialogue_engine.get_conversation_summary(self.current_npc_id)
        print(history)

if __name__ == "__main__":
    # Check if Ollama is running
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags")
        if response.status_code != 200:
            print("❌ Ollama is not running. Please start Ollama first.")
            sys.exit(1)
    except:
        print("❌ Cannot connect to Ollama. Please ensure it's running on localhost:11434")
        sys.exit(1)
    
    # Check if ChromaDB is running on port 8000 (same as Chronicle)
    try:
        # Try multiple endpoints that ChromaDB supports
        endpoints_to_try = [
            "http://localhost:8000/api/v2/heartbeat",
            "http://localhost:8000/api/v2",
            "http://localhost:8000/heartbeat"
        ]
        
        connected = False
        for endpoint in endpoints_to_try:
            try:
                response = requests.get(endpoint, timeout=5)
                if response.status_code == 200:
                    connected = True
                    print(f"✅ Connected to ChromaDB via {endpoint}")
                    break
            except:
                continue
        
        if not connected:
            print("❌ Cannot connect to ChromaDB on port 8000.")
            print("Please ensure ChromaDB is running with: chroma run --host 0.0.0.0 --port 8000 --path ../chronicle_data")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Cannot connect to ChromaDB on port 8000. Error: {e}")
        print("Please ensure ChromaDB is running with: chroma run --host 0.0.0.0 --port 8000 --path ../chronicle_data")
        sys.exit(1)
    
    print("✅ All services are running!")
    print("✅ Using Chronicle's ChromaDB instance with separate collections")
    
    # Start the test interface
    interface = NPCTestInterface()
    interface.run()

