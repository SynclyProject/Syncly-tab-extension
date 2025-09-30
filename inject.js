// Injected Script - 페이지 컨텍스트에서 실행됨

window.saveTabs = function() {
  window.postMessage({ type: 'SYNCLY_SAVE_TABS' }, '*');
};

// URL 수집만 테스트하는 함수
window.checkTabs = function() {
  window.postMessage({ type: 'SYNCLY_CHECK_TABS' }, '*');
};

console.log('💡 Syncly Extension 로드됨!');
console.log('  - saveTabs() : 탭 저장 (Spring API 호출)');
console.log('  - checkTabs() : URL 수집만 확인 (API 호출 안함)');