package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 대출 이자율 히스토리
 * - 6개월마다 변동 가능
 * - startYear/Month ~ endYear/Month 구간에 annualRate 적용
 * - endYear/Month가 null이면 현재까지 유효
 */
@Entity
@Table(name = "loan_interest_rates")
@Getter @Setter @NoArgsConstructor
public class LoanInterestRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "start_year", nullable = false)
    private int startYear;

    @Column(name = "start_month", nullable = false)
    private int startMonth;

    // null = 현재까지 유효
    @Column(name = "end_year")
    private Integer endYear;

    @Column(name = "end_month")
    private Integer endMonth;

    // 연이자율 (%), 예: 3.50 → 3.50%
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal annualRate;

    private String note;

    @Column(nullable = false)
    private String delYn = "N";
}
