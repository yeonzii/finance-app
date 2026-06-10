package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * 고정비 템플릿
 * - 매달 반복되는 고정비 항목을 등록
 * - 소득/지출 내역에서 해당 월을 열면 거래로 자동 생성됨
 * - 분류(subcategoryCode)는 '고정비용(CD2100)'의 하위 코드 (통신비/관리비/보험비/정기구독 등)
 */
@Entity
@Table(name = "fixed_costs")
@Getter @Setter @NoArgsConstructor
public class FixedCost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 분류 코드 (고정비용 하위 leaf, 예: CD2110 통신비)
    @Column(nullable = false)
    private String subcategoryCode;

    // 항목명 (예: SKT 휴대폰, 넷플릭스)
    @Column(nullable = false)
    private String itemName;

    // 기본 금액 (월별로 수정 가능)
    private Long amount;

    // 기관 코드 (선택)
    private String orgCode;

    // 거래일 / 청구일 (선택)
    private Integer transactionDay;
    private Integer billingDay;

    private String note;

    // 소프트 삭제: N=정상, Y=삭제
    @Column(nullable = false)
    private String delYn = "N";
}
