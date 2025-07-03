// Background service worker for Chronicle Browser Tracker
const BACKEND_URL = 'http://localhost:3001';
const SEARCH_ENGINES = {
  'google.com': 'Google',
  'bing.com': 'Bing',
  'duckduckgo.com': 'DuckDuckGo',
  'yahoo.com': 'Yahoo',
  'yandex.com': 'Yandex',
  'baidu.com': 'Baidu'
};

let activeTabsData = new Map();
let searchQueries = new Map();
let isTrackingEnabled = true;

// Initialize tracking state from storage
chrome.storage.local.get(['trackingEnabled'], (result) => {
  isTrackingEnabled = result.trackingEnabled !== false; // Default to true
});

// Helper function to send events to backend
async function sendEventToBackend(eventData) {
  // Check if tracking is enabled
  if (!isTrackingEnabled) {
    return; // Skip sending event if tracking is disabled
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/extensions/browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      console.error('Failed to send event to backend:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending event to backend:', error);
  }
}

// Helper function to detect search engines and extract query
function extractSearchQuery(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    for (const [domain, engineName] of Object.entries(SEARCH_ENGINES)) {
      if (hostname.includes(domain)) {
        // Extract search query from URL parameters
        const searchParams = urlObj.searchParams;
        const query = searchParams.get('q') || 
                     searchParams.get('query') || 
                     searchParams.get('p') || 
                     searchParams.get('search');
        
        if (query && query.trim()) {
          return {
            engine: engineName,
            query: query.trim(),
            isSearch: true
          };
        }
        return {
          engine: engineName,
          query: null,
          isSearch: false
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting search query:', error);
    return null;
  }
}

// Helper function to get clean domain name
function getCleanDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return url;
  }
}

// Helper function to determine if URL is from search result
function isFromSearchEngine(url, referrer) {
  if (!referrer) return false;
  
  try {
    const referrerObj = new URL(referrer);
    const referrerDomain = referrerObj.hostname.toLowerCase();
    
    return Object.keys(SEARCH_ENGINES).some(domain => 
      referrerDomain.includes(domain)
    );
  } catch (error) {
    return false;
  }
}

// Helper function to get display URL (show query for Google searches, full URL for others)
function getDisplayUrl(url, searchInfo) {
  if (searchInfo && searchInfo.isSearch && searchInfo.engine === 'Google' && searchInfo.query) {
    return `Search: ${searchInfo.query}`;
  }
  return url;
}

// Track tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      const domain = getCleanDomain(tab.url);
      const searchInfo = extractSearchQuery(tab.url);
      const displayUrl = getDisplayUrl(tab.url, searchInfo);
      
      await sendEventToBackend({
        url: displayUrl,
        title: tab.title || domain,
        action: 'tab_focused',
        domain: domain,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

// Track tab updates (navigation, page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when the page has finished loading
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip chrome internal pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    try {
      const domain = getCleanDomain(tab.url);
      const searchInfo = extractSearchQuery(tab.url);
      const displayUrl = getDisplayUrl(tab.url, searchInfo);
      
      // Store tab data for later reference
      activeTabsData.set(tabId, {
        url: tab.url,
        title: tab.title || domain,
        domain: domain,
        timestamp: Date.now()
      });
      
      // Handle search engine visits
      if (searchInfo) {
        if (searchInfo.isSearch && searchInfo.query) {
          // This is a search query
          searchQueries.set(tabId, {
            engine: searchInfo.engine,
            query: searchInfo.query,
            timestamp: Date.now()
          });
          
          await sendEventToBackend({
            url: displayUrl,
            title: `Search: ${searchInfo.query}`,
            action: 'search_performed',
            searchEngine: searchInfo.engine,
            searchQuery: searchInfo.query,
            domain: domain,
            timestamp: Date.now()
          });
        } else {
          // Just visiting the search engine homepage
          await sendEventToBackend({
            url: displayUrl,
            title: tab.title || domain,
            action: 'website_opened',
            domain: domain,
            searchEngine: searchInfo?.engine,
            searchQuery: searchInfo?.query,
            timestamp: Date.now()
          });
        }
      } else {
        // Regular website visit
        let action = 'website_opened';
        let additionalData = {};
        
        // Check if this might be from a search result
        if (tab.pendingUrl || tab.url !== tab.pendingUrl) {
          // Try to get referrer information from history
          try {
            const historyItems = await chrome.history.search({
              text: tab.url,
              maxResults: 1
            });
            
            if (historyItems.length > 0) {
              // This is a simplified check - in practice, determining if a visit
              // came from search results is complex and may require content script data
              additionalData.fromSearch = false;
            }
          } catch (historyError) {
            // History API might not be available
          }
        }
        
        await sendEventToBackend({
          url: displayUrl,
          title: tab.title || domain,
          action: action,
          domain: domain,
          timestamp: Date.now(),
          ...additionalData
        });
      }
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }
});

