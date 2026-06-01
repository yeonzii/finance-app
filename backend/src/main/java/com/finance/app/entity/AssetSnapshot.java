package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * 월별 자산 현황 스냅샷
 * 이미지 2의 각 행에 해당
 */
@Entity
@Table(name = "asset_snapshots", uniqueConstraints = @UniqueConstraint(columnNames = {"year", "month"}))
@Getter @Setter @NoArgsConstructor
public class AssetSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tx_year")
    private int year;
    @Column(name = "tx_month")
    private int month;

    // 수입
    private Long salary;
    private Long interest;
    private Long totalIncome;

    // 은행 잔액
    private Long wooriBalance;
    private Long shinhanBalance;

    // 카드 합계
    private Long samsungCard;
    private Long shinhanCard;
    private Long hyundaiCard;
    private Long kookminCard;
    private Long bcCard;
    private Long hanaCard;
    private Long totalCard;

    // 예상잔액 = 은행잔액 합계 - 카드합계
    private Long expectedBalance;

    // 저축/투자
    private Long savings;       // 대신저축은행, 오케이뱅크 등
    private Long okayBank;
    private Long namuCj;
    private Long realOhMoney;
    private Long tossBanking;
    private Long miraeAsset;
    private Long miraeAssetTotal;

    // 은행 총합
    private Long bankTotal;

    // 퇴직연금 IRP
    private Long retirementIrp;

    // 총 자산
    private Long totalAssets;
}
