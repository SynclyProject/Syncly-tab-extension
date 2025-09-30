# Syncly Tab Extension - 테스트 가이드

## 🚀 시작하기

### 1. 크롬 익스텐션 로드

1. Chrome 브라우저에서 `chrome://extensions` 접속
2. 우측 상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램 로드** 클릭
4. 이 프로젝트 폴더 선택 (`Syncly-tab-extension/`)
5. 익스텐션이 로드되면 목록에 "Syncly Tab Extension" 표시됨

### 2. 로드 확인

- `chrome://extensions`에서 Syncly Tab Extension 카드 확인
- **Service Worker** 링크 클릭
- 콘솔에 "Syncly Tab Extension loaded" 표시되면 정상

---

## 🧪 테스트 방법

### 방법 1: 웹 페이지 콘솔에서 테스트 (가장 쉬움)

#### Step 1: URL 수집 확인 (Spring API 없이 테스트)

1. 아무 웹페이지 열기 (예: https://google.com)
2. 여러 탭 열어두기 (3~5개, 일반 웹사이트)
3. F12 눌러서 개발자 도구 열기
4. Console 탭에서 확인:
   ```
   💡 Syncly Extension 로드됨!
     - saveTabs() : 탭 저장 (Spring API 호출)
     - checkTabs() : URL 수집만 확인 (API 호출 안함)
   ```
5. 콘솔에서 실행:
   ```javascript
   checkTabs()
   ```

**예상 결과:**
```
📋 수집된 URL 정보:
  - 현재 창의 전체 탭 개수: 5
  - 저장 가능한 URL 개수: 4
  - 제외된 URL 개수: 1

📝 저장될 URLs:
  1. https://www.google.com/
  2. https://github.com/
  3. https://stackoverflow.com/
  4. https://example.com/
```

#### Step 2: Spring API 연결 테스트

Spring API 구현 후 콘솔에서 실행:
```javascript
saveTabs()
```

**성공 시:**
```
✅ 저장 성공!
세션 ID: 1
저장된 URL 개수: 4
저장된 URLs: ["https://...", "https://...", ...]
```

**에러 발생 시:**
```
❌ 저장 실패: API request failed with status 403
```
→ Spring CORS 설정 확인 (아래 "Spring API 연결" 섹션 참고)

```
❌ 저장 실패: Failed to fetch
```
→ Spring 서버 실행 여부 확인 또는 `background.js`의 `IS_PRODUCTION` 값 확인

---

### 방법 2: Extension Service Worker 콘솔에서 테스트

1. 일반 웹사이트 여러 탭 열기 (3~5개)
2. `chrome://extensions` 접속
3. Syncly Tab Extension 카드 찾기
4. **Service Worker** 파란 링크 클릭
5. 새로 열린 DevTools 콘솔에서 실행:

#### URL 수집만 확인:
```javascript
chrome.runtime.sendMessage(
  { action: 'CHECK_TABS' },
  (response) => {
    console.log('수집된 URLs:', response.urls);
    console.log('개수:', response.validUrls);
  }
);
```

#### 저장 테스트 (Spring API 필요):
```javascript
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
```

---

### 방법 3: React 프론트엔드에서 테스트

React 컴포넌트에서 버튼 클릭 시:

```javascript
// URL 수집만 확인
const handleCheckTabs = () => {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    alert('크롬 익스텐션이 설치되지 않았습니다.');
    return;
  }

  chrome.runtime.sendMessage(
    { action: 'CHECK_TABS' },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Extension 통신 에러:', chrome.runtime.lastError);
        return;
      }

      if (response.success) {
        console.log('📋 수집된 URLs:', response.urls);
        console.log('개수:', response.validUrls);
        alert(`${response.validUrls}개의 URL이 수집되었습니다!`);
      }
    }
  );
};

// 저장 (Spring API 호출)
const handleSaveTabs = () => {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    alert('크롬 익스텐션이 설치되지 않았습니다.');
    return;
  }

  chrome.runtime.sendMessage(
    { action: 'SAVE_TABS' },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Extension 통신 에러:', chrome.runtime.lastError);
        alert('익스텐션과 통신할 수 없습니다.');
        return;
      }

      if (response.success) {
        alert(`${response.count}개 탭이 저장되었습니다!`);
        console.log('저장된 세션:', response.data);
      } else {
        alert(`저장 실패: ${response.error}`);
      }
    }
  );
};
```

JSX:
```jsx
<button onClick={handleCheckTabs}>Check Tabs</button>
<button onClick={handleSaveTabs}>Save Tabs</button>
```

---

## 📋 통합 테스트 시나리오

### Phase 1: Extension 단독 테스트 (Spring API 없이)

1. **준비**
   - ✅ 크롬 익스텐션 로드됨
   - ✅ 일반 웹사이트 여러 탭 열어두기 (3~5개, chrome:// 제외)

2. **실행**
   - 웹 페이지 콘솔에서 `checkTabs()` 실행

3. **확인**
   - ✅ 콘솔에 수집된 URL 리스트 표시
   - ✅ Extension Service Worker 콘솔에서 "🔍 Tab Collection Check" 로그 확인
   - ✅ chrome:// URL들이 제외되었는지 확인

### Phase 2: Spring API 연동 테스트

1. **준비**
   - ✅ Spring Boot 서버 실행 중 (`localhost:8080` 또는 `api.syncly-io.com`)
   - ✅ Spring CORS 설정 완료 (`chrome-extension://*` 허용)
   - ✅ `/api/tabs` POST 엔드포인트 구현 완료
   - ✅ 크롬 익스텐션 로드됨
   - ✅ 여러 탭 열어두기 (3~5개)

2. **실행**
   - 웹 페이지 콘솔에서 `saveTabs()` 실행
   - 또는 React UI에서 "Save Tabs" 버튼 클릭

3. **확인**
   - ✅ 콘솔에 "✅ 저장 성공!" 메시지
   - ✅ Spring 서버 로그에서 POST 요청 확인
   - ✅ DB에서 저장된 데이터 확인
   - ✅ Extension Service Worker 콘솔에서 "Collected X URLs" 로그 확인
   - ✅ 반환된 세션 ID 확인

---

## 🔍 디버깅

### Extension 콘솔 로그 확인

1. `chrome://extensions` → **Service Worker** 클릭
2. 콘솔에서 로그 확인:
   ```
   Syncly Tab Extension loaded
   Received message: {action: "CHECK_TABS"}
   🔍 Tab Collection Check:
     Total tabs: 5
     Valid URLs: 4
     Excluded: 1
     Valid URLs: [...]

   Received message: {action: "SAVE_TABS"}
   Collected 4 URLs from current window: [...]
   Save tabs response: {id: 1, urls: [...], ...}
   ```

### 현재 탭 정보 확인

Service Worker 콘솔에서:
```javascript
chrome.tabs.query({ currentWindow: true }, (tabs) => {
  console.log('현재 창의 탭들:', tabs.map(t => ({
    title: t.title,
    url: t.url
  })));
});
```

### API 엔드포인트 확인

Service Worker 콘솔에서:
```javascript
console.log('현재 API URL:', API_BASE_URL);
console.log('Production 모드:', IS_PRODUCTION);
```

**결과:**
- `IS_PRODUCTION = false` → `http://localhost:8080`
- `IS_PRODUCTION = true` → `https://api.syncly-io.com`

---

## ⚠️ 트러블슈팅

### 1. "saveTabs is not defined" 또는 "checkTabs is not defined" 에러
**원인:** content.js 또는 inject.js가 로드되지 않음

**해결:**
- `chrome://extensions`에서 익스텐션 새로고침 (↻)
- 웹 페이지 완전히 닫고 새로 열기 (F5가 아닌 새 탭)
- 콘솔에 다음 메시지 확인:
  ```
  💡 Syncly Extension 로드됨!
    - saveTabs() : 탭 저장 (Spring API 호출)
    - checkTabs() : URL 수집만 확인 (API 호출 안함)
  ```

### 2. "No valid tabs to save" 에러
**원인:** 저장할 수 있는 URL이 없음 (chrome://, extension:// 제외됨)

**해결:**
- 일반 웹사이트 탭 열기 (https://google.com 등)
- Service Worker 콘솔에서 `chrome.tabs.query` 로 탭 확인

### 3. "API request failed with status 403" 에러
**원인:** Spring CORS 설정 문제

**해결:**
- Spring에서 `chrome-extension://*` origin 허용 확인
- API_SPEC.md의 "CORS 설정 필요" 섹션 참고
- `@CrossOrigin(originPatterns = "*")` 추가 (개발 시)

### 4. "Failed to fetch" 에러
**원인:** Spring API 서버 미실행 또는 URL 불일치

**해결:**
- Spring Boot 서버 실행 확인
- `background.js`의 `IS_PRODUCTION` 값 확인:
  - 로컬 개발: `IS_PRODUCTION = false` → `http://localhost:8080`
  - 배포 환경: `IS_PRODUCTION = true` → `https://api.syncly-io.com`
- Service Worker 콘솔에서 `console.log(API_BASE_URL)` 실행하여 URL 확인

### 4. Extension이 메시지를 받지 못할 때
**원인:** Extension ID 변경 또는 설치 오류

**해결:**
```javascript
// Service Worker 콘솔에서 Extension ID 확인
chrome.runtime.id
```

### 5. CORS 에러 발생 시
**원인:** Spring에서 `chrome-extension://*` 허용 안됨

**해결:**
- Spring의 CORS 설정에 `chrome-extension://*` 추가 (API_SPEC.md 참고)
- Network 탭에서 Preflight (OPTIONS) 요청 확인

### 6. Service Worker가 비활성화될 때
**원인:** 일정 시간 후 자동 비활성화 (정상 동작)

**해결:**
- 메시지 전송 시 자동으로 다시 활성화됨
- 또는 `chrome://extensions`에서 "Service Worker" 클릭하면 활성화

---

## 🎯 빠른 체크리스트

### Extension 단독 테스트 (Spring 없이)
- [ ] `chrome://extensions`에서 익스텐션 로드됨
- [ ] Service Worker 에러 없음
- [ ] 일반 웹사이트 여러 탭 열어두기 (chrome:// 제외)
- [ ] 웹 페이지 콘솔에 로드 메시지 표시
- [ ] `checkTabs()` 실행 → URL 리스트 확인
- [ ] Service Worker 콘솔에서 "🔍 Tab Collection Check" 로그 확인

### Spring API 연동 테스트
- [ ] Spring Boot 서버 실행 중
- [ ] `/api/tabs` POST 엔드포인트 구현됨
- [ ] Spring CORS 설정 완료 (`chrome-extension://*` 허용)
- [ ] `background.js`의 `IS_PRODUCTION` 값이 환경에 맞게 설정됨
  - 로컬: `false`, 배포: `true`
- [ ] `saveTabs()` 실행
- [ ] "✅ 저장 성공!" 메시지 확인
- [ ] Spring 서버 로그에서 POST 요청 확인
- [ ] DB에 데이터 저장 확인

---

## 📝 참고

- **API 명세**: `API_SPEC.md` 참고
- **환경 변경**: `background.js`의 `IS_PRODUCTION` 값 변경
- **개발/배포**:
  - 개발: `IS_PRODUCTION = false` → `http://localhost:8080`
  - 배포: `IS_PRODUCTION = true` → `https://api.syncly-io.com`