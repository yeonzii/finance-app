package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * 공통코드
 *
 * codeGroup 계층 구조:
 *   대분류  (parentId=null) : 소득/비용/투자
 *   소득유형 (parentId=대분류ID) : 급여/이자소득/배당소득
 *   비용유형 (parentId=대분류ID) : 통신비/관리비/보험비/정기구독/카드값/기타
 *   투자유형 (parentId=대분류ID) : 배당투자/퇴직연금
 *   기관유형 (parentId=null) : 카드사/보험사/은행/증권사
 *   카드사   (parentId=기관유형ID) : 삼성카드/현대카드/...
 *   보험사   (parentId=기관유형ID) : 삼성화재/동양생명/...
 *   은행     (parentId=기관유형ID) : 우리은행/신한은행/...
 *   증권사   (parentId=기관유형ID) : 미래에셋/토스/...
 */
@Entity
@Table(name = "common_codes")
@Getter @Setter @NoArgsConstructor
public class CommonCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 코드 그룹 (대분류 / 소득유형 / 비용유형 / 투자유형 / 기관유형 / 카드사 / 보험사 / 은행 / 증권사)
    @Column(nullable = false)
    private String codeGroup;

    // 상위 코드 ID (null이면 최상위)
    private Long parentId;

    // 코드값 (영문, 그룹 내 유일) — H2 예약어 충돌 방지로 컬럼명 명시
    @Column(name = "code_val", nullable = false)
    private String code;

    // 화면 표시명
    @Column(nullable = false)
    private String codeName;

    private int sortOrder;

    // 소프트 삭제: N=정상, Y=삭제
    @Column(nullable = false)
    private String delYn = "N";
}
