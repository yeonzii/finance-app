package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * 월 소비 목표액 (소비 내역 모니터링용)
 */
@Entity
@Table(name = "TB_SPENDING_BUDGET",
       uniqueConstraints = @UniqueConstraint(columnNames = {"budget_year", "budget_month"}))
@Getter @Setter @NoArgsConstructor
public class SpendingBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "budget_year", nullable = false)
    private int year;

    @Column(name = "budget_month", nullable = false)
    private int month;

    // 월 목표 소비액
    private Long amount;
}
