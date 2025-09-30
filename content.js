// Content Script - 웹 페이지에서 Extension과 통신할 수 있게 해줌

// inject.js 파일을 페이지 컨텍스트에 주입
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Content script에서 postMessage 리스닝
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'SYNCLY_SAVE_TABS') {
    chrome.runtime.sendMessage(
      { action: 'SAVE_TABS' },
      (response) => {
        if (response.success) {
          console.log('✅ 저장 성공!');
          console.log('세션 ID:', response.data.id);
          console.log('저장된 URL 개수:', response.count);
          console.log('저장된 URLs:', response.data.urls);
        } else {
          console.error('❌ 저장 실패:', response.error);
        }
      }
    );
  }

  if (event.data.type === 'SYNCLY_CHECK_TABS') {
    chrome.runtime.sendMessage(
      { action: 'CHECK_TABS' },
      (response) => {
        if (response.success) {
          console.log('📋 수집된 URL 정보:');
          console.log('  - 현재 창의 전체 탭 개수:', response.totalTabs);
          console.log('  - 저장 가능한 URL 개수:', response.validUrls);
          console.log('  - 제외된 URL 개수:', response.excludedUrls);
          console.log('\n📝 저장될 URLs:');
          response.urls.forEach((url, index) => {
            console.log(`  ${index + 1}. ${url}`);
          });
        } else {
          console.error('❌ URL 수집 실패:', response.error);
        }
      }
    );
  }
});