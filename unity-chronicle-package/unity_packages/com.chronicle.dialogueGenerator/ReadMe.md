# NPC Dialogue Generator (Unity Editor Tool)

The **NPC Dialogue Generator** is a powerful Unity Editor extension that helps you create richly detailed non-playable characters (NPCs) and generate AI-driven dialogue using your own backend (e.g. Flask + Ollama). It's designed to accelerate game development by turning structured inputs into compelling NPC interactions — directly inside the Unity Editor.

---

## Features

- **Character Profile Builder**: Define NPC personality, faction, profession, species, age, alignment, and more.
- **World Context Setup**: Set location, tech level, world theme, time period, and faction tensions.
- **AI Dialogue Generation**: Connects to your local or remote Flask API to generate immersive NPC dialogue based on context.
- **Persistent NPC Management**: Store NPCs in a `ScriptableObject` registry — survives editor reloads and Unity restarts.
- **Copy or Reuse Dialogue**: Generated results can be copied with one click or exported into your game's systems.
- **Extensible Design**: Modular layout supports adding new fields, request endpoints, or dialogue modes easily.

---

## Installation

### Option 1: Unity Package Manager (Local)

1. Open your Unity project.
2. Go to `Window > Package Manager`.
3. Click the `+` button → **Add package from disk...**
4. Select the `package.json` inside the `com.yourname.dialoguegenerator/` folder.

---

## Getting Started

### 1. Open the Editor Tool:
Go to **`Tools > NPC Dialogue Generator`**

### 2. Set up NPC details:
Fill in:
- Name, age, gender, race/species
- Faction, profession, alignment
- World and environment settings

### 3. Connect Your Registry:
Assign your `NPCRegistrySO` asset to persist all created NPCs.

### 4. Create NPC:
Click **“Create NPC”** to generate an `npc_id` via your Flask backend.

### 5. Generate Dialogue:
Choose a created NPC → Fill in situation context → Click **“Generate Dialogue”**

---

## 🔧 Requirements

- Unity 2022.3 or later
- A running backend at `http://localhost:5000` that supports:
  - `/create_npc`
  - `/talk_to_npc`

> 🛠 Backend must accept structured JSON and return `npc_id` and `response`.

---

