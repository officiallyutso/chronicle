from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime

@dataclass
class DialogueEntry:
    npc_id: str
    player_input: str
    npc_response: str
    context: Dict[str, any]
    timestamp: datetime = field(default_factory=datetime.now)
    dialogue_type: str = "CONVERSATION"
    mood: str = "Neutral"
    
    def to_dict(self) -> Dict:
        return {
            'npc_id': self.npc_id,
            'player_input': self.player_input,
            'npc_response': self.npc_response,
            'context': self.context,
            'timestamp': self.timestamp.isoformat(),
            'dialogue_type': self.dialogue_type,
            'mood': self.mood
        }

@dataclass
class ConversationHistory:
    npc_id: str
    entries: List[DialogueEntry] = field(default_factory=list)
    total_interactions: int = 0
    relationship_level: str = "Stranger"
    
    def add_entry(self, entry: DialogueEntry):
        self.entries.append(entry)
        self.total_interactions += 1
        self.update_relationship()
    
    def update_relationship(self):
        if self.total_interactions >= 10:
            self.relationship_level = "Friend"
        elif self.total_interactions >= 5:
            self.relationship_level = "Acquaintance"
        elif self.total_interactions >= 1:
            self.relationship_level = "Met"
