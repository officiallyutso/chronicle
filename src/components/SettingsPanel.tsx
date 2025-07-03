import React, { useState } from 'react';
import { NarrativeStyle } from '../services/ollamaService';

interface SettingsPanelProps {
  narrativeStyle: NarrativeStyle;
  onStyleChange: (style: NarrativeStyle) => void;
  ollamaAvailable: boolean;
  onClearData: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  narrativeStyle,
  onStyleChange,
  ollamaAvailable,
  onClearData
}) => {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [trackingInterval, setTrackingInterval] = useState(2000);
  const [autoGenerateNarrative, setAutoGenerateNarrative] = useState(false);

  const handleExportSettings = () => {
    const settings = {
      narrativeStyle,
      ollamaUrl,
      trackingInterval,
      autoGenerateNarrative,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chronicle-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        if (settings.narrativeStyle) onStyleChange(settings.narrativeStyle);
        if (settings.ollamaUrl) setOllamaUrl(settings.ollamaUrl);
        if (settings.trackingInterval) setTrackingInterval(settings.trackingInterval);
        if (typeof settings.autoGenerateNarrative === 'boolean') {
          setAutoGenerateNarrative(settings.autoGenerateNarrative);
        }
      } catch (error) {
        console.error('Error importing settings:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* AI Configuration */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">AI Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Ollama Status</label>
              <span className={`px-2 py-1 rounded text-xs ${
                ollamaAvailable 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
              }`}>
                {ollamaAvailable ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              {ollamaAvailable 
                ? 'Ollama is running and ready to generate narratives'
                : 'Ollama is not available. Install and run Ollama with LLaMA 3 model for AI features.'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Ollama URL</label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="http://localhost:11434"
            />
            <p className="text-xs text-gray-400 mt-1">
              Default Ollama API endpoint
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoGenerate"
              checked={autoGenerateNarrative}
              onChange={(e) => setAutoGenerateNarrative(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="autoGenerate" className="text-sm text-gray-300">
              Auto-generate narrative every 30 minutes
            </label>
          </div>
        </div>
      </div>

      {/* Tracking Configuration */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Tracking Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tracking Interval (ms)
            </label>
            <input
              type="number"
              value={trackingInterval}
              onChange={(e) => setTrackingInterval(Number(e.target.value))}
              min="1000"
              max="10000"
              step="500"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              How often to check for active applications (1000-10000ms)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="font-medium text-white mb-2">Tracked Events</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Application switches</li>
                <li>• File modifications</li>
                <li>• Terminal commands</li>
                <li>• VS Code actions</li>
              </ul>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="font-medium text-white mb-2">Privacy</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• All data stays local</li>
                <li>• No cloud sync</li>
                <li>• No telemetry</li>
                <li>• Full control</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Default Narrative Style */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Default Narrative Style</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Tone</label>
            <select
              value={narrativeStyle.tone}
              onChange={(e) => onStyleChange({ ...narrativeStyle, tone: e.target.value as any })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="gamified">Gamified</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Format</label>
            <select
              value={narrativeStyle.format}
              onChange={(e) => onStyleChange({ ...narrativeStyle, format: e.target.value as any })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="story">Story</option>
              <option value="log">Log</option>
              <option value="achievements">Achievements</option>
              <option value="summary">Summary</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Data Management</h2>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export Settings
            </button>
            
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
              Import Settings
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
              />
            </label>
            
            <button
              onClick={onClearData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear All Data
            </button>
          </div>
          
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <h4 className="font-medium text-yellow-400 mb-2">Data Storage</h4>
            <p className="text-sm text-gray-300">
              All tracking data is stored locally in memory during the session. 
              Data is not persisted between app restarts unless explicitly exported.
            </p>
          </div>
        </div>
      </div>

            {/* About */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">About Chronicle</h2>

        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong>Chronicle</strong> is a privacy-first productivity companion
            that tracks local activity and generates engaging summaries using AI.
          </p>
          <p>
            Built using Electron, Vite, TailwindCSS, and Ollama. No data
            leaves your machine — everything stays local and in your control.
          </p>
          <p className="text-gray-400 text-xs">
            Version: 1.0.0<br />
            Developer: Kaleshi Coders<br />
            GitHub: <a href="https://github.com/officiallyutso/chronicle" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://github.com/officiallyutso/chronicle</a>
          </p>
        </div>
      </div>
    </div>
  );
};
