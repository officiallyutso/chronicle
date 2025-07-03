from flask import Flask, request, jsonify
import sys
import os
# Disable ChromaDB telemetry FIRST
os.environ["ANONYMIZED_TELEMETRY"] = "False"
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from src.npc_generator import NPCGenerator
from src.dialogue_engine import DialogueEngine
from models.npc_model import DialogueContext
app = Flask(__name__)
# Initialize your NPC system
npc_generator = NPCGenerator()
dialogue_engine = DialogueEngine()
@app.route('/create_npc', methods=['POST'])
def create_npc():
    """Create a new NPC - Unity hits this endpoint"""
    data = request.json
    try:
        npc_id = npc_generator.generate_npc(
            data['character_params'],
            data['world_settings'],
            data['behavior_params'],
            data.get('custom_prompt', '')
        )
        return jsonify({'success': True, 'npc_id': npc_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
@app.route('/talk_to_npc', methods=['POST'])
def talk_to_npc():
    """Talk to an NPC - Unity hits this endpoint"""
    data = request.json
    try:
        context = DialogueContext(
            dialogue_type=data.get('dialogue_type', 'GREETING'),
            dialogue_stage=data.get('dialogue_stage', 'FIRST_MEET'),
            mood=data.get('mood', 'Neutral'),
            player_reputation=data.get('player_reputation', 'Unknown'),
            quest_state=data.get('quest_state', 'Not Given')
        )
        response = dialogue_engine.generate_dialogue(
            data['npc_id'],
            data['player_input'],
            context
        )
        return jsonify({'success': True, 'response': response})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
@app.route('/get_npc_summary/<npc_id>', methods=['GET'])
def get_npc_summary(npc_id):
    """Get NPC information - Unity hits this endpoint"""
    try:
        summary = npc_generator.get_npc_summary(npc_id)
        return jsonify({'success': True, 'summary': summary})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
@app.route('/search_npcs', methods=['POST'])
def search_npcs():
    """Search for NPCs - Unity hits this endpoint"""
    data = request.json
    try:
        npcs = npc_generator.storage.search_npcs(
            data['query'],
            limit=data.get('limit', 5)
        )
        return jsonify({'success': True, 'npcs': npcs})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)