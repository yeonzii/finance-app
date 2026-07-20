package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "loan_plans")
@Getter @Setter @NoArgsConstructor
public class LoanPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tx_year", nullable = false)
    private int year;

    @Column(name = "tx_month", nullable = false)
    private int month;

    private Long loanAmount;       // 월초 대출잔액 (opening balance)
    private Long interestAmount;   // 이자금액 = FLOOR(월초잔액 × 월이자율)
    private Long repaymentAmount;  // 정기 상환액(원금분) = 총상환액 − 이자금액
    private Long extraPayment;     // 추가 상환액
    private Long remainingBalance; // 월말 대출잔액 (closing) = 월초 − 정기 − 추가

    // 잔여 상환개월수 (기간유지형: 추가상환과 무관하게 매달 −1)
    private Integer remainingMonths;

    // 지출반영 여부 (Y=이 달 상환을 소득/지출에 반영함 → 현재잔액 기준)
    @Column(length = 1)
    private String reflectedYn = "N";

    // 이 달에 적용된 연이자율 (%) — 나중에 이자율이 바뀌어도 해당 월 기록 보존
    @Column(precision = 5, scale = 2)
    private BigDecimal appliedRate;

    // 이자 지급일 (기본 27일)
    private int paymentDay = 27;
}
