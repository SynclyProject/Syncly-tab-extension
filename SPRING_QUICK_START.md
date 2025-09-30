# Spring API 빠른 시작 가이드

Extension과 연동하기 위한 Spring API 최소 구현 가이드입니다.

## 🚀 1분 안에 시작하기

### 1. Controller 생성

`src/main/java/.../controller/TabController.java`:

```java
package com.syncly.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/tabs")
@CrossOrigin(originPatterns = "*") // 개발 시 모든 origin 허용
public class TabController {

    @PostMapping
    public ResponseEntity<?> saveTabs(@RequestBody Map<String, List<String>> request) {
        List<String> urls = request.get("urls");

        // Validation
        if (urls == null || urls.isEmpty()) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "URLs array is required")
            );
        }

        System.out.println("✅ 받은 URLs: " + urls);

        // 간단한 응답 (DB 저장은 나중에)
        Map<String, Object> response = new HashMap<>();
        response.put("id", 1L);
        response.put("urls", urls);
        response.put("createdAt", LocalDateTime.now().toString());
        response.put("count", urls.size());

        return ResponseEntity.ok(response);
    }
}
```

### 2. 서버 실행

```bash
./mvnw spring-boot:run
# 또는
./gradlew bootRun
```

### 3. Extension에서 테스트

1. 크롬에서 여러 탭 열기
2. F12 → Console
3. 실행:
```javascript
saveTabs()
```

**성공 시:**
```
✅ 저장 성공!
세션 ID: 1
저장된 URL 개수: 4
```

**Spring 콘솔:**
```
✅ 받은 URLs: [https://google.com, https://github.com, ...]
```

---

## 🔧 CORS 문제 발생 시

### 증상
```
❌ 저장 실패: API request failed with status 403
```

### 해결: CORS 설정 추가

`src/main/java/.../config/WebConfig.java`:

```java
package com.syncly.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false);
    }
}
```

---

## 🗄️ DB 연동 (선택사항)

### Entity

```java
package com.syncly.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "tab_sessions")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TabSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ElementCollection
    @CollectionTable(name = "tab_urls", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "url", length = 2048)
    private List<String> urls;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

### Repository

```java
package com.syncly.repository;

import com.syncly.entity.TabSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TabSessionRepository extends JpaRepository<TabSession, Long> {
}
```

### Service

```java
package com.syncly.service;

import com.syncly.entity.TabSession;
import com.syncly.repository.TabSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TabService {

    private final TabSessionRepository repository;

    @Transactional
    public TabSession save(List<String> urls) {
        TabSession session = TabSession.builder()
                .urls(urls)
                .build();

        return repository.save(session);
    }

    public TabSession findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));
    }
}
```

### Controller (DB 연동 버전)

```java
@RestController
@RequestMapping("/api/tabs")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class TabController {

    private final TabService tabService;

    @PostMapping
    public ResponseEntity<?> saveTabs(@RequestBody Map<String, List<String>> request) {
        List<String> urls = request.get("urls");

        if (urls == null || urls.isEmpty()) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "URLs array is required")
            );
        }

        TabSession session = tabService.save(urls);

        Map<String, Object> response = new HashMap<>();
        response.put("id", session.getId());
        response.put("urls", session.getUrls());
        response.put("createdAt", session.getCreatedAt());
        response.put("count", session.getUrls().size());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTabs(@PathVariable Long id) {
        TabSession session = tabService.findById(id);

        Map<String, Object> response = new HashMap<>();
        response.put("id", session.getId());
        response.put("urls", session.getUrls());
        response.put("createdAt", session.getCreatedAt());
        response.put("count", session.getUrls().size());

        return ResponseEntity.ok(response);
    }
}
```

---

## 📝 체크리스트

### 최소 구현 (필수)
- [ ] `TabController` 생성
- [ ] `POST /api/tabs` 엔드포인트 구현
- [ ] CORS 설정 (`@CrossOrigin` 또는 `WebConfig`)
- [ ] 서버 실행 (`localhost:8080`)
- [ ] Extension에서 `saveTabs()` 테스트

### DB 연동 (선택)
- [ ] Entity, Repository, Service 생성
- [ ] DB 설정 (`application.properties`)
- [ ] `GET /api/tabs/{id}` 구현
- [ ] 저장된 데이터 조회 테스트

---

## 🐛 트러블슈팅

### 1. "403 Forbidden" 에러
→ CORS 설정 확인 (`@CrossOrigin` 추가)

### 2. "404 Not Found" 에러
→ Controller 경로 확인 (`/api/tabs`)

### 3. "Failed to fetch" 에러
→ Spring 서버 실행 확인 (`localhost:8080`)

### 4. Extension에서 URL이 다른 경우
→ Extension의 `background.js`에서 `IS_PRODUCTION` 값 확인
  - 로컬: `false` → `http://localhost:8080`
  - 배포: `true` → `https://api.syncly-io.com`

---

## 📚 참고

- 전체 API 명세: `API_SPEC.md`
- Extension 테스트: `TEST.md`