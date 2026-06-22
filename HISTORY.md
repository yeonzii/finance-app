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
월 이자액 = 대출잔액 × (연이자율 / 100) / 12   (단순 월할)

이자지급일 = 매달 27일
예) 잔액 1억 × 4.2% ÷ 12 = 350,000원
```

> **변경 이력**  
> 최초: `잔액 × 이자율 / 12` (단순 월할)  
> → 변경: `잔액 × 이자율 / 365 × 실제일수` (일할 계산, 시작일 포함)  
> → 최종: `잔액 × 이자율 / 12` (단순 월할로 환원)

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
- 이자도 즉시 자동계산되어 이자금액, 적용이자율 바로 표시

#### 금액 세자리 콤마 포매팅
- 모달 내 모든 금액 필드에 `MoneyInput` 컴포넌트 적용
- 입력 중: 콤마 없이 입력
- 포커스 아웃: 자동으로 `1,153,800` 형태로 포매팅

---

### 6단계 — MySQL(Docker) 전환

- H2 파일 DB → **Docker MySQL**로 전환 (`docker-compose.yml`)
- `pom.xml` H2 제거, `application.properties` MySQL 연결
- 접속: `localhost:3306` / DB `financedb` / `finance` 계정

### 7단계 — 공통코드 TB_CODE 재설계 (계층형)

- `common_codes` → **`TB_CODE`**, PK를 **varchar(`CD_ID`)** 로 변경
- 코드체계 `CD + 4자리` `[대분류][중분류][소분류][세부]`, ROOT(CD0000) 도입
- `codeGroup` 제거 → `CD_LEVEL` + `PARENT_CD_ID` 자기참조 계층
- 공통코드 관리 화면: **드릴다운**(더블클릭) + 브레드크럼 + **ID 자동채번**
- 레벨4(세부항목)까지 지원

### 8단계 — TB_TRANSACTION 재설계

- `transactions` → **`TB_TRANSACTION`**, PK를 의미있는 varchar로
- ID 규칙: `TR + 년 + 월(2) + 분류코드숫자` (예: `TR2026062143`)
- 소득/지출 내역: **대분류 → 중분류 → 소분류** 3단계, 중분류 병합 + 펼치기/접기

### 9단계 — 고정비 관리

- `FixedCost` 엔티티: 고정비 항목(분류·세부항목·금액·기관) 등록
- 소득/지출 내역에서 **해당 월 진입 시 거래 자동 생성** (중복 방지: `fixedCostId`)
- 생성된 거래의 금액은 월별로 수정 가능

### 10단계 — 자산현황 재구성

- 고정형 와이드 테이블 `asset_snapshots` 폐기
- **`asset_items`**(구성 항목) + **`asset_values`**(월별 값)로 분리
- 자산 항목 구성 페이지: 소득(소득코드)/지출·자산(기관·비용코드)별 항목 구성
- 자산현황: 행=월 / 열=항목 **가로 그리드**, 셀 인라인 입력, 구분합계·수지 자동

### 11단계 — 관련기관 + 결제기관(카드사) 관리

- `TB_CODE.REL_ORG_CD`: 소득/비용/투자 코드에 **관련 기관코드** 연결
- `PaymentInstitution`: **카드사별 결제일** 관리 (별도 메뉴)
- 소득/지출·고정비 입력 시 자동채움:
  - 소분류 선택 → 관련기관 자동 → 카드사면 **결제일** 자동
  - 기관 종류가 **은행**이면 청구일 입력 시 결제일 동일 세팅
- 대출 이자 계산식: 일할 → **월할**(`잔액 × 연이자율 ÷ 12`)로 변경

### 12단계 — UI 정리

- 전체 테이블 헤더 중앙정렬, 금액 우측·일자/기관 중앙정렬
- 명칭: 일자/거래일 → **결제일**, 컬럼 순서 청구일→기관→결제일
- 소득/지출·고정비 모달 재구성 (대분류/중분류/소분류, 금액/청구일, 기관종류/기관명/결제일 한 줄씩)

### 13단계 — 자동 연동·집계 고도화

- **자산현황 ↔ 소득/지출 자동 반영**
  - 소득 = 같은 달, 지출은 **카드값=다음 달 / 그 외 비용=당월** 매핑
  - 소득·지출 행은 거래에서 자동 계산(읽기전용), 자산 행만 직접 입력
- **비용 카드 중복비용**: 고정비 중 관련기관이 카드사면 카드값과 중복 → 비용 소계에 `(-)카드 중복비용`, `(=)중복제거 비용` 표시
- **자산 항목 순서 변경**: 드래그앤드롭 + ▲▼ 버튼, 자산현황에 순서 반영
- **자산 증감 표시**: 자산합계 열에 전월 대비 증감(증가=파랑/감소=빨강), 합계행에 1월 대비 증감
- **자산현황 분류별 소계**: 지출(카드값 소계)·자산(은행 소계) 등 상위분류 그룹 소계 (대출상환·미래에셋 등 일부 제외)
- **대출상환계획**
  - 총 원리금상환액 열(=이자금액+정기상환액) 추가
  - **지출반영 버튼**: 클릭 시 해당 월 소득/지출에 원리금상환·원금추가상환 거래 생성/갱신(기관=관련기관)
- **고정비 수정 시 다음 달부터 반영**: 변경월 이하 거래는 유지, 다음 달부터만 갱신
- 소득/지출 금액 입력 3자리 콤마 표기

---

## 현재 등록된 이자율

| 구간 | 연이자율 | 비고 |
|------|---------|------|
| 2025년 1월 ~ 6월 | 3.80% | 2025년 상반기 |
| 2025년 7월 ~ 12월 | 3.50% | 2025년 하반기 금리인하 |
| 2026년 1월 ~ 현재 | 4.20% | 2026년 기준금리 |

---

## API 목록

### 공통코드 (TB_CODE)
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/codes` | 전체 코드 목록 |
| GET | `/api/codes/children/{parentCdId}` | 하위 코드 목록 |
| GET | `/api/codes/level/{level}` | 레벨별 코드 |
| POST | `/api/codes` | 코드 추가 (REL_ORG_CD 포함) |
| PUT | `/api/codes/{cdId}` | 코드 수정 |
| DELETE | `/api/codes/{cdId}` | 소프트 삭제 |
| PUT | `/api/codes/{cdId}/restore` | 복구 |

