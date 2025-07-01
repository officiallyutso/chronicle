import React, { useState } from 'react';
import { ActivityEvent, ActivityType } from '../services/types';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getEventIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.APP_OPENED: return '';
      case ActivityType.APP_CLOSED: return '';
      case ActivityType.FILE_CHANGED: return '';
      case ActivityType.TERMINAL_COMMAND: return '';
      case ActivityType.BROWSER_SEARCH: return '';
      case ActivityType.VSCODE_ACTION: return '';
      case ActivityType.SYSTEM_ACTIVE: return '';
      case ActivityType.SYSTEM_IDLE: return '';
      default: return '';
    }
  };

  const getEventColor = (type: ActivityType) => {
    switch (type) {
      case ActivityType.APP_OPENED: return 'border-green-500 bg-green-500/10';
      case ActivityType.APP_CLOSED: return 'border-red-500 bg-red-500/10';
      case ActivityType.FILE_CHANGED: return 'border-blue-500 bg-blue-500/10';
      case ActivityType.TERMINAL_COMMAND: return 'border-purple-500 bg-purple-500/10';
      case ActivityType.BROWSER_SEARCH: return 'border-yellow-500 bg-yellow-500/10';
      case ActivityType.VSCODE_ACTION: return 'border-cyan-500 bg-cyan-500/10';
      case ActivityType.SYSTEM_ACTIVE: return 'border-gray-500 bg-gray-500/10';
      case ActivityType.SYSTEM_IDLE: return 'border-orange-500 bg-orange-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const formatEventData = (event: ActivityEvent) => {
    switch (event.type) {
      case ActivityType.APP_OPENED:
        return `Opened ${event.data.appName}${event.data.platform ? ` on ${event.data.platform}` : ''}`;
      case ActivityType.APP_CLOSED:
        return `Closed ${event.data.appName}${event.data.platform ? ` on ${event.data.platform}` : ''}`;
      case ActivityType.FILE_CHANGED:
        return `${event.data.action} ${event.data.fileName || event.data.fullPath}${event.data.directory ? ` in ${event.data.directory}` : ''}`;
      case ActivityType.TERMINAL_COMMAND:
        return `Executed: ${event.data.command}${event.data.shell ? ` (${event.data.shell})` : ''}`;
      case ActivityType.BROWSER_SEARCH:
        if (event.data.query) {
          return `Searched: ${event.data.query}`;
        } else if (event.data.url) {
          return `${event.data.action || 'Visited'}: ${event.data.url}${event.data.title ? ` - ${event.data.title}` : ''}`;
        }
        return `Browser: ${event.data.action}`;
      case ActivityType.VSCODE_ACTION:
        return `VS Code: ${event.data.action} → ${event.data.file}${event.data.project ? ` (${event.data.project})` : ''}`;
      case ActivityType.SYSTEM_ACTIVE:
        if (event.data.action === 'events_cleared') {
          return 'Events cleared by user';
        }
        if (event.data.uptime !== undefined) {
          return `System: uptime ${Math.floor(event.data.uptime / 60)}min, ${event.data.cpuCount} CPUs, ${(event.data.freeMemory / 1e9).toFixed(1)}GB free`;
        }
        return `System activity detected`;
      case ActivityType.SYSTEM_IDLE:
        return `System went idle${event.data.idleTime ? ` (${Math.floor(event.data.idleTime)}s)` : ''}`;
      default:
        // Handle any custom events or fallback
        if (typeof event.data === 'object' && event.data !== null) {
          const keys = Object.keys(event.data);
          if (keys.length > 0) {
            return keys.map(key => `${key}: ${event.data[key]}`).join(', ');
          }
        }
        return JSON.stringify(event.data);
    }
  };

  const filteredEvents = events
    .filter(event => {
      if (filter === 'all') return true;
      return event.type === filter;
    })
    .filter(event => {
      if (!searchTerm) return true;
      const eventText = formatEventData(event).toLowerCase();
      return eventText.includes(searchTerm.toLowerCase());
    })
    .reverse(); // Show newest first

  const eventTypes = Array.from(new Set(events.map(e => e.type)));

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Activity Feed</h2>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Events</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Event Count */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm">
            Showing {filteredEvents.length} of {events.length} events
          </p>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className={`bg-gray-800 rounded-lg p-4 border ${getEventColor(event.type)} transition-all hover:bg-gray-750`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{getEventIcon(event.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-white">
                      {event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <time className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">
                    {formatEventData(event)}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Category: {event.category}</span>
                    <span>ID: {event.id.split('_')[0]}...{event.id.slice(-6)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-lg font-medium text-white mb-2">No Activities Found</h3>
            <p className="text-gray-400">
              {events.length === 0 
                ? "Start tracking to see your activities here"
                : "Try adjusting your search or filter criteria"
              }
            </p>
          </div>
        )}
      </div>

      {/* Load More Button (for future pagination) */}
      {filteredEvents.length > 50 && (
        <div className="text-center">
          <button className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
            Load More Events
          </button>
        </div>
      )}
    </div>
  );
};