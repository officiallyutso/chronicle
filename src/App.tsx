import React, { useState, useEffect } from 'react';
import { ActivityEvent, ActivityType } from './services/types';
import { AgentApiService } from './services/agentApiService';
import { ApiStats } from './services/apiService';
import { OllamaService, NarrativeStyle } from './services/ollamaService';
import { Dashboard } from './components/Dashboard';
import { ActivityFeed } from './components/ActivityFeed';
import { NarrativePanel } from './components/NarrativePanel';
import { SettingsPanel } from './components/SettingsPanel';

const App: React.FC = () => {
  const [agentApiService] = useState(() => new AgentApiService());
  const [ollamaService] = useState(() => new OllamaService());
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<ApiStats>({
    total: 0,
    applications: 0,
    filesModified: 0,
    terminalCommands: 0,
    sessionDuration: 0,
    isTracking: false
  });
  const [currentNarrative, setCurrentNarrative] = useState<string>('');
  const [achievements, setAchievements] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'narrative' | 'settings'>('dashboard');
  const [narrativeStyle, setNarrativeStyle] = useState<NarrativeStyle>({ tone: 'gamified', format: 'story' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [isQuerying, setIsQuerying] = useState(false);


  useEffect(() => {
    // Check if backend is available
    const checkBackend = async () => {
      const healthy = await agentApiService.checkHealth();
      setBackendConnected(healthy);
      if (!healthy) {
        console.warn('Chronicle backend is not available. Make sure the server is running on port 3001.');
      }
    };

    // Check if Ollama is available
    const checkOllama = async () => {
      const available = await ollamaService.isOllamaAvailable();
      setOllamaAvailable(available);
    };

    // Load initial data
    const loadInitialData = async () => {
      const initialEvents = await agentApiService.getEvents({ limit: 100 });
      setEvents(initialEvents);
      
      const initialStats = await agentApiService.getStats();
      setStats(initialStats);
    };

    // Set up real-time event listener
    agentApiService.onEvent((event) => {
      setEvents(prev => [...prev, event]);
      // Update stats when new events come in
      refreshStats();
    });

    const refreshStats = async () => {
      const newStats = await agentApiService.getStats();
      setStats(newStats);
    };

    // Initialize everything
    checkBackend();
    checkOllama();
    loadInitialData();

    // Cleanup on unmount
    return () => {
      agentApiService.disconnect();
    };
  }, [agentApiService, ollamaService]);

  const handleStartTracking = async () => {
    const success = await agentApiService.startTracking();
    if (success) {
      const newStats = await agentApiService.getStats();
      setStats(newStats);
    }
  };

  const handleStopTracking = async () => {
    const success = await agentApiService.stopTracking();
    if (success) {
      const newStats = await agentApiService.getStats();
      setStats(newStats);
    }
  };

  const handleGenerateNarrative = async () => {
    if (events.length === 0) return;
    setIsGenerating(true);
    try {
      const narrative = await agentApiService.generateIntelligentNarrative(narrativeStyle);
      setCurrentNarrative(narrative);
      const newAchievements = await ollamaService.generateAchievements(events);
      setAchievements(newAchievements);
    } catch (error) {
      console.error('Error generating narrative:', error);
    } finally {
      setIsGenerating(false);
    }
  };


  const handleClearData = async () => {
    const success = await agentApiService.clearEvents();
    if (success) {
      setEvents([]);
      setCurrentNarrative('');
      setAchievements([]);
      const newStats = await agentApiService.getStats();
      setStats(newStats);
    }
  };

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
              <div className={`w-2 h-2 rounded-full ${stats.isTracking ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">
                {stats.isTracking ? 'Tracking Active' : 'Tracking Inactive'}
              </span>
            </div>
            {!backendConnected && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm text-red-400">Backend Offline</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {ollamaAvailable ? (
                <span className="text-green-400">AI Agent Connected</span>
              ) : (
                <span className="text-yellow-400">AI Agent Offline</span>
              )}
            </div>
            <button
              onClick={stats.isTracking ? handleStopTracking : handleStartTracking}
              disabled={!backendConnected}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !backendConnected
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : stats.isTracking 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {stats.isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </button>
          </div>
        </div>
      </header>

      {/* Backend Connection Warning */}
      {!backendConnected && (
        <div className="bg-red-600/20 border-l-4 border-red-500 p-4 mx-6 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-300">
                Chronicle backend is not running. Please start the backend server on port 3001 to enable real system tracking.
              </p>
            </div>
          </div>
        </div>
      )}

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