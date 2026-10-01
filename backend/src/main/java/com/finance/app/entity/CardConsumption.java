package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 카드 건별 소비내역 (카드 승인 문자/알림을 파싱해 저장)
 */
@Entity
@Table(name = "TB_CARD_CONSUMPTION")
@Getter @Setter @NoArgsConstructor
public class CardConsumption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 소비(사용) 연·월 — used_at 기준, 월별 집계용
    @Column(name = "used_year", nullable = false)
    private int year;

    @Column(name = "used_month", nullable = false)
    private int month;

    // 사용 일시
    private LocalDateTime usedAt;

    // 카드 코드 (TB_CODE: CD2211 삼성 … CD2216 하나). 미식별 시 신한(CD2213) 기본
    private String cardCode;

    // 결제 금액
    private Long amount;

    // 가맹점명
    private String merchant;

    // 소비 카테고리 코드 (TB_CODE: CD51xx~CD53xx 소비항목). 미분류면 null
    private String categoryCode;

    private String memo;

    // 원본 문자 전문
    @Column(columnDefinition = "TEXT")
    private String rawText;

    // 원본 파일명 (중복 적재 방지용)
    private String sourceFile;

    @Column(nullable = false)
    private String delYn = "N";

    private LocalDateTime createdAt;
}
