from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
import json

@dataclass
class NPCCharacter:
    # Basic Identity
    name: str
    gender: str = "Male"
    age: str = "Adult"
    race_species: str = "Human"
    
    # Personality & Alignment
    personality: List[str] = field(default_factory=list)
    alignment: str = "Neutral"
    profession_role: str = "Citizen"
    
    # World Context
    faction: str = "None"
    skills: List[str] = field(default_factory=list)
    backstory: str = ""
    traits_flaws: List[str] = field(default_factory=list)
    relationships: Dict[str, str] = field(default_factory=dict)
    
    # Generated Data
    npc_id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    last_interaction: Optional[datetime] = None
    interaction_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'npc_id': self.npc_id,
            'name': self.name,
            'gender': self.gender,
            'age': self.age,
            'race_species': self.race_species,
            'personality': self.personality,
            'alignment': self.alignment,
            'profession_role': self.profession_role,
            'faction': self.faction,
            'skills': self.skills,
            'backstory': self.backstory,
            'traits_flaws': self.traits_flaws,
            'relationships': self.relationships,
            'created_at': self.created_at.isoformat(),
            'last_interaction': self.last_interaction.isoformat() if self.last_interaction else None,
            'interaction_count': self.interaction_count
        }

@dataclass
class WorldSettings:
    world_theme: str = "Medieval Fantasy"
    location: str = "Village"
    time_period: str = "Medieval"
    faction_tensions: str = "Neutral"
    tech_level: str = "Low-Tech"
    environment: str = "Temperate"

@dataclass
class DialogueContext:
    dialogue_type: str = "GREETING"
    dialogue_stage: str = "FIRST_MEET"
    mood: str = "Neutral"
    player_reputation: str = "Unknown"
    quest_state: str = "Not Given"
    conditions: List[str] = field(default_factory=list)

@dataclass
class NPCBehavior:
    gives_quest: bool = False
    quest_id: Optional[str] = None
    combat_role: str = "Passive"
    trade_items: List[str] = field(default_factory=list)
    available_services: List[str] = field(default_factory=list)