// Track tab removal (closing tabs)
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const tabData = activeTabsData.get(tabId);
  
  if (tabData) {
    try {
      await sendEventToBackend({
        url: tabData.url,
        title: tabData.title,
        action: 'website_closed',
        domain: tabData.domain,
        sessionDuration: Date.now() - tabData.timestamp,
        timestamp: Date.now()
      });
      
      // Clean up stored data
      activeTabsData.delete(tabId);
      searchQueries.delete(tabId);
    } catch (error) {
      console.error('Error handling tab removal:', error);
    }
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'SEARCH_RESULT_CLICK') {
    try {
      await sendEventToBackend({
        url: request.url,
        title: request.title,
        action: 'search_result_clicked',
        searchEngine: request.searchEngine,
        searchQuery: request.searchQuery,
        resultPosition: request.position,
        domain: getCleanDomain(request.url),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling search result click:', error);
    }
  } else if (request.type === 'PAGE_VISIBILITY_CHANGE') {
    try {
      const searchInfo = extractSearchQuery(request.url);
      const displayUrl = getDisplayUrl(request.url, searchInfo);
      
      await sendEventToBackend({
        url: displayUrl,
        title: request.title,
        action: request.visible ? 'page_focused' : 'page_unfocused',
        domain: getCleanDomain(request.url),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling page visibility change:', error);
    }
  } else if (request.type === 'TOGGLE_TRACKING') {
    // Handle tracking toggle from popup
    isTrackingEnabled = request.enabled;
    chrome.storage.local.set({ trackingEnabled: isTrackingEnabled });
    
    // Send tracking status change event
    await sendEventToBackend({
      url: 'chrome://extension-tracking-toggle',
      title: `Tracking ${isTrackingEnabled ? 'Enabled' : 'Disabled'}`,
      action: 'tracking_toggled',
      trackingEnabled: isTrackingEnabled,
      timestamp: Date.now()
    });
    
    sendResponse({ success: true, trackingEnabled: isTrackingEnabled });
    return true; // Keep message channel open for async response
  } else if (request.type === 'GET_TRACKING_STATUS') {
    // Handle tracking status request from popup
    sendResponse({ trackingEnabled: isTrackingEnabled });
    return true;
  }
  
  sendResponse({ success: true });
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Chronicle Browser Tracker started');
  
  // Send startup event
  try {
    await sendEventToBackend({
      url: 'chrome://extension-startup',
      title: 'Browser Extension Started',
      action: 'extension_started',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error sending startup event:', error);
  }
});

// Handle extension install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Chronicle Browser Tracker installed');
    
    try {
      await sendEventToBackend({
        url: 'chrome://extension-install',
        title: 'Browser Extension Installed',
        action: 'extension_installed',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error sending install event:', error);
    }
  }
});

// Cleanup old data periodically
setInterval(() => {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 10 * 60 * 1000; // 10 minutes
  
  // Clean up old tab data
  for (const [tabId, data] of activeTabsData.entries()) {
    if (now - data.timestamp > CLEANUP_THRESHOLD) {
      activeTabsData.delete(tabId);
    }
  }
  
  // Clean up old search queries
  for (const [tabId, data] of searchQueries.entries()) {
    if (now - data.timestamp > CLEANUP_THRESHOLD) {
      searchQueries.delete(tabId);
    }
  }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes