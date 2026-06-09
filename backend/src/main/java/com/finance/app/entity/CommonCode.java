package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * 공통코드 (TB_CODE)
 *
 * 코드체계: CD + 4자리 계층번호
 *   [대분류][중분류][소분류][예비]
 *   CD0000 = ROOT (최상위)
 *   CD1000 = 소득 (L1)
 *   CD2100 = 고정비용 (L2, parent=CD2000)
 *   CD2110 = 통신비 (L3, parent=CD2100)
 *
 * 계층은 PARENT_CD_ID + CD_LEVEL 로 표현 (자기참조)
 */
@Entity
@Table(name = "TB_CODE")
@Getter @Setter @NoArgsConstructor
public class CommonCode {

    // 공통코드ID (PK, 예: CD0000) — 직접 부여
    @Id
    @Column(name = "CD_ID", length = 10)
    private String cdId;

    // 공통코드명 (예: 소득)
    @Column(name = "CD_NM", nullable = false)
    private String cdNm;

    // 코드레벨 (0=ROOT, 1=대분류, 2=중분류, 3=소분류)
    @Column(name = "CD_LEVEL", nullable = false)
    private int cdLevel;

    // 부모코드ID (null이면 최상위 ROOT)
    @Column(name = "PARENT_CD_ID", length = 10)
    private String parentCdId;

    // 정렬순서 (같은 부모 내 순서)
    @Column(name = "SORT_ORDER")
    private Integer sortOrder;

    // 소프트삭제: N=정상, Y=삭제
    @Column(name = "DEL_YN", nullable = false, length = 1)
    private String delYn = "N";
}
