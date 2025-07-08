import React, { useState, useMemo, useEffect } from 'react';
import { ActivityEvent, ActivityType } from '../services/types';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50);

  const sortedEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    const uniqueEvents = events.filter((event, index, self) =>
      index === self.findIndex(e => e.id === event.id)
    );
    return uniqueEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events]);

  useEffect(() => {
    if (events.length > 0) {
      setDisplayLimit(Math.min(50, events.length));
    }
  }, [events.length]);

  const getEventColor = (type: ActivityType) => {
    switch (type) {
      case ActivityType.APP_OPENED: return 'border-green-400 bg-green-50';
      case ActivityType.APP_CLOSED: return 'border-red-400 bg-red-50';
      case ActivityType.FILE_CHANGED: return 'border-blue-400 bg-blue-50';
      case ActivityType.TERMINAL_COMMAND: return 'border-purple-400 bg-purple-50';
      case ActivityType.BROWSER_SEARCH: return 'border-yellow-400 bg-yellow-50';
      case ActivityType.VSCODE_ACTION: return 'border-cyan-400 bg-cyan-50';
      case ActivityType.SYSTEM_ACTIVE: return 'border-gray-400 bg-gray-50';
      case ActivityType.SYSTEM_IDLE: return 'border-orange-400 bg-orange-50';
      default: return 'border-gray-400 bg-gray-50';
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
        if (typeof event.data === 'object' && event.data !== null) {
          const keys = Object.keys(event.data);
          if (keys.length > 0) {
            return keys.map(key => `${key}: ${event.data[key]}`).join(', ');
          }
        }
        return JSON.stringify(event.data);
    }
  };

  const filteredAndLimitedEvents = useMemo(() => {
    let filtered = sortedEvents;
    if (filter !== 'all') {
      filtered = filtered.filter(event => event.type === filter);
    }
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event => {
        const eventText = formatEventData(event).toLowerCase();
        const eventType = event.type.replace(/_/g, ' ').toLowerCase();
        const eventCategory = event.category.toLowerCase();
        return eventText.includes(searchLower) || eventType.includes(searchLower) || eventCategory.includes(searchLower);
      });
    }
    return filtered.slice(0, displayLimit);
  }, [sortedEvents, filter, searchTerm, displayLimit]);

  const eventTypes = useMemo(() => {
    return Array.from(new Set(sortedEvents.map(e => e.type)));
  }, [sortedEvents]);

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 50);
  };

  const totalFilteredCount = useMemo(() => {
    let filtered = sortedEvents;
    if (filter !== 'all') {
      filtered = filtered.filter(event => event.type === filter);
    }
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event => {
        const eventText = formatEventData(event).toLowerCase();
        const eventType = event.type.replace(/_/g, ' ').toLowerCase();
        const eventCategory = event.category.toLowerCase();
        return eventText.includes(searchLower) || eventType.includes(searchLower) || eventCategory.includes(searchLower);
      });
    }
    return filtered.length;
  }, [sortedEvents, filter, searchTerm]);

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
        <h2 className="text-xl font-bold text-cyan-700 mb-4">Activity Feed</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-xl text-gray-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Events</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Showing {filteredAndLimitedEvents.length} of {totalFilteredCount} filtered events ({sortedEvents.length} total)
        </p>
      </div>

      {/* Activity List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndLimitedEvents.length > 0 ? (
          filteredAndLimitedEvents.map((event) => (
            <div
              key={event.id}
              className={`rounded-3xl p-6 border-l-[6px] ${getEventColor(event.type)} shadow-lg bg-white hover:shadow-xl transition-all`}
            >
              <h3 className="text-base font-semibold text-gray-800 mb-1">
                {event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <time className="text-xs text-gray-500 block mb-2">
                {new Date(event.timestamp).toLocaleString()}
              </time>
              <p className="text-sm text-gray-700 mb-2">
                {formatEventData(event)}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Category: {event.category}</span>
                <span>ID: {event.id.split('_')[0]}...{event.id.slice(-6)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-4xl mb-4 text-gray-400">📭</div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Activities Found</h3>
            <p className="text-gray-400">
              {sortedEvents.length === 0
                ? "Start tracking to see your activities here"
                : "Try adjusting your search or filter criteria"}
            </p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {totalFilteredCount > filteredAndLimitedEvents.length && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition"
          >
            Load More Events ({totalFilteredCount - filteredAndLimitedEvents.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
