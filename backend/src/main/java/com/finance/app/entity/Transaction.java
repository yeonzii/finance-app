package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "transactions")
@Getter @Setter @NoArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tx_year", nullable = false)
    private int year;

    @Column(name = "tx_month", nullable = false)
    private int month;

    // 대분류 코드 (common_codes.code where codeGroup='대분류')
    // 예: INCOME / EXPENSE / INVEST
    private String categoryCode;

    // 소분류 코드 (common_codes.code where codeGroup IN 소득유형/비용유형/투자유형)
    // 예: SALARY / COMM / DIV_INVEST
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
