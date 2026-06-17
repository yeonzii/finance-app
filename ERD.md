# 재정관리 앱 - 데이터 모델 (ERD)

> JPA 엔티티 기반 ERD. 엔티티 변경 시 이 문서도 함께 업데이트하세요.
> GitHub에서 아래 다이어그램이 자동으로 렌더링됩니다.

## 전체 ERD

```mermaid
erDiagram
    TB_CODE ||--o{ TB_CODE : "parent_cd_id (계층구조)"
    TB_CODE ||--o{ TB_CODE : "rel_org_cd (관련기관, FK 아님)"
    TB_CODE ||..o{ TB_TRANSACTION : "코드값 참조 (FK 아님)"
    TB_CODE ||..o{ FIXED_COSTS : "코드값 참조 (FK 아님)"
    TB_CODE ||..o{ ASSET_ITEMS : "코드값 참조 (FK 아님)"
    TB_CODE ||..o{ PAYMENT_INSTITUTIONS : "code_id (카드사 참조)"
    FIXED_COSTS ||..o{ TB_TRANSACTION : "fixed_cost_id (자동생성 추적)"
    ASSET_ITEMS ||--o{ ASSET_VALUES : "asset_item_id (월별 값)"

    TB_CODE {
        varchar CD_ID PK "공통코드ID (예:CD2110)"
        varchar CD_NM "공통코드명 (예:통신비)"
        int CD_LEVEL "코드레벨 (0=ROOT~4=세부항목)"
        varchar PARENT_CD_ID FK "부모코드ID (NULL=ROOT)"
        int SORT_ORDER "정렬순서"
        varchar REL_ORG_CD "관련 기관코드 (기관분류 참조, 선택)"
        varchar DEL_YN "소프트삭제 N/Y"
    }

    TB_TRANSACTION {
        varchar id PK "TR+년+월+코드숫자 (예:TR2026062143)"
        int tx_year "년"
        int tx_month "월"
        varchar category_code "대분류 코드값"
        varchar subcategory_code "소분류 코드값"
        bigint amount "금액"
        int transaction_day "결제일"
        int billing_day "청구일"
        varchar org_code "기관 코드값"
        varchar note "메모"
        bigint fixed_cost_id "고정비 자동생성 출처 (수동=NULL)"
        varchar del_yn "소프트삭제 N/Y"
    }

    FIXED_COSTS {
        bigint id PK
        varchar subcategory_code "고정비용 하위 분류 코드값"
        varchar item_name "항목명 (예:SKT 휴대폰)"
        bigint amount "기본 월 금액"
        varchar org_code "기관 코드값"
        int transaction_day "결제일"
        int billing_day "청구일"
        varchar note "메모"
        varchar del_yn "소프트삭제 N/Y"
    }

    PAYMENT_INSTITUTIONS {
        bigint id PK
        varchar code_id UK "카드사 코드 (기관분류>카드사 CD31xx)"
        int payment_day "결제일 (1~31)"
    }

    ASSET_ITEMS {
        bigint id PK
        varchar asset_type "구분 INCOME/EXPENSE/ASSET"
        varchar code_id "참조 공통코드 (소득/기관분류)"
        varchar item_name "표시명 (코드명 스냅샷)"
        int sort_order "정렬순서"
        varchar del_yn "소프트삭제 N/Y"
    }

    ASSET_VALUES {
        bigint id PK
        bigint asset_item_id FK "구성항목 ID"
        int tx_year "년 (UK)"
        int tx_month "월 (UK)"
        bigint amount "월별 금액"
    }

    LOAN_PLANS {
        bigint id PK
        int tx_year "년"
        int tx_month "월"
        bigint loan_amount "최초대출액"
        bigint interest_amount "이자금액"
        bigint repayment_amount "정기상환액"
        bigint extra_payment "추가상환액"
        bigint remaining_balance "대출잔액"
        decimal applied_rate "적용 연이자율(%)"
        int payment_day "이자지급일 (기본27)"
    }

    LOAN_INTEREST_RATES {
        bigint id PK
        int start_year "적용시작 년"
        int start_month "적용시작 월"
        int end_year "종료 년 (NULL=현재)"
        int end_month "종료 월 (NULL=현재)"
        decimal annual_rate "연이자율(%)"
        varchar note "메모"
        varchar del_yn "소프트삭제 N/Y"
    }
```

---

## 테이블 설명

### 1. `TB_CODE` — 공통코드 (중심 테이블)
모든 분류값을 코드로 관리. **자기참조(self-reference)** 계층 구조.

