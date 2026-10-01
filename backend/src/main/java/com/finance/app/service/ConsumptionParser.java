package com.finance.app.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 카드 승인 문자/알림 파싱 (순수 함수). 카드사마다 형식이 달라 휴리스틱으로 추출.
 * 추출: 카드코드 · 금액 · 사용일시 · 가맹점. 미식별 카드는 신한(CD2213) 기본.
 */
public class ConsumptionParser {

    /** 파싱 결과 */
    public record Parsed(String cardCode, Long amount, LocalDateTime usedAt, String merchant) {}

    // 카드 키워드 → 코드 (앞에서부터 매칭). KB국민은 국민보다 먼저 둘 필요는 없음(같은 코드)
    private static final String[][] CARDS = {
        {"삼성", "CD2211"},
        {"KB국민", "CD2212"}, {"국민", "CD2212"},
        {"신한", "CD2213"},
        {"현대", "CD2214"},
        {"비씨", "CD2215"}, {"BC", "CD2215"},
        {"하나", "CD2216"},
    };
    private static final String DEFAULT_CARD = "CD2213"; // 카드명 없으면 신한

    // 결제유형 힌트(가맹점 아님)
    private static final java.util.Set<String> TYPE_HINTS =
        java.util.Set.of("온라인쇼핑", "오프라인쇼핑", "해외승인", "해외", "국내");

    private static final Pattern NAME = Pattern.compile("류\\*?연?지\\s*님?|류연지\\s*님?");
    private static final Pattern AMOUNT = Pattern.compile("([\\d,]{2,})\\s*원");
    private static final Pattern DT_FULL =
        Pattern.compile("(20\\d{2})[.\\-/](\\d{1,2})[.\\-/](\\d{1,2})\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?");
    private static final Pattern DT_MD_TIME = Pattern.compile("(\\d{1,2})/(\\d{1,2})\\s+(\\d{1,2}):(\\d{2})");
    private static final Pattern DT_MD = Pattern.compile("(\\d{1,2})/(\\d{1,2})");
    private static final Pattern AFTER_TIME = Pattern.compile("\\d{1,2}:\\d{2}\\s+(.+)$");

    public static Parsed parse(String raw) {
        String text = raw == null ? "" : raw.trim();
        return new Parsed(detectCard(text), parseAmount(text), parseDateTime(text), parseMerchant(text));
    }

    static String detectCard(String t) {
        for (String[] c : CARDS) if (t.contains(c[0])) return c[1];
        return DEFAULT_CARD;
    }

    static Long parseAmount(String t) {
        StringBuilder sb = new StringBuilder();
        for (String line : t.split("\\n")) if (!line.contains("누적")) sb.append(line).append("\n");
        Matcher m = AMOUNT.matcher(sb);
        if (m.find()) return Long.parseLong(m.group(1).replace(",", ""));
        return null;
    }

    static LocalDateTime parseDateTime(String t) {
        Matcher m = DT_FULL.matcher(t);
        if (m.find()) return of(num(m,1), num(m,2), num(m,3), num(m,4), num(m,5));
        m = DT_MD_TIME.matcher(t);
        if (m.find()) return of(inferYear(num(m,1)), num(m,1), num(m,2), num(m,3), num(m,4));
        m = DT_MD.matcher(t);
        if (m.find()) return of(inferYear(num(m,1)), num(m,1), num(m,2), 0, 0);
        return null;
    }

    static String parseMerchant(String t) {
        String[] raws = t.split("\\n");
        // 1) 시각 뒤에 상호가 붙은 경우: "10/01 12:34 스타벅스강남점"
        for (String l : raws) {
            String line = l.strip();
            if (line.contains("누적")) continue;
            Matcher m = AFTER_TIME.matcher(line);
            if (m.find()) {
                String cand = m.group(1).strip();
                if (!cand.isEmpty() && !cand.endsWith("원")) return cand;
            }
        }
        // 2) 그 외: 금액/날짜/카드/이름/누적/힌트 아닌 첫 줄
        for (String l : raws) {
            String line = l.strip();
            if (line.isEmpty() || isJunk(line)) continue;
            return line;
        }
        return null;
    }

    private static boolean isJunk(String l) {
        if (l.contains("누적") || l.contains("승인") || l.contains("일시불") || l.contains("할부")) return true;
        if (TYPE_HINTS.contains(l)) return true;
        if (AMOUNT.matcher(l).find()) return true;
        if (DT_FULL.matcher(l).find() || DT_MD_TIME.matcher(l).find() || DT_MD.matcher(l).find()) return true;
        if (NAME.matcher(l).matches()) return true;
        for (String[] c : CARDS) if (l.startsWith(c[0])) return true;
        return false;
    }

    // ── 헬퍼 ───────────────────────────────────────────
    private static int num(Matcher m, int g) { return Integer.parseInt(m.group(g)); }

    private static LocalDateTime of(int y, int mo, int d, int h, int mi) {
        try { return LocalDateTime.of(y, mo, d, h, mi); }
        catch (Exception e) { return null; }
    }

    /** MM/DD만 있을 때 연도 추론: 올해 기준, 다음해로 2달 이상 미래면 작년으로 */
    private static int inferYear(int month) {
        LocalDate now = LocalDate.now();
        int y = now.getYear();
        if (month > now.getMonthValue() + 1) y -= 1;
        return y;
    }
}
