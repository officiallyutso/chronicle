// Popup script for Chronicle Browser Tracker
const BACKEND_URL = 'http://localhost:3001';

let isTrackingEnabled = true;

document.addEventListener('DOMContentLoaded', async function() {
  await initializeTrackingStatus();
  await updateUI();
  setupEventListeners();
});

async function initializeTrackingStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TRACKING_STATUS' });
    isTrackingEnabled = response.trackingEnabled;
    updateTrackingToggle();
  } catch (error) {
    console.error('Error getting tracking status:', error);
  }
}

function updateTrackingToggle() {
  const toggle = document.getElementById('trackingToggle');
  const statusDot = document.getElementById('statusDot');
  const currentTabSection = document.getElementById('currentTabSection');
  const statsSection = document.getElementById('statsSection');
  
  if (isTrackingEnabled) {
    toggle.classList.add('active');
    statusDot.classList.remove('disabled');
    currentTabSection.classList.remove('disabled-overlay');
    statsSection.classList.remove('disabled-overlay');
  } else {
    toggle.classList.remove('active');
    statusDot.classList.add('disabled');
    currentTabSection.classList.add('disabled-overlay');
    statsSection.classList.add('disabled-overlay');
  }
}

async function updateUI() {
  await Promise.all([
    checkBackendConnection(),
    updateCurrentTabInfo(),
    updateSessionStats()
  ]);
}

async function checkBackendConnection() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusDetails = document.getElementById('statusDetails');

  if (!isTrackingEnabled) {
    statusText.textContent = 'Tracking Disabled';
    statusDetails.textContent = 'Enable tracking to monitor browser activity';
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      statusDot.classList.remove('error');
      statusText.textContent = 'Connected to Chronicle Backend';
      statusDetails.textContent = `${data.eventsCount} events tracked, monitoring ${data.isTracking ? 'active' : 'inactive'}`;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    statusDot.classList.add('error');
    statusText.textContent = 'Backend Connection Failed';
    statusDetails.textContent = 'Make sure Chronicle backend is running on port 3001';
  }
}

async function updateCurrentTabInfo() {
  const currentTabInfo = document.getElementById('currentTabInfo');
  
  if (!isTrackingEnabled) {
    currentTabInfo.textContent = 'Tracking disabled';
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      const title = tab.title || domain;
      
      currentTabInfo.innerHTML = `
        <strong>${title}</strong><br>
        <span style="opacity: 0.7;">${domain}</span>
      `;
    } else {
      currentTabInfo.textContent = 'Chrome internal page';
    }
  } catch (error) {
    currentTabInfo.textContent = 'Unable to access current tab';
  }
}

async function updateSessionStats() {
  const eventsToday = document.getElementById('eventsToday');
  const websitesVisited = document.getElementById('websitesVisited');
  const searchesMade = document.getElementById('searchesMade');
  const activeTime = document.getElementById('activeTime');

  if (!isTrackingEnabled) {
    eventsToday.textContent = '--';
    websitesVisited.textContent = '--';
    searchesMade.textContent = '--';
    activeTime.textContent = '--';
    return;
  }

  try {
    // Get today's events
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const response = await fetch(
      `${BACKEND_URL}/api/events?startTime=${startOfDay.getTime()}&endTime=${Date.now()}`
    );
    
    if (response.ok) {
      const events = await response.json();
      
      // Filter browser events
      const browserEvents = events.filter(event => 
        event.type === 'browser_search' || event.category === 'browser'
      );
      
      eventsToday.textContent = browserEvents.length;
      
      // Count unique websites
      const uniqueWebsites = new Set();
      const searches = [];
      
      browserEvents.forEach(event => {
        if (event.data.domain) {
          uniqueWebsites.add(event.data.domain);
        }
        if (event.data.action === 'search_performed' || event.data.searchQuery) {
          searches.push(event);
        }
      });
      
      websitesVisited.textContent = uniqueWebsites.size;
      searchesMade.textContent = searches.length;
      
      // Calculate active time (simplified)
      if (browserEvents.length > 0) {
        const firstEvent = Math.min(...browserEvents.map(e => e.timestamp));
        const lastEvent = Math.max(...browserEvents.map(e => e.timestamp));
        const activeMinutes = Math.round((lastEvent - firstEvent) / (1000 * 60));
        activeTime.textContent = `${activeMinutes}m`;
      } else {
        activeTime.textContent = '0m';
      }
    } else {
      throw new Error('Failed to fetch stats');
    }
  } catch (error) {
    eventsToday.textContent = '--';
    websitesVisited.textContent = '--';
    searchesMade.textContent = '--';
    activeTime.textContent = '--';
  }
}

async function toggleTracking() {
  isTrackingEnabled = !isTrackingEnabled;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TOGGLE_TRACKING',
      enabled: isTrackingEnabled
    });
    
    if (response.success) {
      updateTrackingToggle();
      await updateUI();
    } else {
      // Revert toggle if failed
      isTrackingEnabled = !isTrackingEnabled;
      updateTrackingToggle();
    }
  } catch (error) {
    console.error('Error toggling tracking:', error);
    // Revert toggle if failed
    isTrackingEnabled = !isTrackingEnabled;
    updateTrackingToggle();
  }
}

function setupEventListeners() {
  // Tracking toggle
  document.getElementById('trackingToggle').addEventListener('click', toggleTracking);

  // Dashboard button
  document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: `${BACKEND_URL}/dashboard` });
    window.close();
  });

  // Clear data button
  document.getElementById('clearData').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all tracked data?')) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/events`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await updateSessionStats();
        } else {
          alert('Failed to clear data');
        }
      } catch (error) {
        alert('Error clearing data: ' + error.message);
      }
    }
  });

  // Refresh data every 10 seconds while popup is open
  setInterval(() => {
    if (isTrackingEnabled) {
      updateUI();
    }
  }, 10000);
}