**코드체계**: `CD` + 4자리 `[대분류][중분류][소분류][세부]`
- `CD0000` = ROOT (L0)
- `CD1000` = 소득 (L1) / `CD2100` = 고정비용 (L2) / `CD2110` = 통신비 (L3) / `CD2111` = 세부항목 (L4)
- `REL_ORG_CD`: 소득/비용/투자 코드에 **관련 기관코드** 연결 → 거래 입력 시 기관 자동채움

```
CD0000 ROOT
├── CD1000 소득
│   ├── CD1100 급여 / CD1200 이자소득 / CD1300 배당소득
├── CD2000 비용
│   ├── CD2100 고정비용 → 통신비 / 관리비·세금 / 보험비 / 정기구독
│   └── CD2200 가변비용 → 카드값 / 기타
├── CD3000 기관분류
│   ├── CD3100 카드사 → 삼성/신한/현대/국민/비씨/하나
│   ├── CD3200 보험사 → 삼성화재/현대해상/동양생명/DB손해보험
│   ├── CD3300 은행   → 우리/신한/오케이저축/대신저축/새마을금고
│   └── CD3400 증권사 → 미래에셋/토스
└── CD4000 투자
    ├── CD4100 배당투자 / CD4200 퇴직연금
```

### 2. `TB_TRANSACTION` — 거래내역
월별 소득/지출 내역. 분류·기관을 **코드값(문자열)** 으로 참조.
`fixed_cost_id`가 있으면 고정비에서 자동 생성된 거래 (수동 입력은 NULL).

### 3. `fixed_costs` — 고정비 템플릿
매달 반복되는 고정비 항목. 소득/지출 내역에서 해당 월 진입 시 거래로 자동 생성됨.
`(fixed_cost_id, tx_year, tx_month)` 기준으로 중복 생성 방지.

### 4. `asset_items` — 자산현황 구성 항목
자산현황 그리드에 표시할 행(항목)을 사용자가 구성. `asset_type`(소득/지출/자산)별로 분류하며,
소득은 소득(CD1000) 코드, 지출·자산은 기관분류(CD3000) 코드를 참조.

### 5. `asset_values` — 자산현황 월별 값
구성항목 × 년 × 월 단위의 금액. `(asset_item_id, tx_year, tx_month)` 복합 유니크.
> 기존 고정형 와이드 테이블 `asset_snapshots`를 대체 (항목을 컬럼이 아닌 행으로 동적 구성).

### 6. `payment_institutions` — 결제기관(카드사) 결제일
기관분류>카드사 코드(`code_id`)별 결제일 관리. 소득/지출·고정비 입력 시 카드사 선택하면
이 결제일이 **결제일자(transaction_day)** 로 자동 채워짐. `code_id` 유니크.

### 7. `loan_plans` — 대출 월별 상환계획
`applied_rate`에 그 달 적용 이자율을 **스냅샷처럼 보존** (이자율이 나중에 바뀌어도 과거 기록 유지).

### 8. `loan_interest_rates` — 이자율 히스토리
구간(`start ~ end`)별 연이자율. `end`가 NULL이면 현재까지 유효.

---

## 관계 특징 (중요)

⚠️ **이 모델은 실제 외래키(FK) 제약을 걸지 않은 "논리적 참조" 구조입니다.**

| 관계 | 방식 | 이유 |
|------|------|------|
| `TB_CODE` → `TB_CODE` | `PARENT_CD_ID`로 자기참조 | 계층 구조 표현 |
| `TB_CODE` → `TB_CODE` | `REL_ORG_CD`로 관련기관 연결 | 거래 입력 시 기관 자동채움 |
| `payment_institutions` → `TB_CODE` | `code_id`로 카드사 참조 | 카드사별 결제일 매핑 |
| `TB_TRANSACTION` → `TB_CODE` | `category_code` 등 **코드값(CD_ID)** 으로 참조 | 코드 추가/삭제 유연성, 소프트삭제와 궁합 |
| `TB_TRANSACTION` → `fixed_costs` | `fixed_cost_id`로 출처 추적 | 월별 중복 생성 방지, 자동 생성 거래 식별 |
| `asset_items` → `TB_CODE` | `code_id`로 **코드값** 참조 | 자산현황 행을 코드 기반으로 동적 구성 |
| `asset_values` → `asset_items` | `asset_item_id`로 참조 | 구성항목×월 금액 (행=월, 열=항목 그리드) |

> **장점**: 코드를 소프트삭제(`del_yn='Y'`)해도 기존 거래내역이 깨지지 않음
> **주의**: DB가 무결성을 강제하지 않으므로, 코드값 존재 검증은 애플리케이션 레이어 책임
