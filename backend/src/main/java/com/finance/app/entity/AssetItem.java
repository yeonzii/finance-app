package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * 자산현황 구성 항목
 * - 자산현황 그리드에 표시할 행(항목)을 사용자가 직접 구성
 * - assetType: INCOME(소득) / EXPENSE(지출) / ASSET(자산)
 * - codeId: 참조 공통코드 (소득=소득트리, 지출/자산=기관분류트리)
 */
@Entity
@Table(name = "asset_items")
@Getter @Setter @NoArgsConstructor
public class AssetItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 구분: INCOME / EXPENSE / ASSET
    @Column(nullable = false)
    private String assetType;

    // 참조 공통코드 (TB_CODE.CD_ID)
    @Column(nullable = false)
    private String codeId;

    // 표시명 (코드명 스냅샷)
    @Column(nullable = false)
    private String itemName;

    private int sortOrder;

    @Column(nullable = false)
    private String delYn = "N";
}
