import React, { useState, useEffect } from 'react';
import { SystemTracker, ActivityEvent, ActivityType } from './services/systemTracker';
import { OllamaService, NarrativeStyle } from './services/ollamaService';
import { Dashboard } from './components/Dashboard';
import { ActivityFeed } from './components/ActivityFeed';
import { NarrativePanel } from './components/NarrativePanel';
import { SettingsPanel } from './components/SettingsPanel';

const App: React.FC = () => {
  const [tracker] = useState(() => new SystemTracker());
  const [ollamaService] = useState(() => new OllamaService());
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentNarrative, setCurrentNarrative] = useState<string>('');
  const [achievements, setAchievements] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'narrative' | 'settings'>('dashboard');
  const [narrativeStyle, setNarrativeStyle] = useState<NarrativeStyle>({ tone: 'gamified', format: 'story' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await ollamaService.isOllamaAvailable();
      setOllamaAvailable(available);
    })();

    tracker.onEvent((event) => {
      setEvents(prev => [...prev, event]);
    });

    return () => {
      tracker.stopTracking();
    };
  }, []);


  const handleStartTracking = () => {
    tracker.startTracking();
    setIsTracking(true);
  };

  const handleStopTracking = () => {
    tracker.stopTracking();
    setIsTracking(false);
  };

  const handleGenerateNarrative = async () => {
    if (events.length === 0) return;
    
    setIsGenerating(true);
    try {
      const narrative = await ollamaService.generateNarrative(events, narrativeStyle);
      setCurrentNarrative(narrative);
      
      const newAchievements = await ollamaService.generateAchievements(events);
      setAchievements(newAchievements);
    } catch (error) {
      console.error('Error generating narrative:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearData = () => {
    setEvents([]);
    setCurrentNarrative('');
    setAchievements([]);
  };

  const getEventStats = () => {
    const stats = {
      total: events.length,
      applications: new Set(events.filter(e => e.type === ActivityType.APP_OPENED).map(e => e.data.appName)).size,
      filesModified: events.filter(e => e.type === ActivityType.FILE_CHANGED).length,
      terminalCommands: events.filter(e => e.type === ActivityType.TERMINAL_COMMAND).length,
      sessionDuration: events.length > 0 ? 
        Math.round((events[events.length - 1].timestamp - events[0].timestamp) / 1000 / 60) : 0
    };
    return stats;
  };

  const stats = getEventStats();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Chronicle
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">
                {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {ollamaAvailable ? (
                <span className="text-green-400">Ollama Connected</span>
              ) : (
                <span className="text-yellow-400">Ollama Offline</span>
              )}
            </div>
            <button
              onClick={isTracking ? handleStopTracking : handleStartTracking}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isTracking 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-3">
          <div className="flex space-x-6">
            {(['dashboard', 'activity', 'narrative', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded-lg font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            events={events}
            achievements={achievements}
            onGenerateNarrative={handleGenerateNarrative}
            isGenerating={isGenerating}
            onClearData={handleClearData}
          />
        )}
        
        {activeTab === 'activity' && (
          <ActivityFeed events={events} />
        )}
        
        {activeTab === 'narrative' && (
          <NarrativePanel
            narrative={currentNarrative}
            achievements={achievements}
            onGenerate={handleGenerateNarrative}
            isGenerating={isGenerating}
            narrativeStyle={narrativeStyle}
            onStyleChange={setNarrativeStyle}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsPanel
            narrativeStyle={narrativeStyle}
            onStyleChange={setNarrativeStyle}
            ollamaAvailable={ollamaAvailable}
            onClearData={handleClearData}
          />
        )}
      </main>
    </div>
  );
};

export default App;