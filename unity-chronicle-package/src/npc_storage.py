import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import os

from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document

from models.npc_model import NPCCharacter, WorldSettings, DialogueContext, NPCBehavior
from models.dialogue_model import DialogueEntry, ConversationHistory

class NPCStorage:
    def __init__(self, chroma_host: str = "http://localhost:8000"):
        # Disable ChromaDB telemetry
        os.environ["ANONYMIZED_TELEMETRY"] = "False"
        
        self.embeddings = OllamaEmbeddings(
            model="nomic-embed-text",
            base_url="http://localhost:11434"
        )

        # Separate collections for NPCs and dialogues
        self.npc_store = Chroma(
            embedding_function=self.embeddings,
            collection_name="npc_characters",
            persist_directory="./npc_data/npcs"
        )

        self.dialogue_store = Chroma(
            embedding_function=self.embeddings,
            collection_name="npc_dialogues",
            persist_directory="./npc_data/dialogues"
        )

        print("NPC Storage initialized with ChromaDB")
    

    
    def store_npc(self, npc: NPCCharacter, world: WorldSettings, behavior: NPCBehavior) -> str:
        """Store an NPC with all its context"""
        if not npc.npc_id:
            npc.npc_id = f"npc_{uuid.uuid4().hex[:8]}"
        
        # Create searchable text for the NPC
        npc_text = self._npc_to_searchable_text(npc, world, behavior)
        
        # Store in vector database
        document = Document(
            page_content=npc_text,
            metadata={
                "npc_id": npc.npc_id,
                "name": npc.name,
                "type": "npc_character",
                "faction": npc.faction,
                "profession": npc.profession_role,
                "location": world.location,
                "world_theme": world.world_theme,
                "npc_data": json.dumps(npc.to_dict()),
                "world_data": json.dumps(world.__dict__),
                "behavior_data": json.dumps(behavior.__dict__),
                "created_at": datetime.now().isoformat()
            }
        )
        
        self.npc_store.add_documents([document], ids=[npc.npc_id])
        print(f"✅ NPC '{npc.name}' stored with ID: {npc.npc_id}")
        return npc.npc_id
    
    def get_npc(self, npc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve an NPC by ID"""
        try:
            results = self.npc_store.get(ids=[npc_id])
            if results['metadatas'] and len(results['metadatas']) > 0:
                metadata = results['metadatas'][0]
                return {
                    'npc': json.loads(metadata['npc_data']),
                    'world': json.loads(metadata['world_data']),
                    'behavior': json.loads(metadata['behavior_data'])
                }
        except Exception as e:
            print(f"Error retrieving NPC {npc_id}: {e}")
        return None
    
    def search_npcs(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for NPCs based on description"""
        results = self.npc_store.similarity_search(query, k=limit)
        npcs = []
        
        for doc in results:
            metadata = doc.metadata
            npcs.append({
                'npc_id': metadata['npc_id'],
                'name': metadata['name'],
                'profession': metadata['profession'],
                'faction': metadata['faction'],
                'location': metadata['location'],
                'npc_data': json.loads(metadata['npc_data']),
                'world_data': json.loads(metadata['world_data']),
                'behavior_data': json.loads(metadata['behavior_data'])
            })
        
        return npcs
    
    def store_dialogue(self, dialogue: DialogueEntry):
        """Store a dialogue entry"""
        dialogue_text = f"Player: {dialogue.player_input}\nNPC: {dialogue.npc_response}"
        
        document = Document(
            page_content=dialogue_text,
            metadata={
                "npc_id": dialogue.npc_id,
                "type": "dialogue",
                "dialogue_type": dialogue.dialogue_type,
                "mood": dialogue.mood,
                "timestamp": dialogue.timestamp.isoformat(),
                "dialogue_data": json.dumps(dialogue.to_dict())
            }
        )
        
        dialogue_id = f"dialogue_{uuid.uuid4().hex[:8]}"
        self.dialogue_store.add_documents([document], ids=[dialogue_id])
    
    def get_npc_dialogue_history(self, npc_id: str, limit: int = 10) -> List[DialogueEntry]:
        """Get recent dialogue history for an NPC"""
        try:
            # Search for dialogues with this NPC
            results = self.dialogue_store.similarity_search(
                f"npc_id:{npc_id}",
                k=limit,
                filter={"npc_id": npc_id}
            )
            
            dialogues = []
            for doc in results:
                dialogue_data = json.loads(doc.metadata['dialogue_data'])
                dialogue = DialogueEntry(
                    npc_id=dialogue_data['npc_id'],
                    player_input=dialogue_data['player_input'],
                    npc_response=dialogue_data['npc_response'],
                    context=dialogue_data['context'],
                    timestamp=datetime.fromisoformat(dialogue_data['timestamp']),
                    dialogue_type=dialogue_data['dialogue_type'],
                    mood=dialogue_data['mood']
                )
                dialogues.append(dialogue)
            
            # Sort by timestamp (most recent first)
            dialogues.sort(key=lambda x: x.timestamp, reverse=True)
            return dialogues[:limit]
            
        except Exception as e:
            print(f"Error retrieving dialogue history: {e}")
            return []
    
    def _npc_to_searchable_text(self, npc: NPCCharacter, world: WorldSettings, behavior: NPCBehavior) -> str:
        """Convert NPC data to searchable text"""
        text_parts = [
            f"Name: {npc.name}",
            f"Race: {npc.race_species}",
            f"Profession: {npc.profession_role}",
            f"Personality: {', '.join(npc.personality)}",
            f"Alignment: {npc.alignment}",
            f"Faction: {npc.faction}",
            f"Skills: {', '.join(npc.skills)}",
            f"Backstory: {npc.backstory}",
            f"Traits: {', '.join(npc.traits_flaws)}",
            f"World: {world.world_theme} in {world.location}",
            f"Environment: {world.environment}",
            f"Tech Level: {world.tech_level}",
            f"Combat Role: {behavior.combat_role}",
            f"Services: {', '.join(behavior.available_services)}"
        ]
        
        if behavior.gives_quest:
            text_parts.append(f"Quest Giver: {behavior.quest_id}")
        
        if behavior.trade_items:
            text_parts.append(f"Trades: {', '.join(behavior.trade_items)}")
        
        return "\n".join(text_parts)
