# Syncly-tab-extension

## 전체 아키텍처

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│                 │      │                  │      │                 │
│  React Frontend │ ──1──│ Chrome Extension │ ──2──│   Spring API    │
│                 │      │   (background.js)│      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                                                    │
        └────────────────────3───────────────────────────────┘
```

#### 1. Save Tabs 플로우
1. **React → Extension**: `SAVE_TABS` 메시지 전송
2. **Extension → Spring**: `/api/workspaces/tabs/save` POST 요청 (현재 탭 URLs 전송)
3. **Spring → React**: 저장된 탭 정보 (id, urls, createdAt, count) 반환

#### 2. Open Links 플로우
1. **React → Spring**: `/api/workspaces/tabs/saved/{id}` GET 요청 (저장된 탭 조회)
2. **Spring → React**: 저장된 URLs 배열 반환
3. **React → Extension**: `OPEN_LINKS` 메시지 전송 (URLs 전달)
4. **Extension**: URLs를 새 탭으로 열기