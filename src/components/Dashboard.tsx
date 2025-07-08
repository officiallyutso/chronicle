import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ActivityEvent, ActivityType } from '../services/systemTracker';

// Image imports
import HeroImage from '../assets/HeroImage.png';
import RecentActivityImg from '../assets/RecentActivity.jpg';
import AchievementImg from '../assets/Acheivement.jpg';

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
  onClearData,
}) => {
  const recentEvents = events.slice(-5);

  const getEventLabel = (type: ActivityType, data: any) => {
    switch (type) {
      case ActivityType.APP_OPENED:
        return `Opened ${data.appName}`;
      case ActivityType.FILE_CHANGED:
        return `${data.action} ${data.fileName}`;
      case ActivityType.TERMINAL_COMMAND:
        return `Command: ${data.command}`;
      default:
        return 'Unknown activity';
    }
  };

  const [animatedStats, setAnimatedStats] = useState(stats);
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedStats((prev) => {
        const next = { ...prev };
        for (let key in stats) {
          const k = key as keyof typeof stats;
          if (next[k] < stats[k]) {
            next[k]++;
          }
        }
        return next;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [stats]);

  return (
    <div className="bg-white text-gray-800 font-sans min-h-screen">
      {/* Hero Image with Gradient Overlay */}
      <div className="relative w-full h-[55vh] overflow-hidden">
        <img
          src={HeroImage}
          alt="Hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-800/70 to-transparent z-0"></div>
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl text-white font-extrabold tracking-tight drop-shadow-xl font-serif"
          >
            Chronicle: Track Your Journey
          </motion.h1>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="relative z-10 -mt-20 max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-0">
        {[{ label: 'Total Events', value: animatedStats.total },
          { label: 'Applications', value: animatedStats.applications },
          { label: 'Files Modified', value: animatedStats.filesModified },
          { label: 'Session Time', value: `${animatedStats.sessionDuration}m` },
        ].map((item, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white p-6 flex flex-col justify-center items-center text-center shadow-lg"
          >
            <div className="text-sm text-white/80 mb-1 uppercase tracking-wider">{item.label}</div>
            <div className="text-3xl font-bold">{item.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-10 py-12">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-md p-6 flex flex-col md:flex-row gap-6 hover:shadow-lg transition"
        >
          <img
            src={RecentActivityImg}
            alt="Recent Activity"
            className="w-full md:w-1/3 h-48 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-4 text-cyan-700">Recent Activity</h3>
            {recentEvents.length > 0 ? (
              <ol className="space-y-4 relative">
                {recentEvents.map((event) => (
                  <li key={event.id} className="pl-8 relative">
                    <span className="absolute left-0 top-1 w-4 h-4 bg-cyan-500 rounded-full"></span>
                    <div className="text-sm">
                      <p className="font-medium text-gray-800">{getEventLabel(event.type, event.data)}</p>
                      <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-500 text-sm">No recent activity yet.</p>
            )}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl shadow-md p-6 flex flex-col md:flex-row-reverse gap-6 hover:shadow-lg transition"
        >
          <img
            src={AchievementImg}
            alt="Achievements"
            className="w-full md:w-1/3 h-48 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-4 text-blue-700">Achievements</h3>
            {achievements.length > 0 ? (
              <ul className="space-y-2">
                {achievements.map((achievement, index) => (
                  <li
                    key={index}
                    className="text-sm bg-blue-50 border border-blue-200 p-3 rounded-md hover:bg-blue-100 transition"
                  >
                    {achievement}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Start tracking to unlock achievements.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pb-16">
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          onClick={onGenerateNarrative}
          disabled={events.length === 0 || isGenerating}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg text-lg font-medium"
        >
          {isGenerating ? 'Generating...' : 'Generate AI Narrative'}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          onClick={onClearData}
          disabled={events.length === 0}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-600 hover:to-red-600 transition-all shadow-lg text-lg font-medium"
        >
          Clear Data
        </motion.button>
      </div>
    </div>
  );
};
