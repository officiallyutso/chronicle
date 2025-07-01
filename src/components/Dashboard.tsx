import React from 'react';
import { ActivityEvent, ActivityType } from '../services/systemTracker';

interface DashboardProps {
  stats: {
    total: number;
    applications: number;
    filesModified: number;
    terminalCommands: number;
    sessionDuration: number;
  };
  events: ActivityEvent[];
  achievements: string[];
  onGenerateNarrative: () => void;
  isGenerating: boolean;
  onClearData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  events,
  achievements,
  onGenerateNarrative,
  isGenerating,
  onClearData
}) => {
  const recentEvents = events.slice(-5);
  
  const getEventIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.APP_OPENED: return '';
      case ActivityType.FILE_CHANGED: return '';
      case ActivityType.TERMINAL_COMMAND: return '';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Events</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="text-3xl"></div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Applications</p>
              <p className="text-2xl font-bold text-white">{stats.applications}</p>
            </div>
            <div className="text-3xl"></div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Files Modified</p>
              <p className="text-2xl font-bold text-white">{stats.filesModified}</p>
            </div>
            <div className="text-3xl"></div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Session Time</p>
              <p className="text-2xl font-bold text-white">{stats.sessionDuration}m</p>
            </div>
            <div className="text-3xl"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <div key={event.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                  <span className="text-xl">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {event.type === ActivityType.APP_OPENED && `Opened ${event.data.appName}`}
                      {event.type === ActivityType.FILE_CHANGED && 
                        `${event.data.action} ${event.data.fileName}`}
                      {event.type === ActivityType.TERMINAL_COMMAND && 
                        `Command: ${event.data.command}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Achievements</h3>
          <div className="space-y-2">
            {achievements.length > 0 ? (
              achievements.map((achievement, index) => (
                <div key={index} className="p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30">
                  <p className="text-sm text-white">{achievement}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">Start tracking to unlock achievements!</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onGenerateNarrative}
          disabled={events.length === 0 || isGenerating}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 transition-all"
        >
          {isGenerating ? (
            <span className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
              <span>Generating...</span>
            </span>
          ) : (
            'Generate AI Narrative'
          )}
        </button>
        
        <button
          onClick={onClearData}
          disabled={events.length === 0}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
        >
          Clear Data
        </button>
      </div>
    </div>
  );
};