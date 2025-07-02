import { ActivityEvent } from './systemTracker';

export interface NarrativeStyle {
  tone: 'casual' | 'professional' | 'gamified' | 'technical';
  format: 'story' | 'log' | 'achievements' | 'summary';
}

export class OllamaService {
  private baseUrl = 'http://localhost:11434';

  constructor() {
    console.log('OllamaService initialized');
  }

  public async isOllamaAvailable(): Promise<boolean> {
    try {
        const res = await fetch(`${this.baseUrl}/api/tags`);
        return res.ok;
    } catch {
        return false;
    }
    }


  public async generateNarrative(events: ActivityEvent[], style: NarrativeStyle): Promise<string> {
    // Try to connect to Ollama first
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama2', // or whatever model you have installed
          prompt: this.createNarrativePrompt(events, style),
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response;
      } else {
        throw new Error('Ollama not available');
      }
    } catch (error) {
      console.log('Ollama not available, using mock narrative');
      return this.generateMockNarrative(events, style);
    }
  }

  public async generateAchievements(events: ActivityEvent[]): Promise<string[]> {
    // Try to connect to Ollama first
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3',
          prompt: this.createAchievementPrompt(events),
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response.split('\n').filter((line: string) => line.trim().length > 0);
      } else {
        throw new Error('Ollama not available');
      }
    } catch (error) {
      console.log('Ollama not available, using mock achievements');
      return this.generateMockAchievements(events);
    }
  }

  private createNarrativePrompt(events: ActivityEvent[], style: NarrativeStyle): string {
    const eventSummary = events.map(e => `${e.type}: ${JSON.stringify(e.data)}`).join('\n');
    
    return `Generate a ${style.tone} ${style.format} based on these development activities:

${eventSummary}

Create an engaging narrative that tells the story of this coding session. Focus on the developer's journey, challenges, and accomplishments.`;
  }

  private createAchievementPrompt(events: ActivityEvent[]): string {
    const eventSummary = events.map(e => `${e.type}: ${JSON.stringify(e.data)}`).join('\n');
    
    return `Based on these development activities, generate 3-5 achievement badges:

${eventSummary}

Format each achievement as a single line. Make them fun and gamified.`;
  }

  private generateMockNarrative(events: ActivityEvent[], style: NarrativeStyle): string {
    const appEvents = events.filter(e => e.type === 'app_opened');
    const fileEvents = events.filter(e => e.type === 'file_changed');
    const terminalEvents = events.filter(e => e.type === 'terminal_command');

    switch (style.tone) {
      case 'gamified':
        return `🎮 **Epic Coding Quest Complete!** 🎮

Our brave developer embarked on an epic coding journey! They wielded ${appEvents.length} different applications like powerful tools, modified ${fileEvents.length} sacred files, and cast ${terminalEvents.length} terminal spells.

The session lasted ${this.getSessionDuration(events)} minutes of pure coding magic! 

**Boss Battles Fought:**
- Conquered the mysterious bugs in ${fileEvents.map(e => e.data.fileName).join(', ')}
- Mastered the arcane arts of ${appEvents.map(e => e.data.appName).join(', ')}

**XP Gained:** ${events.length * 10}
**Level:** Intermediate Code Warrior 🗡️`;

      case 'professional':
        return `**Development Session Report**

Duration: ${this.getSessionDuration(events)} minutes
Total Activities: ${events.length}

**Key Accomplishments:**
- Utilized ${appEvents.length} development tools efficiently
- Modified ${fileEvents.length} project files
- Executed ${terminalEvents.length} command-line operations

**Primary Focus Areas:**
${fileEvents.map(e => `- ${e.data.fileName} (${e.data.action})`).join('\n')}

This session demonstrates consistent development workflow and tool proficiency.`;

      case 'technical':
        return `**Technical Session Analysis**

\`\`\`
Session Metrics:
├── Duration: ${this.getSessionDuration(events)}m
├── Event Count: ${events.length}
├── Applications: ${appEvents.length}
├── File Operations: ${fileEvents.length}
└── Terminal Commands: ${terminalEvents.length}
\`\`\`

**File System Activity:**
${fileEvents.map(e => `- ${e.data.action.toUpperCase()}: ${e.data.fileName}`).join('\n')}

**Process Activity:**
${appEvents.map(e => `- EXEC: ${e.data.appName}`).join('\n')}

**Performance:** Optimal development velocity maintained throughout session.`;

      default:
        return `Hey there!

You had quite a productive coding session! Over ${this.getSessionDuration(events)} minutes, you were busy with ${events.length} different activities.

You worked with ${appEvents.length} different apps and made changes to ${fileEvents.length} files. ${terminalEvents.length > 0 ? `Plus, you ran ${terminalEvents.length} terminal commands - very hands-on!` : ''}

${fileEvents.length > 0 ? `The files you worked on include: ${fileEvents.map(e => e.data.fileName).slice(0, 3).join(', ')}${fileEvents.length > 3 ? ' and more!' : '.'}` : ''}

Keep up the great work!`;
    }
  }
/////mock achievements as a fail safe
  private generateMockAchievements(events: ActivityEvent[]): string[] {
    const achievements = [];
    
    if (events.length >= 10) {
      achievements.push("Activity Master - Logged 10+ activities in one session!");
    }
    
    if (events.filter(e => e.type === 'app_opened').length >= 3) {
      achievements.push("Multitasker - Used 3+ different applications!");
    }
    
    if (events.filter(e => e.type === 'file_changed').length >= 5) {
      achievements.push("File Wizard - Modified 5+ files in one session!");
    }
    
    if (events.filter(e => e.type === 'terminal_command').length >= 3) {
      achievements.push("Terminal Ninja - Executed 3+ terminal commands!");
    }
    
    if (this.getSessionDuration(events) >= 30) {
      achievements.push("Marathon Coder - Coded for 30+ minutes straight!");
    }
    
    if (achievements.length === 0) {
      achievements.push("Getting Started - Your coding journey begins!");
    }
    
    return achievements;
  }

  private getSessionDuration(events: ActivityEvent[]): number {
    if (events.length === 0) return 0;
    return Math.round((events[events.length - 1].timestamp - events[0].timestamp) / 1000 / 60);
  }
}
//testing