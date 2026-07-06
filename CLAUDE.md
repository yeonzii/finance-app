# CLAUDE.md — 재정관리 앱 프로젝트 안내

> 새 세션은 이 파일을 먼저 읽고 작업을 이어가세요.
> 상세 히스토리는 [HISTORY.md](HISTORY.md), 데이터 모델은 [ERD.md](ERD.md) 참고.

## 프로젝트 개요
개인 재정관리 풀스택 웹앱. 소득/지출, 고정비, 자산현황, 대출상환, 공통코드를 관리.
- **GitHub**: https://github.com/yeonzii/finance-app (모든 작업은 main에 커밋·푸시)

## 기술 스택
| 영역 | 스택 |
|------|------|
| 백엔드 | Spring Boot 3.5 (Java 25), JPA/Hibernate |
| DB | MySQL (Docker, `financedb`, 계정 `finance`/`finance1234`, 3306) |
| 프론트 | React + Vite (포트 5173), axios |
| 백엔드 포트 | 8080 |

## 실행 방법 (노트북 재부팅 후에도 이 순서)
```bash
# 1) Docker Desktop 실행
open -a Docker                    # 데몬 기동까지 대기

# 2) MySQL 컨테이너
cd ~/finance-app && docker compose up -d

# 3) 백엔드 (빌드 후 jar 실행)
cd ~/finance-app/backend && ./mvnw clean package -q -DskipTests
java -jar target/finance-app-0.0.1-SNAPSHOT.jar &

# 4) 프론트엔드
cd ~/finance-app/frontend && npm run dev
```
- 데이터는 Docker 볼륨(`finance-mysql-data`)에 영구 저장 → 재부팅에도 보존.
- 백엔드만 재시작: `pkill -f 'finance-app-0.0.1-SNAPSHOT.jar'` 후 다시 `java -jar ...`
  (주의: `pkill -f finance-app`는 경로에 finance-app이 포함된 vite까지 죽이니 jar만 지정할 것)

## 핵심 데이터 모델 (자세한 건 ERD.md)
- **TB_CODE** (공통코드): PK=`CD_ID`(varchar), `CD`+4자리 계층 `[대분류][중분류][소분류][세부]`.
  자기참조(PARENT_CD_ID) + CD_LEVEL. `REL_ORG_CD`=관련 기관코드(소득/비용 → 기관 자동채움).
  - CD1000 소득 / CD2000 비용 / CD3000 기관분류 / CD4000 투자
  - 비용 하위: 고정비용(CD2100), 가변비용(CD2200 → 카드값 CD2210, 대출상환 CD2230[원리금상환 CD2231/원금추가상환 CD2232])
- **TB_TRANSACTION** (거래): PK=`TR+년+월+코드숫자`(예 TR2026062143). 소득/지출 내역.
- **fixed_costs**: 고정비 템플릿 → 소득/지출 월 진입 시 거래 자동생성(fixedCostId로 중복방지).
- **asset_items / asset_values**: 자산현황 구성항목 + 월별 값.
- **payment_institutions**: 카드사별 결제일.
- **loan_plans / loan_interest_rates**: 대출 월별 계획 + 이자율 히스토리.
- ⚠️ FK 없이 **코드값(문자열) 논리 참조**. 삭제는 대부분 `del_yn='Y'` 소프트삭제.

## 주요 자동화 규칙 (헷갈리기 쉬움)
- **고정비 → 거래**: 월 진입 시 자동생성. 고정비 수정은 **변경월 다음 달부터** 반영(이전 달 유지).
- **자산현황 자동 계산**: 소득=같은 달 / 지출은 **카드값=다음 달, 그 외 비용=당월**. 소득·지출 행은 읽기전용, 자산 행만 입력.
- **비용 카드 중복비용**: 고정비 중 관련기관이 카드사면 카드값과 중복 → 비용 소계에 (-)중복/(=)중복제거 표시.
- **대출 지출반영 버튼**: 원리금상환(이자+정기, 결제일/청구일=27) + 원금추가상환(일자 미세팅)을 해당 월 거래로 생성/갱신. 기관=코드의 REL_ORG_CD.
- **이자 계산**: 월할 `잔액 × 연이자율% ÷ 12`.

## 작업 규칙
- 변경은 **기능 단위로 커밋·푸시**(한글 커밋 메시지, `Co-Authored-By: Claude ...` 유지).
- UI 변경은 브라우저(claude-in-chrome)로 실제 확인 후 커밋.
- 테스트로 DB에 넣은 데이터는 검증 후 정리.
- 새 기능/모델 변경 시 **HISTORY.md·ERD.md 갱신**.

## 화면(탭) 구성
소득/지출 내역 · 고정비 관리 · 자산 현황 · 자산 항목 구성 · 대출 상환 계획 · 결제기관 관리 · 공통코드 관리
