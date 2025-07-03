from typing import Dict, Any, Optional
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json
import uuid
from datetime import datetime

from models.npc_model import NPCCharacter, WorldSettings, DialogueContext, NPCBehavior
from src.npc_storage import NPCStorage

class NPCGenerator:
    def __init__(self, model_name: str = "llama3"):
        self.llm = ChatOllama(
            model=model_name,
            base_url="http://localhost:11434",
            temperature=0.8
        )
        self.storage = NPCStorage()
        print(f"NPC Generator initialized with {model_name}")
    
    def generate_npc(self, 
                    character_params: Dict[str, Any],
                    world_settings: Dict[str, Any],
                    behavior_params: Dict[str, Any],
                    custom_prompt: str = "") -> str:
        """Generate a complete NPC based on parameters"""
        
        # Create structured objects
        npc = NPCCharacter(**character_params)
        world = WorldSettings(**world_settings)
        behavior = NPCBehavior(**behavior_params)
        
        # Generate enhanced backstory and personality
        enhanced_npc = self._enhance_npc_with_ai(npc, world, behavior, custom_prompt)
        
        # Store the NPC
        npc_id = self.storage.store_npc(enhanced_npc, world, behavior)
        
        return npc_id
    
    def _enhance_npc_with_ai(self, npc: NPCCharacter, world: WorldSettings, behavior: NPCBehavior, custom_prompt: str) -> NPCCharacter:
        """Use AI to enhance NPC details"""
        
        enhancement_prompt = ChatPromptTemplate.from_template("""
You are a master storyteller and game designer creating a detailed NPC for a {world_theme} setting.

WORLD CONTEXT:
- Theme: {world_theme}
- Location: {location}
- Time Period: {time_period}
- Environment: {environment}
- Tech Level: {tech_level}
- Faction Tensions: {faction_tensions}

NPC BASE INFO:
- Name: {name}
- Race/Species: {race_species}
- Gender: {gender}
- Age: {age}
- Profession: {profession_role}
- Faction: {faction}
- Alignment: {alignment}
- Personality Traits: {personality}
- Skills: {skills}
- Existing Backstory: {backstory}
- Traits/Flaws: {traits_flaws}

BEHAVIOR CONTEXT:
- Combat Role: {combat_role}
- Gives Quests: {gives_quest}
- Available Services: {available_services}
- Trade Items: {trade_items}

CUSTOM REQUIREMENTS:
{custom_prompt}

Please enhance this NPC by providing:

1. **ENHANCED_BACKSTORY**: A rich, detailed backstory (3-4 paragraphs) that fits the world and explains their current situation, motivations, and how they ended up in their profession/location.

2. **PERSONALITY_DETAILS**: Expand on their personality traits with specific quirks, speech patterns, and behavioral details.

3. **RELATIONSHIPS**: Suggest 2-3 relationships with other NPCs or factions that could create interesting dynamics.

4. **SECRETS**: 1-2 secrets or hidden aspects that could be revealed through deeper interaction.

5. **DIALOGUE_STYLE**: Describe how they speak (formal, casual, with accent, etc.)

6. **MOTIVATIONS**: What drives them? What do they want most?

7. **FEARS**: What do they fear or avoid?

Format your response as JSON with these exact keys:
{{
    "enhanced_backstory": "...",
    "personality_details": "...",
    "relationships": {{"relationship_type": "description"}},
    "secrets": ["secret1", "secret2"],
    "dialogue_style": "...",
    "motivations": "...",
    "fears": "..."
}}
""")
        
        # Prepare the prompt
        formatted_prompt = enhancement_prompt.format(
            world_theme=world.world_theme,
            location=world.location,
            time_period=world.time_period,
            environment=world.environment,
            tech_level=world.tech_level,
            faction_tensions=world.faction_tensions,
            name=npc.name,
            race_species=npc.race_species,
            gender=npc.gender,
            age=npc.age,
            profession_role=npc.profession_role,
            faction=npc.faction,
            alignment=npc.alignment,
            personality=", ".join(npc.personality),
            skills=", ".join(npc.skills),
            backstory=npc.backstory or "None provided",
            traits_flaws=", ".join(npc.traits_flaws),
            combat_role=behavior.combat_role,
            gives_quest=behavior.gives_quest,
            available_services=", ".join(behavior.available_services),
            trade_items=", ".join(behavior.trade_items),
            custom_prompt=custom_prompt or "Create an interesting and unique character."
        )
        
        try:
            # Get AI enhancement
            response = self.llm.invoke(formatted_prompt)
            
            # Validate response content
            if not response.content or not response.content.strip():
                print("⚠️ Empty response from LLM, using basic NPC")
                return npc
                
            # Clean the response - remove any markdown formatting
            content = response.content.strip()
            if content.startswith('```'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # Parse JSON response
            enhancement_data = json.loads(content)
            
            # Apply enhancements to NPC
            npc.backstory = enhancement_data.get("enhanced_backstory", npc.backstory)
            
            # Parse JSON response
            enhancement_data = json.loads(response.content)
            
            # Apply enhancements to NPC
            npc.backstory = enhancement_data.get("enhanced_backstory", npc.backstory)
            
            # Add new attributes for enhanced data
            npc.personality_details = enhancement_data.get("personality_details", "")
            npc.dialogue_style = enhancement_data.get("dialogue_style", "")
            npc.motivations = enhancement_data.get("motivations", "")
            npc.fears = enhancement_data.get("fears", "")
            npc.secrets = enhancement_data.get("secrets", [])
            
            # Update relationships
            if enhancement_data.get("relationships"):
                npc.relationships.update(enhancement_data["relationships"])
            
            print(f"✅ Enhanced NPC '{npc.name}' with AI-generated details")
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing failed: {e}")
            print(f"Raw response: {response.content[:200]}...")
            print("Using basic NPC without AI enhancements")
            return npc
        except Exception as e:
            print(f"⚠️ AI enhancement failed: {e}")
        return npc
    
    def get_npc_summary(self, npc_id: str) -> Optional[str]:
        """Get a formatted summary of an NPC"""
        npc_data = self.storage.get_npc(npc_id)
        if not npc_data:
            return None
        
        npc = npc_data['npc']
        world = npc_data['world']
        behavior = npc_data['behavior']
        
        summary = f"""
🎭 **{npc['name']}** ({npc['race_species']} {npc['profession_role']})
📍 Location: {world['location']} ({world['world_theme']})
⚔️ Alignment: {npc['alignment']} | Combat: {behavior['combat_role']}
🏛️ Faction: {npc['faction']}

**Personality**: {', '.join(npc['personality'])}
**Skills**: {', '.join(npc['skills'])}

**Backstory**: {npc['backstory'][:200]}...

**Dialogue Style**: {npc.get('dialogue_style', 'Standard')}
**Motivations**: {npc.get('motivations', 'Unknown')}
"""
        
        if behavior['gives_quest']:
            summary += f"\n🎯 **Quest Giver**: {behavior.get('quest_id', 'Available')}"
        
        if behavior['available_services']:
            summary += f"\n🛠️ **Services**: {', '.join(behavior['available_services'])}"
        
        if behavior['trade_items']:
            summary += f"\n💰 **Trades**: {', '.join(behavior['trade_items'])}"
        
        return summary
