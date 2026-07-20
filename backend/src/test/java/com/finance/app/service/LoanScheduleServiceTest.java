package com.finance.app.service;

import com.finance.app.service.LoanScheduleService.MonthResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 원리금균등(기간유지형) 계산 검증.
 * 은행 고지서 실제값 기준이라 총상환액/정기상환액은 몇천 원 오차 허용.
 * 이자금액(FLOOR)과 월말잔액 체인은 정확히 일치해야 함.
 */
class LoanScheduleServiceTest {

    private static final BigDecimal RATE = new BigDecimal("4.20"); // 연 4.2%

    // 총상환액을 백의자리 버림(100원 미만 절사)하면 은행 고지값과 정확히 일치한다.
    @Test
    void 계산_2026_05() {
        // 월초 830,000,000, n=360, 추가상환 1,000,000
        MonthResult r = LoanScheduleService.calcMonth(830_000_000L, RATE, 360, 1_000_000L);

        assertEquals(2_905_000L, r.interest(), "이자금액");
        assertEquals(1_153_800L, r.principal(), "정기상환액");
        assertEquals(827_846_200L, r.closing(), "월말잔액(다음달 06월 월초)");
    }

    @Test
    void 계산_2026_06() {
        // 월초 827,846,200, n=359, 추가상환 20,000,000
        MonthResult r = LoanScheduleService.calcMonth(827_846_200L, RATE, 359, 20_000_000L);

        assertEquals(2_897_461L, r.interest(), "이자금액");
        assertEquals(1_156_439L, r.principal(), "정기상환액");
        assertEquals(806_689_761L, r.closing(), "월말잔액(다음달 07월 월초)");
    }

    @Test
    void 계산_2026_07() {
        // 월초 806,689,761, n=358, 추가상환 0
        MonthResult r = LoanScheduleService.calcMonth(806_689_761L, RATE, 358, 0L);

        assertEquals(2_823_414L, r.interest(), "이자금액");
        assertEquals(1_132_386L, r.principal(), "정기상환액");
    }

    // 총상환액은 100원 단위 (백의자리 버림)
    @Test
    void 총상환액은_100원_단위() {
        MonthResult r = LoanScheduleService.calcMonth(830_000_000L, RATE, 360, 0L);
        assertEquals(0, r.totalPayment() % 100, "총상환액은 100원 단위여야");
    }

    @Test
    void 총상환액은_이자와_정기의_합() {
        MonthResult r = LoanScheduleService.calcMonth(830_000_000L, RATE, 360, 0L);
        assertEquals(r.interest() + r.principal(), r.totalPayment(), "M = 이자 + 정기");
    }

    @Test
    void 추가상환이_잔액을_초과해도_월말잔액은_0_이하로_내려가지_않는다() {
        // 잔액 1,000,000인데 추가상환 5,000,000 → 완납, 잔액 0 (마이너스 없음)
        MonthResult r = LoanScheduleService.calcMonth(1_000_000L, RATE, 10, 5_000_000L);
        assertEquals(0L, r.closing(), "월말잔액은 0 (마이너스 금지)");
        assertTrue(r.principal() <= 1_000_000L, "정기상환액은 잔액을 넘지 않음");
    }

    @Test
    void 추가상환은_잔액만_줄이고_이자정기는_불변() {
        MonthResult noExtra = LoanScheduleService.calcMonth(830_000_000L, RATE, 360, 0L);
        MonthResult withExtra = LoanScheduleService.calcMonth(830_000_000L, RATE, 360, 10_000_000L);

        assertEquals(noExtra.interest(), withExtra.interest(), "이자 동일");
        assertEquals(noExtra.principal(), withExtra.principal(), "정기 동일");
        assertEquals(noExtra.closing() - 10_000_000L, withExtra.closing(), "월말잔액은 추가상환만큼 감소");
    }
}
