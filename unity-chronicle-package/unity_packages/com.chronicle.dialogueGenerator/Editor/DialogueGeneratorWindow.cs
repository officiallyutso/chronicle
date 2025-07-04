using UnityEngine;
using UnityEditor;
using UnityEngine.Networking;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
public class DialogueGeneratorWindow : EditorWindow
{

    [SerializeField] private NPCRegistrySO npcRegistry;
    private List<NPCRecord> createdNpcs;
    private int selectedNpcIndex = 0;
    // CHARACTER PROFILE

    private string npcName = "Unnamed NPC";

    private string[] genderOptions = { "Male", "Female", "Non-binary", "None" };
    private int genderIndex = 0;

    private string[] ageOptions = { "Young", "Adult", "Middle-aged", "Old" };
    private int ageIndex = 1;

    private string[] personality = { "Gruff", "Cheerful", "Stoic", "Cunning", "Irritable", "Mysterious", "Noble", "Greedy", "Anxious" };
    private int personalityIndex = 0;
    private string raceSpecies = "Human";
    private string professionRole = "Citizen";

    private string[] alignmentOptions = { "Good", "Neutral", "Evil" };
    private int alignmentIndex = 1;

    private string faction = "The Crimson Blades";
    private string backstory = "Former mercenary turned guard.";

    // WORLD CONTEXT
    private string[] worldThemeOptions = { "Medieval fantasy", "Post-apocalyptic", "Cyberpunk", "Steampunk" };
    private int worldThemeIndex = 0;

    private string location = "Riverdale Keep";
    private string environment = "Snowy mountains";
    private string techLevel = "Low-tech";

    private string[] timePeriodOptions = { "First Age", "Second Age", "Third Age", "Modern Era" };
    private int timePeriodIndex = 2;

    private string factionTensions = "Crimson Blades vs. Iron Fangs";

    // CURRENT SITUATION
    private string[] dialogueTypeOptions = { "Quest Introduction", "Idle Chatter", "Warning", "Farewell" };
    private int dialogueTypeIndex = 0;

    private string[] dialogueStageOptions = { "Beginning", "Middle", "End" };
    private int dialogueStageIndex = 0;

    private string[] moodOptions = { "Wary", "Friendly", "Suspicious", "Excited" };
    private int moodIndex = 0;

    private string[] playerReputationOptions = { "Respected", "Neutral", "Feared", "Unknown" };
    private int playerReputationIndex = 0;

    private string[] questStateOptions = { "Not Started", "In Progress", "Completed" };
    private int questStateIndex = 0;

    // BEHAVIOR NOTES
    private string[] combatRoleOptions = { "Passive", "Guard", "Aggressive" }; // overwrite old
    private int combatRoleIndex = 0;

    private string[] givesQuestOptions = { "Yes", "No" };
    private int givesQuestIndex = 0;

    private string availableServices = "Training, Escort";
    private string tradeItems = "Iron swords, Potions";
    private string _player_input = "What brings you to this part of the land?";
    private string generatedDialogue = "";
    private string currentNpcId = ""; // Store the current NPC ID for dialogue generation


    [MenuItem("Tools/NPC Dialogue Generator")]
    public static void ShowWindow()
    {
        GetWindow<DialogueGeneratorWindow>("Dialogue Generator");

    }
    private void OnEnable()
    {
        if (npcRegistry != null)
        {
            createdNpcs = npcRegistry.npcList;
        }
        else
        {
            createdNpcs = new List<NPCRecord>(); // fallback in case not assigned
        }
    }
    private Vector2 scrollPos;

