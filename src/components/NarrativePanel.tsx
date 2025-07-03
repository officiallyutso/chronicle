import React from 'react';
import { NarrativeStyle } from '../services/ollamaService';

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
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Style Controls */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Narrative Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Narrative Tone</label>
            <div className="space-y-2">
              {(['casual', 'professional', 'gamified', 'technical'] as const).map((tone) => (
                <label key={tone} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="tone"
                    value={tone}
                    checked={narrativeStyle.tone === tone}
                    onChange={() => handleToneChange(tone)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <span className="text-white capitalize">{tone}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Narrative Format</label>
            <div className="space-y-2">
              {(['story', 'log', 'achievements', 'summary'] as const).map((format) => (
                <label key={format} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    checked={narrativeStyle.format === format}
                    onChange={() => handleFormatChange(format)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <span className="text-white capitalize">{format}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            {isGenerating ? (
              <span className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                <span>Generating Narrative...</span>
              </span>
            ) : (
              'Generate New Narrative'
            )}
          </button>
        </div>
      </div>

      {/* Generated Narrative */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Your Development Story</h2>
          {narrative && (
            <button
              onClick={() => copyToClipboard(narrative)}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
            >
              Copy
            </button>
          )}
        </div>
        
        <div className="min-h-[200px]">
          {narrative ? (
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                {narrative}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">📖</div>
                <p>Generate your first narrative to see your development story here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Achievements Unlocked</h2>
            <button
              onClick={() => copyToClipboard(achievements.join('\n'))}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
            >
              Copy All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30 hover:from-purple-600/30 hover:to-blue-600/30 transition-all"
              >
                <p className="text-white">{achievement}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Export Options</h3>
        <div className="flex flex-wrap gap-3">
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
          >
            Export as Markdown
          </button>
        </div>
      </div>
    </div>
  );
};