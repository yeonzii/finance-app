package com.finance.app.service;

import com.finance.app.service.ConsumptionParser.Parsed;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 실제 카드사 승인 문자/알림 5건 기준 파싱 검증.
 * MM/DD 형식은 연도가 실행 시점에 따라 달라질 수 있어 월/일/시/분만 검증.
 */
class ConsumptionParserTest {

    @Test
    void 삼성_한줄형() {
        Parsed p = ConsumptionParser.parse("삼성카드승인 류연지님 35,200원 일시불 10/01 12:34 스타벅스강남점");
        assertEquals("CD2211", p.cardCode());
        assertEquals(35_200L, p.amount());
        assertEquals("스타벅스강남점", p.merchant());
        assertEquals(10, p.usedAt().getMonthValue());
        assertEquals(1, p.usedAt().getDayOfMonth());
        assertEquals(12, p.usedAt().getHour());
        assertEquals(34, p.usedAt().getMinute());
    }

    @Test
    void 삼성_여러줄_누적금액제외() {
        Parsed p = ConsumptionParser.parse("삼성9293승인 류*지\n70,700원 일시불\n10/01 09:23 경찰청과태료-온\n누적2,709,852원");
        assertEquals("CD2211", p.cardCode());
        assertEquals(70_700L, p.amount(), "누적금액이 아닌 결제금액");
        assertEquals("경찰청과태료-온", p.merchant());
        assertEquals(9, p.usedAt().getHour());
    }

    @Test
    void 국민_가맹점_별도줄() {
        Parsed p = ConsumptionParser.parse("KB국민카드4000승인\n류*지님\n32,000원 일시불\n09/30 22:28\nAPPLE\n누적474,600원");
        assertEquals("CD2212", p.cardCode());
        assertEquals(32_000L, p.amount());
        assertEquals("APPLE", p.merchant());
        assertEquals(30, p.usedAt().getDayOfMonth());
    }

    @Test
    void 카드명없음_신한기본_결제유형힌트제외() {
        Parsed p = ConsumptionParser.parse("온라인쇼핑\nCJCGV(씨제이씨지브이)\n11,400원\n2026.09.30 19:10:30");
        assertEquals("CD2213", p.cardCode(), "카드명 없으면 신한 기본");
        assertEquals(11_400L, p.amount());
        assertEquals("CJCGV(씨제이씨지브이)", p.merchant(), "온라인쇼핑은 가맹점 아님");
        assertEquals(2026, p.usedAt().getYear());
        assertEquals(9, p.usedAt().getMonthValue());
        assertEquals(30, p.usedAt().getDayOfMonth());
        assertEquals(19, p.usedAt().getHour());
    }

    @Test
    void 현대_상호_첫줄() {
        Parsed p = ConsumptionParser.parse("뚜레쥬르검단신도시\n5,880원\n류연지 님, 현대 CJ M 승인 일시불, 10/1 17:51\n누적666,753원");
        assertEquals("CD2214", p.cardCode());
        assertEquals(5_880L, p.amount());
        assertEquals("뚜레쥬르검단신도시", p.merchant());
        assertEquals(17, p.usedAt().getHour());
        assertEquals(51, p.usedAt().getMinute());
    }
}
