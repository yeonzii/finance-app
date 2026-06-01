# 재정관리 웹앱 개발 히스토리

## 프로젝트 개요

개인 재정을 관리하는 풀스택 웹앱.  
기존 엑셀로 관리하던 소득/지출, 자산현황, 대출상환계획을 웹으로 전환.

| 항목 | 기술 |
|------|------|
| 백엔드 | Spring Boot 3.5 (Java 17), JPA, H2 DB |
| 프론트엔드 | React + Vite |
| DB | H2 파일 DB (개발) → MySQL 전환 가능 |
| 포트 | 백엔드 8080 / 프론트엔드 5173 |

---

## 개발 히스토리

---

### 1단계 — 프로젝트 환경 구성

- **Spring Boot** 프로젝트 생성 (start.spring.io API)
- **React + Vite** 프론트엔드 생성
- H2 파일 DB 선택 (MySQL 서버 없이 개발 가능, 데이터 영구 저장)
- `year`, `month` 컬럼이 H2 예약어 충돌 → `@Column(name = "tx_year")` 로 해결

**실행 방법**
```bash
# 백엔드
cd backend && java -jar target/finance-app-0.0.1-SNAPSHOT.jar

# 프론트엔드
cd frontend && npm run dev
```

**H2 콘솔** : http://localhost:8080/h2-console  
JDBC URL : `jdbc:h2:file:./data/financedb`

---

### 2단계 — 기본 3개 화면 구성

이미지로 제공된 엑셀 구조를 그대로 웹으로 구현.

#### 소득/지출 내역
- 대분류 (소득 / 통신비 / 관리비 / 보험비 / 기타 / 카드값)
- 항목별 입력: 금액, 일자, 청구일, 은행, 카드사, 메모
- 대분류별 소계 및 총 수입/지출/잔여 요약 카드

#### 자산 현황
- 연도별 12개월 그리드 뷰
- 은행잔액 / 카드합계 / 예상잔액 / 저축 / 투자 / 총자산

#### 대출 상환 계획
- 월별 대출액 / 이자금액 / 정기상환액 / 추가상환액 / 대출잔액

---

### 3단계 — 공통코드 시스템 도입

하드코딩된 문자열 → **코드값 기반**으로 전환.  
추가/삭제가 유연하고, `DEL_YN`으로 소프트 삭제 관리.

#### 공통코드 그룹 구조

```
대분류         : 소득 / 비용 / 투자
├── 소득유형   : 급여 / 이자소득 / 배당소득
├── 비용유형   : 통신비 / 관리비 / 보험비 / 정기구독 / 카드값 / 기타
└── 투자유형   : 배당투자 / 퇴직연금

기관유형
├── 카드사     : 삼성카드 / 신한카드 / 현대카드 / 국민카드 / 비씨카드 / 하나카드
├── 보험사     : 삼성화재 / 현대해상 / 동양생명 / DB손해보험
├── 은행       : 우리은행 / 신한은행 / 오케이저축은행 / 대신저축은행 / 새마을금고
└── 증권사     : 미래에셋 / 토스
```

#### DB 테이블: `common_codes`

| 컬럼 | 설명 |
|------|------|
| `code_group` | 그룹명 (대분류 / 소득유형 / 카드사 ...) |
| `parent_id` | 상위 코드 ID (계층구조) |
| `code_val` | 코드값 (영문, 예: SALARY) — `code`는 H2 예약어라 변경 |
| `code_name` | 표시명 (예: 급여) |
| `sort_order` | 정렬순서 |
| `del_yn` | 소프트삭제 (N=정상 / Y=삭제) |

#### 거래 테이블 변경

| 이전 | 이후 |
|------|------|
| `category` (문자열) | `categoryCode` (코드값) |
| `subcategory` (문자열) | `subcategoryCode` (코드값) |
| `bank` + `cardCompany` (문자열 2개) | `orgCode` (코드값 하나로 통합) |
| 없음 | `del_yn` 추가 (소프트 삭제) |

#### 기능

- 공통코드 관리 탭 신설
- 그룹별 탭 전환 (대분류 / 소득유형 / 비용유형 / 투자유형 / 기관유형 / 카드사 / 보험사 / 은행 / 증권사)
- 추가 / 수정 / 소프트삭제 / 복구
- 거래 입력 시 대분류 선택 → 소분류 자동 필터링
- 기관종류 선택 → 기관명 자동 필터링

---

### 4단계 — 대출 이자율 히스토리 관리

#### 요구사항

- 이자율은 6개월마다 변동 가능
- 이자지급일 매달 27일 고정
- 이자율 히스토리 보존 (변경 전/후 기록)
- 해당 월 적용 이자율 자동 조회
- 월별 이자액 자동 계산

#### DB 테이블: `loan_interest_rates`

| 컬럼 | 설명 |
|------|------|
| `start_year / start_month` | 이자율 적용 시작 년월 |
| `end_year / end_month` | 이자율 적용 종료 년월 (null = 현재까지) |
| `annual_rate` | 연이자율 (%) |
| `note` | 메모 |
| `del_yn` | 소프트삭제 |

