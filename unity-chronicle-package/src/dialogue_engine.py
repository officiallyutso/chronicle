from typing import Dict, Any, List, Optional
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from datetime import datetime
import json

from models.dialogue_model import DialogueEntry, ConversationHistory
from models.npc_model import DialogueContext
from src.npc_storage import NPCStorage

class DialogueEngine:
    def __init__(self, model_name: str = "llama3"):
        self.llm = ChatOllama(
            model=model_name,
            base_url="http://localhost:11434",
            temperature=0.7
        )
        
        self.storage = NPCStorage()
        print(f"Dialogue Engine initialized with {model_name}")
    
    
    def generate_dialogue(self, 
                         npc_id: str,
                         player_input: str,
                         dialogue_context: DialogueContext,
                         additional_context: Dict[str, Any] = None) -> str:
        """Generate NPC response to player input"""
        
        # Get NPC data
        npc_data = self.storage.get_npc(npc_id)
        if not npc_data:
            return "ERROR: NPC not found"
        
        # Get conversation history
        dialogue_history = self.storage.get_npc_dialogue_history(npc_id, limit=5)
        
        # Generate response
        npc_response = self._generate_contextual_response(
            npc_data, player_input, dialogue_context, dialogue_history, additional_context
        )
        
        # Store the dialogue
        dialogue_entry = DialogueEntry(
            npc_id=npc_id,
            player_input=player_input,
            npc_response=npc_response,
            context={
                'dialogue_type': dialogue_context.dialogue_type,
                'dialogue_stage': dialogue_context.dialogue_stage,
                'mood': dialogue_context.mood,
                'player_reputation': dialogue_context.player_reputation,
                'quest_state': dialogue_context.quest_state,
                'additional_context': additional_context or {}
            },
            dialogue_type=dialogue_context.dialogue_type,
            mood=dialogue_context.mood
        )
        
        self.storage.store_dialogue(dialogue_entry)
        
        # Update NPC interaction count
        self._update_npc_interaction(npc_id)
        
        return npc_response
    
    def _generate_contextual_response(self, 
                                    npc_data: Dict[str, Any],
                                    player_input: str,
                                    context: DialogueContext,
                                    history: List[DialogueEntry],
                                    additional_context: Dict[str, Any] = None) -> str:
        """Generate contextually appropriate response"""
        
        npc = npc_data['npc']
        world = npc_data['world']
        behavior = npc_data['behavior']
        
        # Build conversation history text
        history_text = ""
        if history:
            history_text = "\n".join([
                f"Player: {entry.player_input}\n{npc['name']}: {entry.npc_response}"
                for entry in reversed(history[-3:])  # Last 3 exchanges
            ])
        
        dialogue_prompt = ChatPromptTemplate.from_template("""
You are {name}, a {race_species} {profession_role} in {location} ({world_theme}).

CHARACTER PROFILE:
- Personality: {personality}
- Alignment: {alignment}
- Faction: {faction}
- Backstory: {backstory}
- Dialogue Style: {dialogue_style}
- Motivations: {motivations}
- Fears: {fears}
- Skills: {skills}

WORLD CONTEXT:
- Setting: {world_theme} in {location}
- Environment: {environment}
- Tech Level: {tech_level}
- Time Period: {time_period}
- Faction Tensions: {faction_tensions}

CURRENT SITUATION:
- Dialogue Type: {dialogue_type}
- Dialogue Stage: {dialogue_stage}
- Your Current Mood: {mood}
- Player's Reputation with you: {player_reputation}
- Quest Status: {quest_state}

BEHAVIOR NOTES:
- Combat Role: {combat_role}
- Can Give Quests: {gives_quest}
- Available Services: {available_services}
- Trade Items: {trade_items}

CONVERSATION HISTORY:
{history}

ADDITIONAL CONTEXT:
{additional_context}

PLAYER SAYS: "{player_input}"

INSTRUCTIONS:
1. Respond as {name} would, staying true to their personality, background, and current mood
2. Consider the dialogue type and stage - adjust your response accordingly
3. Remember your relationship with the player based on their reputation
4. If this is a quest-related conversation and you're a quest giver, act appropriately
5. If the player wants to trade/use services, respond based on your available options
6. Keep responses natural and immersive - avoid breaking character
7. Response should be 1-3 sentences unless the situation calls for more
8. Use your dialogue style and speech patterns
9. Consider your fears and motivations in your response

RESPOND AS {name}:
""")
        
        formatted_prompt = dialogue_prompt.format(
            name=npc['name'],
            race_species=npc['race_species'],
            profession_role=npc['profession_role'],
            location=world['location'],
            world_theme=world['world_theme'],
            personality=', '.join(npc['personality']),
            alignment=npc['alignment'],
            faction=npc['faction'],
            backstory=npc['backstory'][:300] + "..." if len(npc['backstory']) > 300 else npc['backstory'],
            dialogue_style=npc.get('dialogue_style', 'Standard'),
            motivations=npc.get('motivations', 'Unknown'),
            fears=npc.get('fears', 'Unknown'),
            skills=', '.join(npc['skills']),
            environment=world['environment'],
            tech_level=world['tech_level'],
            time_period=world['time_period'],
            faction_tensions=world['faction_tensions'],
            dialogue_type=context.dialogue_type,
            dialogue_stage=context.dialogue_stage,
            mood=context.mood,
            player_reputation=context.player_reputation,
            quest_state=context.quest_state,
            combat_role=behavior['combat_role'],
            gives_quest=behavior['gives_quest'],
            available_services=', '.join(behavior['available_services']),
            trade_items=', '.join(behavior['trade_items']),
            history=history_text or "This is your first conversation.",
            additional_context=json.dumps(additional_context or {}, indent=2),
            player_input=player_input
        )
        
        try:
            response = self.llm.invoke(formatted_prompt)
            return response.content.strip()
        except Exception as e:
            print(f"Error generating dialogue: {e}")
            return f"*{npc['name']} seems distracted and doesn't respond clearly.*"
    
    def _update_npc_interaction(self, npc_id: str):
        """Update NPC interaction count and last interaction time"""
        # This would update the NPC's metadata in storage
        # For now, we'll just log it
        print(f"📝 Updated interaction count for NPC {npc_id}")
    
    def get_conversation_summary(self, npc_id: str) -> str:
        """Get a summary of the conversation with an NPC"""
        history = self.storage.get_npc_dialogue_history(npc_id, limit=10)
        
        if not history:
            return "No conversation history found."
        
        npc_data = self.storage.get_npc(npc_id)
        npc_name = npc_data['npc']['name'] if npc_data else "Unknown NPC"
        
        summary = f"📜 **Conversation Summary with {npc_name}**\n"
        summary += f"Total Interactions: {len(history)}\n"
        summary += f"Last Interaction: {history[0].timestamp.strftime('%Y-%m-%d %H:%M')}\n\n"
        
        summary += "**Recent Exchanges:**\n"
        for i, entry in enumerate(history[:3]):
            summary += f"{i+1}. Player: {entry.player_input[:50]}...\n"
            summary += f"   {npc_name}: {entry.npc_response[:50]}...\n\n"
        
        return summary
