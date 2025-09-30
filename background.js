// Syncly Tab Extension - Background Service Worker

console.log('Syncly Tab Extension loaded');

// API Configuration
// 개발 시에는 localhost, 배포 시에는 production URL 사용
// manifest.json의 host_permissions에 둘 다 포함되어 있음
const IS_PRODUCTION = true; // 배포 시 true로 변경
const API_BASE_URL = IS_PRODUCTION
  ? 'https://api.syncly-io.com'
  : 'http://localhost:8080';

// Message listener for communication with React frontend
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);

  // Handle CHECK_TABS action (URL 수집만 확인)
  if (message.action === 'CHECK_TABS') {
    handleCheckTabs(sendResponse);
    return true;
  }

  // Handle SAVE_TABS action
  if (message.action === 'SAVE_TABS') {
    handleSaveTabs(sendResponse);
    return true; // Keep the message channel open for async responses
  }

  // Handle PING action for testing
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
 * @param {Function} sendResponse - Callback to send response back to caller
 */
async function handleSaveTabs(sendResponse) {
  try {
    // 1. Query all tabs in the current window
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // 2. Extract URLs from tabs (filter out chrome:// and extension:// URLs)
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

    // 3. Send URLs to Spring API
    const response = await fetch(`${API_BASE_URL}/api/tabs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Save tabs response:', data);

    // 4. Send success response
    sendResponse({
      success: true,
      data: data,
      count: urls.length
    });

  } catch (error) {
    console.error('Error saving tabs:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}