#### 이자 계산식

```
월 이자액 = 대출잔액 × (연이자율 / 100) / 365 × 적용일수

적용일수 = 전달 28일 ~ 이번달 27일 (시작일 포함)
예) 2026년 6월 → 5월 28일 ~ 6월 27일 = 31일
```

> **변경 이력**  
> 최초: `잔액 × 이자율 / 12` (단순 월할)  
> → 변경: `잔액 × 이자율 / 365 × 실제일수` (일할 계산)  
> → 변경: 시작일 포함 (`days + 1`)

#### 기능

- 이자율 히스토리 탭 (적용구간 / 연이자율 / 월이자율 / 메모 / 상태)
- 월 추가 시 해당 월 이자율 자동 조회 → 이자액 자동 계산
- 저장된 이자율 vs 현재 이자율 불일치 시 ⚠ 표시
- 월별 적용 이자율 확인 테이블

---

### 5단계 — UX 개선

#### 상환 후 잔액 자동 계산
```
상환 후 잔액 = 대출잔액 - 정기상환액 - 추가상환액
```
- 정기/추가 상환액 입력 즉시 자동계산 (읽기전용 필드)

#### 기준 잔액 자동 입력
- `+ 월 추가` 클릭 시 직전 행의 **상환 후 잔액**이 기준 잔액에 자동 입력
- 이자도 즉시 자동계산되어 이자금액, 적용이자율, 적용일수 바로 표시

#### 금액 세자리 콤마 포매팅
- 모달 내 모든 금액 필드에 `MoneyInput` 컴포넌트 적용
- 입력 중: 콤마 없이 입력
- 포커스 아웃: 자동으로 `1,153,800` 형태로 포매팅

---

## 현재 등록된 이자율

| 구간 | 연이자율 | 비고 |
|------|---------|------|
| 2025년 1월 ~ 6월 | 3.80% | 2025년 상반기 |
| 2025년 7월 ~ 12월 | 3.50% | 2025년 하반기 금리인하 |
| 2026년 1월 ~ 현재 | 4.20% | 2026년 기준금리 |

---

## API 목록

### 공통코드
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/codes` | 전체 코드 목록 |
| GET | `/api/codes/group/{group}` | 그룹별 활성 코드 |
| GET | `/api/codes/children/{parentId}` | 하위 코드 목록 |
| POST | `/api/codes` | 코드 추가 |
| PUT | `/api/codes/{id}` | 코드 수정 |
| DELETE | `/api/codes/{id}` | 소프트 삭제 |
| PUT | `/api/codes/{id}/restore` | 복구 |

### 거래내역
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/transactions?year=&month=` | 월별 조회 |
| POST | `/api/transactions` | 추가 |
| PUT | `/api/transactions/{id}` | 수정 |
| DELETE | `/api/transactions/{id}` | 소프트 삭제 |

### 자산현황
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/assets?year=` | 연도별 조회 |
| GET | `/api/assets/{year}/{month}` | 월별 조회 |
| POST | `/api/assets` | 추가 |
| PUT | `/api/assets/{id}` | 수정 |

### 대출계획
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/loans` | 전체 조회 |
| POST | `/api/loans` | 추가 (이자 자동계산) |
| PUT | `/api/loans/{id}` | 수정 |
| DELETE | `/api/loans/{id}` | 삭제 |

### 이자율
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/loans/rates` | 이자율 히스토리 전체 |
| GET | `/api/loans/rates/calculate?year=&month=&balance=` | 이자 계산 |
| POST | `/api/loans/rates` | 이자율 추가 |
| PUT | `/api/loans/rates/{id}` | 수정 |
| DELETE | `/api/loans/rates/{id}` | 소프트 삭제 |

---

## 디렉토리 구조

```
finance-app/
├── backend/
│   └── src/main/java/com/finance/app/
│       ├── entity/
│       │   ├── Transaction.java         # 거래내역
│       │   ├── AssetSnapshot.java       # 자산현황
│       │   ├── LoanPlan.java            # 대출계획
│       │   ├── LoanInterestRate.java    # 이자율 히스토리
│       │   └── CommonCode.java          # 공통코드
│       ├── repository/                  # JPA Repository (DB 접근)
│       ├── service/
│       │   └── LoanService.java         # 이자 계산 로직
│       └── controller/                  # REST API 엔드포인트
│
└── frontend/
    └── src/
        ├── api/index.js                 # 백엔드 API 호출 함수
        ├── pages/
        │   ├── TransactionsPage.jsx     # 소득/지출 내역
        │   ├── AssetsPage.jsx           # 자산 현황
        │   ├── LoanPage.jsx             # 대출 상환 계획 + 이자율
        │   └── CommonCodesPage.jsx      # 공통코드 관리
        └── App.jsx                      # 탭 라우팅
```

---

## GitHub

**Repository** : https://github.com/yeonzii/finance-app
