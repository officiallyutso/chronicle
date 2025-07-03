from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from models.dialogue_model import DialogueEntry, ConversationHistory
from models.npc_model import NPCCharacter, DialogueContext
from src.npc_storage import NPCStorage

class ContextManager:
    def __init__(self, storage: NPCStorage):
        self.storage = storage
        self.active_contexts: Dict[str, Dict[str, Any]] = {}
    
    def get_npc_context(self, npc_id: str) -> Dict[str, Any]:
        """Get comprehensive context for an NPC"""
        if npc_id not in self.active_contexts:
            self.active_contexts[npc_id] = self._build_npc_context(npc_id)
        
        return self.active_contexts[npc_id]
    
    def update_npc_context(self, npc_id: str, new_info: Dict[str, Any]):
        """Update NPC context with new information"""
        if npc_id not in self.active_contexts:
            self.active_contexts[npc_id] = self._build_npc_context(npc_id)
        
        self.active_contexts[npc_id].update(new_info)
        self.active_contexts[npc_id]['last_updated'] = datetime.now()
    
    def get_relationship_context(self, npc_id: str) -> str:
        """Get relationship level and history summary"""
        history = self.storage.get_npc_dialogue_history(npc_id, limit=20)
        
        if not history:
            return "This is your first meeting."
        
        total_interactions = len(history)
        recent_mood = history[0].mood if history else "neutral"
        
        if total_interactions >= 15:
            relationship = "close friend"
        elif total_interactions >= 8:
            relationship = "good friend"
        elif total_interactions >= 3:
            relationship = "acquaintance"
        else:
            relationship = "recent acquaintance"
        
        return f"You are {relationship} (met {total_interactions} times). Last mood: {recent_mood}"
    
    def get_conversation_summary(self, npc_id: str, limit: int = 5) -> str:
        """Get a summary of recent conversations"""
        history = self.storage.get_npc_dialogue_history(npc_id, limit)
        
        if not history:
            return "No previous conversations."
        
        summary_parts = []
        for entry in reversed(history):  # Most recent first
            time_ago = self._time_since(entry.timestamp)
            summary_parts.append(f"({time_ago}) Player: {entry.player_input[:30]}... | NPC: {entry.npc_response[:30]}...")
        
        return "\n".join(summary_parts)
    
    def detect_conversation_patterns(self, npc_id: str) -> List[str]:
        """Detect patterns in conversation history"""
        history = self.storage.get_npc_dialogue_history(npc_id, limit=10)
        patterns = []
        
        if not history:
            return patterns
        
        # Detect repeated topics
        topics = [entry.player_input.lower() for entry in history]
        if any(topics.count(topic) > 1 for topic in topics):
            patterns.append("Player tends to ask about similar topics")
        
        # Detect mood patterns
        moods = [entry.mood for entry in history]
        if moods.count('angry') > len(moods) * 0.3:
            patterns.append("Conversations often become tense")
        elif moods.count('happy') > len(moods) * 0.5:
            patterns.append("Usually positive interactions")
        
        return patterns
    
    def _build_npc_context(self, npc_id: str) -> Dict[str, Any]:
        """Build initial context for an NPC"""
        npc_data = self.storage.get_npc(npc_id)
        if not npc_data:
            return {}
        
        return {
            'npc_id': npc_id,
            'relationship_context': self.get_relationship_context(npc_id),
            'conversation_summary': self.get_conversation_summary(npc_id),
            'conversation_patterns': self.detect_conversation_patterns(npc_id),
            'last_updated': datetime.now(),
            'session_start': datetime.now()
        }
    
    def _time_since(self, timestamp: datetime) -> str:
        """Get human-readable time since timestamp"""
        now = datetime.now()
        diff = now - timestamp
        
        if diff.days > 0:
            return f"{diff.days}d ago"
        elif diff.seconds > 3600:
            return f"{diff.seconds // 3600}h ago"
        elif diff.seconds > 60:
            return f"{diff.seconds // 60}m ago"
        else:
            return "just now"
    
    def clear_context(self, npc_id: str):
        """Clear context for an NPC"""
        if npc_id in self.active_contexts:
            del self.active_contexts[npc_id]
    
    def get_all_active_contexts(self) -> Dict[str, Dict[str, Any]]:
        """Get all active contexts"""
        return self.active_contexts.copy()
