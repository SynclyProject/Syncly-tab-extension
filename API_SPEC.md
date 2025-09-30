# Syncly Tab Extension - Spring API 명세

> 💡 **테스트 방법은 [TEST.md](./TEST.md)를 참고하세요.**

---

## 1. Save Tabs API

### Endpoint
```
POST /api/tabs
```

### 설명
크롬 익스텐션에서 수집한 현재 창의 모든 탭 URL을 저장합니다.

### Request

#### Headers
```
Content-Type: application/json
```

#### Body
```json
{
  "urls": [
    "https://github.com/example/repo",
    "https://stackoverflow.com/questions/123",
    "https://www.google.com"
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| urls | String[] | O | 저장할 URL 배열 (chrome://, chrome-extension:// 자동 제외됨) |

### Response

#### Success (200 OK)
```json
{
  "id": 1,
  "urls": [
    "https://github.com/example/repo",
    "https://stackoverflow.com/questions/123",
    "https://www.google.com"
  ],
  "createdAt": "2025-09-30T23:45:00",
  "count": 3
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | Long | 저장된 세션 ID (나중에 조회/열기 시 사용) |
| urls | String[] | 저장된 URL 배열 |
| createdAt | DateTime | 저장 시간 (ISO 8601 형식) |
| count | Integer | 저장된 URL 개수 |

#### Error (4xx, 5xx)
```json
{
  "error": "Bad Request",
  "message": "URLs array is required",
  "status": 400
}
```

### Spring Controller 예시

#### 최소 구현 (개발/테스트용)
```java
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

        System.out.println("받은 URLs: " + urls);

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

#### 프로덕션 구현 (DB 연동)
```java
@RestController
@RequestMapping("/api/tabs")
@CrossOrigin(originPatterns = {"chrome-extension://*", "https://www.syncly-io.com"})
public class TabController {

    private final TabService tabService;

    @PostMapping
    public ResponseEntity<TabSessionResponse> saveTabs(@RequestBody TabSaveRequest request) {
        // Validation
        if (request.getUrls() == null || request.getUrls().isEmpty()) {
            throw new BadRequestException("URLs array is required");
        }

        // Save to DB
        TabSession session = tabService.save(request.getUrls());

        // Response
        TabSessionResponse response = TabSessionResponse.builder()
            .id(session.getId())
            .urls(session.getUrls())
            .createdAt(session.getCreatedAt())
            .count(session.getUrls().size())
            .build();

        return ResponseEntity.ok(response);
    }
}
```

### DTO 예시
```java
// Request DTO
@Data
public class TabSaveRequest {
    @NotEmpty
    private List<String> urls;
}

// Response DTO
@Data
@Builder
public class TabSessionResponse {
    private Long id;
    private List<String> urls;
    private LocalDateTime createdAt;
    private Integer count;
}
```

---

## 2. Get Tabs API (다음 단계에서 구현)

### Endpoint
```
GET /api/tabs/{id}
```

### Response
```json
{
  "id": 1,
  "urls": [
    "https://github.com/example/repo",
    "https://stackoverflow.com/questions/123"
  ],
  "createdAt": "2025-09-30T23:45:00",
  "count": 2
}
```

---

## 환경별 API Base URL

- **로컬 개발**: `http://localhost:8080`
- **배포 환경**: `https://api.syncly-io.com`

## CORS 설정 필요 ⚠️

크롬 익스텐션에서 Spring API를 호출하려면 **CORS 설정이 필수**입니다.

### 방법 1: 개발 환경 (모든 origin 허용)

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")  // 개발 시 모든 origin 허용
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false);
    }
}
```

### 방법 2: 프로덕션 환경 (특정 origin만 허용)

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                    "chrome-extension://*",      // 크롬 익스텐션
                    "https://www.syncly-io.com"  // React 프론트
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false);
    }
}
```

### 방법 3: Controller 레벨 (간단한 방법)

```java
@RestController
@RequestMapping("/api/tabs")
@CrossOrigin(originPatterns = "*")  // 이 Controller만 CORS 허용
public class TabController {
    // ...
}
```

### Spring Security 사용 시 추가 설정

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors().and()  // CORS 활성화
            .csrf().disable()  // 개발 시 CSRF 비활성화
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/tabs/**").permitAll()  // /api/tabs는 인증 없이 허용
                .anyRequest().authenticated()
            );
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
```

### 테스트 방법

CORS 설정 후 Extension에서 `saveTabs()` 실행 시:
- ✅ 성공: "✅ 저장 성공!" 메시지
- ❌ 실패: "❌ 저장 실패: API request failed with status 403"