    private void OnGUI()
    {
        // const float maxWidth = 600f;
        // float width = Mathf.Min(position.width - 40, maxWidth);
        //scrollPos = EditorGUILayout.BeginScrollView(scrollPos);
        // GUILayout.BeginVertical(GUILayout.MaxWidth(maxWidth));
        scrollPos = EditorGUILayout.BeginScrollView(scrollPos);
        GUILayout.Label("NPC Dialogue Generator", EditorStyles.boldLabel);
        npcRegistry = (NPCRegistrySO)EditorGUILayout.ObjectField("NPC Registry", npcRegistry, typeof(NPCRegistrySO), false);
        DrawSection("CHARACTER PROFILE", () =>
        {
            npcName = TextField("Name", npcName);
            genderIndex = EditorGUILayout.Popup("Gender", genderIndex, genderOptions);
            ageIndex = EditorGUILayout.Popup("Age", ageIndex, ageOptions);
            raceSpecies = TextField("Race/Species", raceSpecies);
            professionRole = TextField("Profession/Role", professionRole);
            alignmentIndex = EditorGUILayout.Popup("Alignment", alignmentIndex, alignmentOptions);
            faction = TextField("Faction", faction);
            backstory = TextField("Backstory", backstory);
        });

        DrawSection("WORLD CONTEXT", () =>
        {
            worldThemeIndex = EditorGUILayout.Popup("World Theme", worldThemeIndex, worldThemeOptions);
            location = TextField("Location", location);
            environment = TextField("Environment", environment);
            techLevel = TextField("Tech Level", techLevel);
            timePeriodIndex = EditorGUILayout.Popup("Time Period", timePeriodIndex, timePeriodOptions);
            factionTensions = TextField("Faction Tensions", factionTensions);
        });

        DrawSection("CURRENT SITUATION", () =>
        {
            dialogueTypeIndex = EditorGUILayout.Popup("Dialogue Type", dialogueTypeIndex, dialogueTypeOptions);
            dialogueStageIndex = EditorGUILayout.Popup("Dialogue Stage", dialogueStageIndex, dialogueStageOptions);
            moodIndex = EditorGUILayout.Popup("Your Current Mood", moodIndex, moodOptions);
            playerReputationIndex = EditorGUILayout.Popup("Player's Reputation", playerReputationIndex, playerReputationOptions);
            questStateIndex = EditorGUILayout.Popup("Quest Status", questStateIndex, questStateOptions);
        });

        DrawSection("BEHAVIOR NOTES", () =>
        {
            combatRoleIndex = EditorGUILayout.Popup("Combat Role", combatRoleIndex, combatRoleOptions);
            givesQuestIndex = EditorGUILayout.Popup("Can Give Quests", givesQuestIndex, givesQuestOptions);
            availableServices = TextField("Available Services", availableServices);
            tradeItems = TextField("Trade Items", tradeItems);
        });
        if (GUILayout.Button("Create NPC"))
        {
            CreateNPC();
        }
        if (createdNpcs.Count > 0)
        {
            GUILayout.Space(10);
            GUILayout.Label("Select NPC for Dialogue", EditorStyles.boldLabel);
            _player_input = TextField("Player Input", _player_input);
            string[] npcDisplayNames = createdNpcs.ConvertAll(npc => npc.ToString()).ToArray();
            selectedNpcIndex = EditorGUILayout.Popup("NPCs", selectedNpcIndex, npcDisplayNames);
            currentNpcId = createdNpcs[selectedNpcIndex].npc_id;
        }
        GUILayout.Label($"Current NPC ID: {currentNpcId}", EditorStyles.helpBox);
        if (GUILayout.Button("Generate Dialogue"))
        {
            SendToAI();
        }

        if (!string.IsNullOrEmpty(generatedDialogue))
        {
            GUILayout.Label("Generated Dialogue:", EditorStyles.boldLabel);

            GUIStyle wrapStyle = new GUIStyle(EditorStyles.textArea);
            wrapStyle.wordWrap = true;

            EditorGUILayout.TextArea(generatedDialogue, wrapStyle, GUILayout.Height(600), GUILayout.ExpandWidth(true), GUILayout.MaxWidth(800));

            if (GUILayout.Button("Copy Dialogue"))
            {
                EditorGUIUtility.systemCopyBuffer = generatedDialogue;
            }
        }

        // GUILayout.EndVertical();


        EditorGUILayout.EndScrollView();
    }

    private string TextField(string label, string value)
    {
        return EditorGUILayout.TextField(label, value);
    }

    private void DrawSection(string heading, System.Action drawContent)
    {
        GUILayout.Space(10);
        GUILayout.Label(heading, EditorStyles.boldLabel);
        EditorGUI.indentLevel++;
        drawContent.Invoke();
        EditorGUI.indentLevel--;
    }

