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

    private Long loanAmount;       // 최초 대출액
    private Long interestAmount;   // 이자금액 (자동계산 or 수동 입력)
    private Long repaymentAmount;  // 정기 상환액
    private Long extraPayment;     // 추가 상환액
    private Long remainingBalance; // 대출 잔액

    // 이 달에 적용된 연이자율 (%) — 나중에 이자율이 바뀌어도 해당 월 기록 보존
    @Column(precision = 5, scale = 2)
    private BigDecimal appliedRate;

    // 이자 지급일 (기본 27일)
    private int paymentDay = 27;
}
