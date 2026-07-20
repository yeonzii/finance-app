package com.finance.app.service;

import com.finance.app.entity.LoanPlan;
import com.finance.app.repository.LoanPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 대출 상환 스케줄 (원리금균등상환 · 기간유지형)
 *
 * 매달 계산:
 *   r    = 연이자율(%) / 100 / 12            (월이자율)
 *   이자 = FLOOR(월초잔액 × r)                (원단위 절사)
 *   M    = ROUND(PMT) = ROUND(P·r·(1+r)^n / ((1+r)^n − 1))   (총상환액)
 *   정기 = M − 이자                          (원금분)
 *   월말 = 월초 − 정기 − 추가상환
 *   다음달: 월초 = 이번달 월말, n = n − 1     (추가상환과 무관)
 */
@Service
@RequiredArgsConstructor
public class LoanScheduleService {

    private static final MathContext MC = MathContext.DECIMAL128;

    private final LoanPlanRepository repo;
    private final LoanService loanService; // 월별 적용 이자율 조회

    /** 한 달 상환 계산 결과 */
    public record MonthResult(long interest, long totalPayment, long principal, long closing) {}

    /**
     * 한 달치 원리금균등(기간유지형) 계산. 순수 함수 — 테스트에서 직접 호출.
     */
    public static MonthResult calcMonth(long openingBalance, BigDecimal annualRatePercent, int n, long extraPayment) {
        BigDecimal P = BigDecimal.valueOf(openingBalance);
        BigDecimal r = annualRatePercent.divide(BigDecimal.valueOf(1200), MC); // %/100/12

        // 이자 = FLOOR(P × r)
        long interest = P.multiply(r, MC).setScale(0, RoundingMode.FLOOR).longValue();

        long totalPayment;
        if (n <= 1 || r.signum() == 0) {
            // 마지막 회차 등 예외: 남은 원금 + 이자 전액
            totalPayment = openingBalance + interest;
        } else {
            BigDecimal q = BigDecimal.ONE.add(r).pow(n, MC);           // (1+r)^n
            BigDecimal pmt = P.multiply(r, MC).multiply(q, MC)
                    .divide(q.subtract(BigDecimal.ONE), MC);            // P·r·q/(q−1)
            // 백의 자리에서 버림 (100원 미만 절사) — 은행 고지 방식
            totalPayment = pmt.setScale(-2, RoundingMode.FLOOR).longValue();
        }

        long principal = totalPayment - interest;
        long closing = openingBalance - principal - extraPayment;
        return new MonthResult(interest, totalPayment, principal, closing);
    }

    // ── 스케줄 생성 (30년치 전체 도출) ────────────────────────────────
    /**
     * 시작 시점부터 months 개월치 스케줄을 생성(기존 데이터 대체).
     * 각 월의 추가상환액은 기존 값이 있으면 보존한다.
     */
    public List<LoanPlan> generate(int startYear, int startMonth, long openingBalance,
                                   BigDecimal defaultRate, int months) {
        // 기존 추가상환액·지출반영 여부 보존 (ym → …)
        Map<Integer, Long> extras = new HashMap<>();
        Map<Integer, String> reflected = new HashMap<>();
        for (LoanPlan p : repo.findAll()) {
            int ym = p.getYear() * 100 + p.getMonth();
            extras.put(ym, nz(p.getExtraPayment()));
            reflected.put(ym, p.getReflectedYn());
        }
        repo.deleteAll();

        long opening = openingBalance;
        int y = startYear, m = startMonth;
        for (int i = 0; i < months && opening > 0; i++) {
            int n = months - i;                       // 잔여개월: 첫 달 = months
            BigDecimal rate = rateFor(y, m, defaultRate);
            long extra = extras.getOrDefault(y * 100 + m, 0L);

            LoanPlan p = buildRow(y, m, opening, rate, n, extra);
            p.setReflectedYn(reflected.getOrDefault(y * 100 + m, "N"));
            repo.save(p);

            opening = nz(p.getRemainingBalance());
            int[] nm = nextMonth(y, m); y = nm[0]; m = nm[1];
        }
        return repo.findAllByOrderByYearAscMonthAsc();
    }

    // ── 특정 월부터 이후 전체 재계산 (추가상환 입력 시) ────────────────
    /**
     * (fromYear, fromMonth) 이후의 모든 행을 재계산.
     * 각 행의 추가상환액·잔여개월·적용이자율은 유지, 잔액 체인만 다시 계산.
     */
    public void recalcFrom(int fromYear, int fromMonth) {
        List<LoanPlan> rows = repo.findAllByOrderByYearAscMonthAsc();
        int startIdx = -1;
        for (int i = 0; i < rows.size(); i++) {
            if (rows.get(i).getYear() * 100 + rows.get(i).getMonth() == fromYear * 100 + fromMonth) {
                startIdx = i; break;
            }
        }
        if (startIdx < 0) return;

        // 시작 월의 월초잔액 = 첫 행이면 자신의 월초잔액, 아니면 직전 행의 월말잔액
        long opening = startIdx == 0 ? nz(rows.get(0).getLoanAmount())
                                     : nz(rows.get(startIdx - 1).getRemainingBalance());

        for (int i = startIdx; i < rows.size(); i++) {
            LoanPlan p = rows.get(i);
            int n = p.getRemainingMonths() != null ? p.getRemainingMonths() : 1;
            BigDecimal rate = p.getAppliedRate() != null ? p.getAppliedRate() : BigDecimal.ZERO;
            MonthResult res = calcMonth(opening, rate, n, nz(p.getExtraPayment()));

            p.setLoanAmount(opening);
            p.setInterestAmount(res.interest());
            p.setRepaymentAmount(res.principal());
            p.setRemainingBalance(res.closing());
            repo.save(p);

            opening = res.closing();
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────
    private LoanPlan buildRow(int y, int m, long opening, BigDecimal rate, int n, long extra) {
        MonthResult res = calcMonth(opening, rate, n, extra);
        LoanPlan p = new LoanPlan();
        p.setYear(y);
        p.setMonth(m);
        p.setLoanAmount(opening);
        p.setAppliedRate(rate);
        p.setRemainingMonths(n);
        p.setInterestAmount(res.interest());
        p.setRepaymentAmount(res.principal());
        p.setExtraPayment(extra);
        p.setRemainingBalance(res.closing());
        p.setPaymentDay(27);
        return p;
    }

    private BigDecimal rateFor(int y, int m, BigDecimal defaultRate) {
        return loanService.getApplicableRate(y, m).map(r -> r.getAnnualRate()).orElse(defaultRate);
    }

    private int[] nextMonth(int y, int m) {
        return m == 12 ? new int[]{y + 1, 1} : new int[]{y, m + 1};
    }

    private long nz(Long v) { return v == null ? 0L : v; }
}