    private async void SendToAI()
    {
        string npcId = currentNpcId;
        string playerInput = _player_input;

        var requestData = new Dictionary<string, object> {
        { "npc_id", npcId },
        { "player_input", playerInput },
        { "dialogue_type", dialogueTypeOptions[dialogueTypeIndex] },
        { "dialogue_stage", dialogueStageOptions[dialogueStageIndex] },
        { "mood", moodOptions[moodIndex] },
        { "player_reputation", playerReputationOptions[playerReputationIndex] },
        { "quest_state", questStateOptions[questStateIndex] }
    };

        string json = JsonUtility.ToJson(new Wrapper(requestData)); // Wrap workaround for Dictionary

        using (UnityWebRequest request = new UnityWebRequest("http://localhost:5000/talk_to_npc", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            Debug.Log("Sending request to AI with payload: " + json);
            var asyncOp = request.SendWebRequest();
            while (!asyncOp.isDone) await Task.Yield();

            if (request.result == UnityWebRequest.Result.Success)
            {
                string rawJson = request.downloadHandler.text;
                try
                {
                    var result = JsonUtility.FromJson<NPCResponse>(rawJson);
                    generatedDialogue = result.response;
                }
                catch
                {
                    generatedDialogue = rawJson;
                }
            }
            else
            {
                generatedDialogue = "Error: " + request.error + "\n\n" + request.downloadHandler.text;
            }

            Repaint();
        }
    }
    private async void CreateNPC()
    {
        var characterParams = new Dictionary<string, object> {
        { "name", npcName },
        { "gender", genderOptions[genderIndex] },
        { "age", ageOptions[ageIndex] },
        { "race_species", raceSpecies },
        { "profession_role", professionRole },
        { "alignment", alignmentOptions[alignmentIndex] },
        { "faction", faction },
        { "backstory", backstory },
        { "personality", personality[personalityIndex] }
    };

        var worldSettings = new Dictionary<string, object> {
        { "world_theme", worldThemeOptions[worldThemeIndex] },
        { "location", location },
        { "time_period", timePeriodOptions[timePeriodIndex] },
        { "environment", environment },
        { "tech_level", techLevel },
        { "faction_tensions", factionTensions }
    };

        var behaviorParams = new Dictionary<string, object> {
        { "gives_quest", givesQuestOptions[givesQuestIndex] == "Yes" }, // bool
        { "combat_role", combatRoleOptions[combatRoleIndex] }
    };

        var payload = new Dictionary<string, object> {
        { "character_params", characterParams },
        { "world_settings", worldSettings },
        { "behavior_params", behaviorParams }
    };

        string json = MiniJSON.Json.Serialize(payload);

        using (UnityWebRequest request = new UnityWebRequest("http://localhost:5000/create_npc", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            Debug.Log("Sending NPC creation request with payload: " + json);
            var asyncOp = request.SendWebRequest();
            while (!asyncOp.isDone) await Task.Yield();

            if (request.result == UnityWebRequest.Result.Success)
            {
                try
                {
                    var raw = request.downloadHandler.text;
                    var responseDict = MiniJSON.Json.Deserialize(raw) as Dictionary<string, object>;
                    if ((bool)responseDict["success"])
                    {
                        currentNpcId = responseDict["npc_id"].ToString();
                        Debug.Log($" NPC created with ID: {currentNpcId}");
                        createdNpcs.Add(new NPCRecord(npcName, currentNpcId));
                        selectedNpcIndex = createdNpcs.Count - 1;
                        if (npcRegistry != null)
                        {
                            EditorUtility.SetDirty(npcRegistry);
                            AssetDatabase.SaveAssets();
                        }
                    }
                    else
                    {
                        Debug.LogError("NPC creation failed: " + raw);
                    }
                }
                catch
                {
                    Debug.LogError("Error parsing NPC creation response.");
                }
            }
            else
            {
                Debug.LogError("Error: " + request.error + "\n" + request.downloadHandler.text);
            }

            Repaint();
        }
    }


    [System.Serializable]
    private class CreateNpcPayload
    {
        public Dictionary<string, string> character_params;
        public Dictionary<string, string> world_settings;
        public Dictionary<string, string> behavior_params;
    }

    // JSONUtility can't serialize Dictionary directly, so we wrap it
    [System.Serializable]
    private class Wrapper
    {
        public string npc_id;
        public string player_input;
        public string dialogue_type;
        public string dialogue_stage;
        public string mood;
        public string player_reputation;
        public string quest_state;

        public Wrapper(Dictionary<string, object> dict)
        {
            npc_id = dict["npc_id"].ToString();
            player_input = dict["player_input"].ToString();
            dialogue_type = dict["dialogue_type"].ToString();
            dialogue_stage = dict["dialogue_stage"].ToString();
            mood = dict["mood"].ToString();
            player_reputation = dict["player_reputation"].ToString();
            quest_state = dict["quest_state"].ToString();
        }
    }

    [System.Serializable]
    private class NPCResponse
    {
        public bool success;
        public string response;
    }

}
