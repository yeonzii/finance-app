package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "TB_TRANSACTION")
@Getter @Setter @NoArgsConstructor
public class Transaction {

    // 거래 ID: "TR" + 년 + 월(2자리) + 소분류 코드숫자(CD 제외)
    // 예: 2026년 6월, CD2141 → TR2026062141
    @Id
    @Column(name = "id", length = 20)
    private String id;

    @Column(name = "tx_year", nullable = false)
    private int year;

    @Column(name = "tx_month", nullable = false)
    private int month;

    // 대분류 코드 (TB_CODE.CD_ID, 예: CD2000 비용)
    private String categoryCode;

    // 소분류(말단) 코드 (TB_CODE.CD_ID, 예: CD2141)
    private String subcategoryCode;

    private Long amount;

    private Integer transactionDay;

    private Integer billingDay;

    // 기관 코드 (common_codes.code where codeGroup IN 카드사/보험사/은행/증권사)
    // bank + cardCompany를 하나로 통합
    private String orgCode;

    private String note;

    // 고정비에서 자동 생성된 거래면 원본 고정비 ID (수동 거래는 null)
    private Long fixedCostId;

    // 소프트 삭제: N=정상, Y=삭제
    @Column(nullable = false)
    private String delYn = "N";
}
