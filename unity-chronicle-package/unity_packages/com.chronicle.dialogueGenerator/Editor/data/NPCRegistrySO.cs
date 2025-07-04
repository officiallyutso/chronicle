using UnityEngine;
using System.Collections.Generic;

[CreateAssetMenu(fileName = "NPCRegistry", menuName = "DialogueGenerator/NPC Registry")]
public class NPCRegistrySO : ScriptableObject {
    public List<NPCRecord> npcList = new List<NPCRecord>();
}

[System.Serializable]
public class NPCRecord {
    public string name;
    public string npc_id;

    public NPCRecord(string name, string npc_id) {
        this.name = name;
        this.npc_id = npc_id;
    }

    public override string ToString() => $"{name} ({npc_id})";
}
