// Syncly Tab Extension - Background Service Worker

console.log('Syncly Tab Extension loaded');

// API Configuration
// 개발 시에는 localhost, 배포 시에는 production URL 사용
// manifest.json의 host_permissions에 둘 다 포함되어 있음
const IS_PRODUCTION = true; // 배포 시 true로 변경
const API_BASE_URL = IS_PRODUCTION
  ? 'https://api.syncly-io.com'
  : 'http://localhost:8080';

// Message listener for communication from extension popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);

  // Handle CHECK_TABS action (URL 수집만 확인)
  if (message.action === 'CHECK_TABS') {
    handleCheckTabs(sendResponse);
    return true;
  }

  // Handle SAVE_TABS action
  if (message.action === 'SAVE_TABS') {
    handleSaveTabs(message.token, sendResponse);
    return true; // Keep the message channel open for async responses
  }

  // Handle OPEN_LINKS action
  if (message.action === 'OPEN_LINKS') {
    handleOpenLinks(message.urls, sendResponse);
    return true; // Keep the message channel open for async responses
  }

  // Handle SET_TOKEN action (JWT 토큰 저장)
  if (message.action === 'SET_TOKEN') {
    handleSetToken(message.token, sendResponse);
    return true;
  }

  // Handle GET_TOKEN action (JWT 토큰 조회)
  if (message.action === 'GET_TOKEN') {
    handleGetToken(sendResponse);
    return true;
  }

  // Handle PING action for testing
  if (message.action === 'PING') {
    sendResponse({ success: true, message: 'Extension is running' });
  }

  return true;
});

// Message listener for external web pages (React app)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('Received external message:', message, 'from:', sender.url);

  // Handle CHECK_TABS action
  if (message.action === 'CHECK_TABS') {
    handleCheckTabs(sendResponse);
    return true;
  }

  // Handle SAVE_TABS action
  if (message.action === 'SAVE_TABS') {
    handleSaveTabs(message.token, sendResponse);
    return true;
  }

  // Handle OPEN_LINKS action
  if (message.action === 'OPEN_LINKS') {
    handleOpenLinks(message.urls, sendResponse);
    return true;
  }

  // Handle SET_TOKEN action
  if (message.action === 'SET_TOKEN') {
    handleSetToken(message.token, sendResponse);
    return true;
  }

  // Handle GET_TOKEN action
  if (message.action === 'GET_TOKEN') {
    handleGetToken(sendResponse);
    return true;
  }

  // Handle PING action
  if (message.action === 'PING') {
    sendResponse({ success: true, message: 'Extension is running' });
  }

  return true;
});

/**
 * Check tabs without saving (for testing URL collection)
 * @param {Function} sendResponse - Callback to send response back to caller
 */
async function handleCheckTabs(sendResponse) {
  try {
    // Query all tabs in the current window
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // Extract URLs from tabs (filter out chrome:// and extension:// URLs)
    const allUrls = tabs.map(tab => tab.url);
    const validUrls = allUrls.filter(url => url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://'));

    console.log('🔍 Tab Collection Check:');
    console.log(`  Total tabs: ${tabs.length}`);
    console.log(`  Valid URLs: ${validUrls.length}`);
    console.log(`  Excluded: ${tabs.length - validUrls.length}`);
    console.log('  Valid URLs:', validUrls);

    sendResponse({
      success: true,
      totalTabs: tabs.length,
      validUrls: validUrls.length,
      excludedUrls: tabs.length - validUrls.length,
      urls: validUrls
    });

  } catch (error) {
    console.error('Error checking tabs:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Save all tabs from current window
 * @param {string} token - JWT token for authentication
 * @param {Function} sendResponse - Callback to send response back to caller
 */
async function handleSaveTabs(token, sendResponse) {
  try {
    // 1. Validate token
    if (!token) {
      sendResponse({
        success: false,
        error: 'Authentication required. Please provide JWT token.'
      });
      return;
    }

    // 2. Query all tabs in the current window
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // 3. Extract URLs from tabs (filter out chrome:// and extension:// URLs)
    const urls = tabs
      .map(tab => tab.url)
      .filter(url => url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://'));

    console.log(`Collected ${urls.length} URLs from current window:`, urls);

    if (urls.length === 0) {
      sendResponse({
        success: false,
        error: 'No valid tabs to save'
      });
      return;
    }

    // 4. Send URLs to Spring API with Authorization header
    const response = await fetch(`${API_BASE_URL}/api/workspaces/tabs/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log('Save tabs response:', result);

    // 5. Send success response
    sendResponse({
      success: true,
      data: result.data || result,
      count: result.data?.count || result.count || urls.length
    });

  } catch (error) {
    console.error('Error saving tabs:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Open links in new tabs
 * @param {string[]} urls - Array of URLs to open
 * @param {Function} sendResponse - Callback to send response back to caller
 */
async function handleOpenLinks(urls, sendResponse) {
  try {
    // Validate input
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      sendResponse({
        success: false,
        error: 'No valid URLs provided'
      });
      return;
    }

    console.log(`Opening ${urls.length} links:`, urls);

    // Open each URL in a new tab
    const createdTabs = [];
    for (const url of urls) {
      // Validate URL format
      if (!url || typeof url !== 'string') {
        console.warn('Invalid URL skipped:', url);
        continue;
      }

      // Create new tab with the URL
      const tab = await chrome.tabs.create({ url, active: false });
      createdTabs.push(tab.id);
      console.log(`Opened tab ${tab.id} with URL: ${url}`);
    }

    // Send success response
    sendResponse({
      success: true,
      count: createdTabs.length,
      tabIds: createdTabs,
      message: `Successfully opened ${createdTabs.length} tabs`
    });

  } catch (error) {
    console.error('Error opening links:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Set JWT token in Chrome storage
 * @param {string} token - JWT token to save
 * @param {Function} sendResponse - Callback to send response back to caller
 */
async function handleSetToken(token, sendResponse) {
  try {
    if (!token) {
      sendResponse({
        success: false,
        error: 'Token is required'
      });
      return;
    }

    await chrome.storage.local.set({ jwt_token: token });
    console.log('JWT token saved to storage');

    sendResponse({
      success: true,
      message: 'Token saved successfully'
    });

  } catch (error) {
    console.error('Error saving token:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get JWT token from Chrome storage
 * @param {Function} sendResponse - Callback to send response back to caller
 */
async function handleGetToken(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['jwt_token']);
    const token = result.jwt_token;

    if (!token) {
      sendResponse({
        success: false,
        error: 'No token found',
        token: null
      });
      return;
    }

    sendResponse({
      success: true,
      token: token
    });

  } catch (error) {
    console.error('Error getting token:', error);
    sendResponse({
      success: false,
      error: error.message,
      token: null
    });
  }
}