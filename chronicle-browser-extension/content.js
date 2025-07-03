// Content script for Chronicle Browser Tracker
// This script runs on every page to track user interactions

(function() {
  'use strict';
  
  let pageStartTime = Date.now();
  let isPageVisible = !document.hidden;
  let searchEngine = null;
  let currentSearchQuery = null;
  
  // Detect if we're on a search engine
  function detectSearchEngine() {
    const hostname = window.location.hostname.toLowerCase();
    const searchEngines = {
      'google.com': 'Google',
      'bing.com': 'Bing',
      'duckduckgo.com': 'DuckDuckGo',
      'yahoo.com': 'Yahoo',
      'yandex.com': 'Yandex',
      'baidu.com': 'Baidu'
    };
    
    for (const [domain, name] of Object.entries(searchEngines)) {
      if (hostname.includes(domain)) {
        return name;
      }
    }
    return null;
  }
  
  // Extract search query from current URL
  function extractSearchQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q') || 
           urlParams.get('query') || 
           urlParams.get('p') || 
           urlParams.get('search') || 
           null;
  }
  
  // Track clicks on search result links
  function trackSearchResultClicks() {
    if (!searchEngine) return;
    
    // Define search result selectors for different search engines
    const searchResultSelectors = {
      'Google': 'a[href]:not([href^="#"]):not([href^="javascript:"]) h3, a[href]:not([href^="#"]):not([href^="javascript:"]) [role="heading"]',
      'Bing': '.b_algo h2 a, .b_title a',
      'DuckDuckGo': '.result__title a, .result__a',
      'Yahoo': '.dd.algo h3 a, .compTitle a',
      'Yandex': '.organic__title a, .serp-item__title a',
      'Baidu': '.result h3 a, .c-title a'
    };
    
    const selector = searchResultSelectors[searchEngine];
    if (!selector) return;
    
    // Add click listeners to search result links
    document.addEventListener('click', function(event) {
      const target = event.target.closest('a[href]');
      if (!target) return;
      
      // Check if the clicked element matches our search result selectors
      const resultElement = target.closest(selector.split(',')[0].split(' ')[0]) || 
                           target.matches(selector) ||
                           target.querySelector(selector);
      
      if (resultElement || target.matches(selector)) {
        // Get the position of the result (approximate)
        const allResults = document.querySelectorAll(selector);
        let position = -1;
        
        for (let i = 0; i < allResults.length; i++) {
          if (allResults[i] === target || allResults[i].contains(target) || target.contains(allResults[i])) {
            position = i + 1;
            break;
          }
        }
        
        // Send message to background script
        chrome.runtime.sendMessage({
          type: 'SEARCH_RESULT_CLICK',
          url: target.href,
          title: target.textContent.trim() || target.getAttribute('title') || 'Unknown',
          searchEngine: searchEngine,
          searchQuery: currentSearchQuery,
          position: position
        });
      }
    }, true); // Use capture phase to catch clicks early
  }
  
  // Track page visibility changes
  function trackPageVisibility() {
    document.addEventListener('visibilitychange', function() {
      const visible = !document.hidden;
      if (visible !== isPageVisible) {
        isPageVisible = visible;
        
        chrome.runtime.sendMessage({
          type: 'PAGE_VISIBILITY_CHANGE',
          url: window.location.href,
          title: document.title,
          visible: visible
        });
      }
    });
  }
  
  // Track scroll behavior (for engagement metrics)
  function trackScrollBehavior() {
    let scrollTimeout;
    let maxScrollDepth = 0;
    
    window.addEventListener('scroll', function() {
      const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
      }
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // Could send scroll engagement data if needed
        // For now, we'll just store it locally
      }, 1000);
    });
    
    // Send scroll data when page is unloaded
    window.addEventListener('beforeunload', function() {
      if (maxScrollDepth > 25) { // Only send if user scrolled significantly
        chrome.runtime.sendMessage({
          type: 'PAGE_ENGAGEMENT',
          url: window.location.href,
          title: document.title,
          maxScrollDepth: maxScrollDepth,
          timeOnPage: Date.now() - pageStartTime
        });
      }
    });
  }
  
  // Initialize tracking when DOM is ready
  function initializeTracking() {
    searchEngine = detectSearchEngine();
    currentSearchQuery = extractSearchQuery();
    
    if (searchEngine) {
      trackSearchResultClicks();
    }
    
    trackPageVisibility();
    trackScrollBehavior();
  }
  
  // Start tracking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTracking);
  } else {
    initializeTracking();
  }
  
  // Handle single-page application navigation
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      pageStartTime = Date.now();
      
      // Reinitialize tracking for new page
      setTimeout(initializeTracking, 100);
    }
  }).observe(document, { subtree: true, childList: true });
  
})();