### 고정비 / 자산구성 / 결제기관
| Method | URL | 설명 |
|--------|-----|------|
| GET/POST/PUT/DELETE | `/api/fixed-costs` | 고정비 CRUD |
| POST | `/api/fixed-costs/generate?year=&month=` | 월별 거래 자동생성 |
| GET/POST/PUT/DELETE | `/api/asset-items` | 자산 구성항목 CRUD |
| GET/POST | `/api/asset-values?year=` | 자산 월별 값 (upsert) |
| GET/POST | `/api/payment-institutions` | 카드사 결제일 (upsert) |

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
├── docker-compose.yml                   # MySQL 컨테이너
├── backend/
│   └── src/main/java/com/finance/app/
│       ├── entity/
│       │   ├── Transaction.java         # 거래내역 (TB_TRANSACTION)
│       │   ├── FixedCost.java           # 고정비 템플릿
│       │   ├── AssetItem.java           # 자산 구성항목
│       │   ├── AssetValue.java          # 자산 월별 값
│       │   ├── LoanPlan.java            # 대출계획
│       │   ├── LoanInterestRate.java    # 이자율 히스토리
│       │   ├── PaymentInstitution.java  # 카드사 결제일
│       │   └── CommonCode.java          # 공통코드 (TB_CODE, REL_ORG_CD)
│       ├── repository/                  # JPA Repository
│       ├── service/
│       │   ├── LoanService.java         # 이자 계산 (월할)
│       │   ├── TransactionService.java  # 거래 ID 생성
│       │   └── FixedCostService.java    # 고정비 → 거래 자동생성
│       └── controller/                  # REST API
│
└── frontend/
    └── src/
        ├── api/index.js                 # 백엔드 API 호출 함수
        ├── pages/
        │   ├── TransactionsPage.jsx     # 소득/지출 내역
        │   ├── FixedCostPage.jsx        # 고정비 관리
        │   ├── AssetsPage.jsx           # 자산 현황 (가로 그리드)
        │   ├── AssetItemsPage.jsx       # 자산 항목 구성
        │   ├── LoanPage.jsx             # 대출 상환 계획 + 이자율
        │   ├── PaymentInstitutionsPage.jsx # 결제기관 관리
        │   └── CommonCodesPage.jsx      # 공통코드 관리
        └── App.jsx                      # 탭 라우팅
```

---

## GitHub

**Repository** : https://github.com/yeonzii/finance-app
