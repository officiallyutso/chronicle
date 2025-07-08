import React from 'react';
import { NarrativeStyle } from '../services/ollamaService';
import formatStory from '../assets/format-story.jpg';
import formatLog from '../assets/format-log.jpg';
import formatAchievements from '../assets/format-achievements.jpg';
import formatSummary from '../assets/format-summary.jpg';
import toneCasual from '../assets/tone-casual.jpg';
import toneProfessional from '../assets/tone-proffesional.jpg';
import toneGamified from '../assets/tone-gamified.jpg';
import toneTechnical from '../assets/tone-technical.jpg'

const formatImages: Record<string, string> = {
  story: formatStory,
  log: formatLog,
  achievements: formatAchievements,
  summary: formatSummary,
};

const toneImages: Record<string, string> = {
  casual: toneCasual,
  professional: toneProfessional,
  gamified: toneGamified,
  technical: toneTechnical,
};


interface NarrativePanelProps {
  narrative: string;
  achievements: string[];
  onGenerate: () => void;
  isGenerating: boolean;
  narrativeStyle: NarrativeStyle;
  onStyleChange: (style: NarrativeStyle) => void;
}

export const NarrativePanel: React.FC<NarrativePanelProps> = ({
  narrative,
  achievements,
  onGenerate,
  isGenerating,
  narrativeStyle,
  onStyleChange
}) => {
  const handleToneChange = (tone: NarrativeStyle['tone']) => {
    onStyleChange({ ...narrativeStyle, tone });
  };

  const handleFormatChange = (format: NarrativeStyle['format']) => {
    onStyleChange({ ...narrativeStyle, format });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="space-y-14">
      {/* Tagline */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-cyan-600">Craft Your Digital Journey</h1>
        <p className="text-gray-500 mt-2">Shape your activity into stories worth remembering ✨</p>
      </div>

      {/* Style Controls */}
      <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Customize Your Narrative</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Tone Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Tone</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['casual', 'professional', 'gamified', 'technical'] as const).map((tone) => (
                <div
                  key={tone}
                  className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-200 shadow-md hover:shadow-xl ${narrativeStyle.tone === tone ? 'border-cyan-500 bg-cyan-50 scale-105' : 'border-gray-200 hover:border-cyan-300'} cursor-pointer`}
                  onClick={() => handleToneChange(tone)}
                >
                  <img src={toneImages[tone]} alt={tone} className="w-30 h-30 mb-2" />
                  <span className="capitalize text-gray-800 text-sm font-medium">{tone}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Format</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['story', 'log', 'achievements', 'summary'] as const).map((format) => (
                <div
                  key={format}
                  className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-200 shadow-md hover:shadow-xl ${narrativeStyle.format === format ? 'border-cyan-500 bg-cyan-50 scale-105' : 'border-gray-200 hover:border-cyan-300'} cursor-pointer`}
                  onClick={() => handleFormatChange(format)}
                >
                  <img src={formatImages[format]} alt={format} className="w-30 h-30 mb-2" />
                  <span className="capitalize text-gray-800 text-sm font-medium">{format}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold disabled:opacity-50 hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center space-x-2 animate-fade-in"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                <span>Generating Narrative...</span>
              </>
            ) : (
              <>

                <span>Generate Narrative</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Narrative */}
      <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl p-10 border border-gray-200 shadow-xl relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-700 flex items-center gap-2">📘 Your Chronicle</h2>
          {narrative && (
            <button
              onClick={() => copyToClipboard(narrative)}
              className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded hover:bg-cyan-200 text-sm"
            >
              Copy
            </button>
          )}
        </div>
        <div className="min-h-[200px] max-w-3xl mx-auto px-8 py-8 bg-white rounded-xl border border-gray-100 shadow-inner leading-relaxed text-gray-800 font-serif text-lg">
          {narrative ? (
            <div className="whitespace-pre-wrap prose prose-sm sm:prose-lg">
              {narrative}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-4">📖</div>
                <p>Generate your first narrative to see your development story here.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-cyan-700">Achievements Unlocked</h2>
            <button
              onClick={() => copyToClipboard(achievements.join('\n'))}
              className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded hover:bg-cyan-200 text-sm"
            >
              Copy All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-cyan-200 hover:from-blue-100 hover:to-cyan-100 transition-all"
              >
                <p className="text-gray-800">{achievement}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-xl">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Export & Save</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => {
              const data = {
                narrative,
                achievements,
                style: narrativeStyle,
                generatedAt: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `chronicle-narrative-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!narrative}
            className="px-5 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
          >
            Export as JSON
          </button>
          <button
            onClick={() => {
              const content = `# Chronicle Development Narrative\n\nGenerated: ${new Date().toLocaleString()}\nStyle: ${narrativeStyle.tone} ${narrativeStyle.format}\n\n## Story\n\n${narrative}\n\n## Achievements\n\n${achievements.map(a => `- ${a}`).join('\n')}`;
              const blob = new Blob([content], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `chronicle-narrative-${new Date().toISOString().split('T')[0]}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!narrative}
            className="px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Export as Markdown
          </button>
        </div>
      </div>
    </div>
  );
};