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
  onClearData,
}) => {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [trackingInterval, setTrackingInterval] = useState(2000);
  const [autoGenerateNarrative, setAutoGenerateNarrative] = useState(false);
  const [activeSection, setActiveSection] = useState('ai');

  const handleExportSettings = () => {
    const settings = {
      narrativeStyle,
      ollamaUrl,
      trackingInterval,
      autoGenerateNarrative,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
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
        if (settings.trackingInterval)
          setTrackingInterval(settings.trackingInterval);
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
    <div className="flex h-full bg-white text-gray-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-cyan-50 border-r border-gray-200 p-6 hidden md:flex flex-col space-y-4">
        <h2 className="text-xl font-bold text-cyan-700 mb-4">Chronicle</h2>
        {[
          { id: 'ai', label: 'AI Configuration' },
          { id: 'tracking', label: 'Tracking Settings' },
          { id: 'style', label: 'Default Narrative Style' },
          { id: 'data', label: 'Data Management' },
          { id: 'about', label: 'About' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              const section = document.getElementById(item.id);
              section?.scrollIntoView({ behavior: 'smooth' });
              setActiveSection(item.id);
            }}
            className={`text-left w-full px-4 py-2 rounded-xl transition font-medium text-sm ${
              activeSection === item.id
                ? 'bg-cyan-100 text-cyan-800'
                : 'hover:bg-cyan-100 text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-8 space-y-10 overflow-y-auto">
        {/* AI Configuration */}
        <div id="ai" className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-cyan-800 mb-4">AI Configuration</h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Ollama Status</span>
              <span
                className={`px-2 py-1 text-xs rounded-full font-medium ${
                  ollamaAvailable
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {ollamaAvailable ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ollama URL</label>
              <input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                placeholder="http://localhost:11434"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="autoGenerate"
                type="checkbox"
                checked={autoGenerateNarrative}
                onChange={(e) => setAutoGenerateNarrative(e.target.checked)}
                className="w-4 h-4 accent-cyan-600"
              />
              <label htmlFor="autoGenerate" className="text-sm text-gray-600">
                Auto-generate narrative every 30 minutes
              </label>
            </div>
          </div>
        </div>

        {/* Tracking Configuration */}
        <div id="tracking" className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-cyan-800 mb-4">Tracking Configuration</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Interval (ms)
              </label>
              <input
                type="number"
                value={trackingInterval}
                onChange={(e) => setTrackingInterval(Number(e.target.value))}
                min={1000}
                max={10000}
                step={500}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                How often to check for active applications (1000–10000 ms)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-700 mb-2">Tracked Events</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>App switches</li>
                  <li>File edits</li>
                  <li>Terminal commands</li>
                  <li>VS Code actions</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-700 mb-2">Privacy</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>All data local</li>
                  <li>No sync</li>
                  <li>No telemetry</li>
                  <li>Full control</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Style */}
        <div id="style" className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-cyan-800 mb-4">Default Narrative Style</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
              <select
                value={narrativeStyle.tone}
                onChange={(e) =>
                  onStyleChange({ ...narrativeStyle, tone: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="gamified">Gamified</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <select
                value={narrativeStyle.format}
                onChange={(e) =>
                  onStyleChange({ ...narrativeStyle, format: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none"
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
        <div id="data" className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-cyan-800 mb-4">Data Management</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleExportSettings}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition"
              >
                Export Settings
              </button>
              <label className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 cursor-pointer transition">
                Import Settings
                <input type="file" accept=".json" onChange={handleImportSettings} className="hidden" />
              </label>
              <button
                onClick={onClearData}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                Clear All Data
              </button>
            </div>
            <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
              <h4 className="font-semibold text-yellow-700 mb-1">Data Storage</h4>
              <p className="text-sm text-gray-600">
                All data is stored in-memory during sessions. Export settings to persist across restarts.
              </p>
            </div>
          </div>
        </div>

        {/* About */}
        <div id="about" className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-cyan-800 mb-4">About Chronicle</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Chronicle</strong> is a local-first productivity assistant that tracks your activity
              and creates useful AI-powered narratives.
            </p>
            <p>
              Built with Electron, Vite, TailwindCSS, and Ollama. All data remains on your device.
            </p>
            <p className="text-xs text-gray-400">
              Version: 1.0.0<br />
              Developer: Kaleshi Coders<br />
              GitHub:{' '}
              <a
                href="https://github.com/officiallyutso/chronicle"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                https://github.com/officiallyutso/chronicle
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
