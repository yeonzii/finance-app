package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * 자산현황 월별 값
 * - 구성항목(asset_item) × 년 × 월 단위의 금액
 */
@Entity
@Table(name = "asset_values",
       uniqueConstraints = @UniqueConstraint(columnNames = {"asset_item_id", "tx_year", "tx_month"}))
@Getter @Setter @NoArgsConstructor
public class AssetValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_item_id", nullable = false)
    private Long assetItemId;

    @Column(name = "tx_year", nullable = false)
    private int year;

    @Column(name = "tx_month", nullable = false)
    private int month;

    private Long amount;
}
