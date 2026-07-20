package com.finance.app.controller;

import com.finance.app.entity.LoanPlan;
import com.finance.app.entity.Transaction;
import com.finance.app.repository.CommonCodeRepository;
import com.finance.app.repository.LoanPlanRepository;
import com.finance.app.repository.TransactionRepository;
import com.finance.app.service.LoanScheduleService;
import com.finance.app.service.LoanService;
import com.finance.app.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class LoanPlanController {

    private final LoanPlanRepository repo;
    private final LoanService loanService;
    private final LoanScheduleService scheduleService;
    private final TransactionRepository txRepo;
    private final TransactionService txService;
    private final CommonCodeRepository codeRepo;

    // 비용 대분류 / 원리금상환·원금추가상환 코드
    private static final String EXPENSE = "CD2000";
    private static final String PRINCIPAL_INTEREST = "CD2231"; // 원리금상환
    private static final String EXTRA_PRINCIPAL = "CD2232";    // 원금추가상환

    @GetMapping
    public List<LoanPlan> getAll() {
        return repo.findAllByOrderByYearAscMonthAsc();
    }

    @PostMapping
    public LoanPlan create(@RequestBody LoanPlan l) {
        // 이자율이 지정되지 않았으면 해당 월 적용 이자율 자동 조회
        if (l.getAppliedRate() == null) {
            loanService.getApplicableRate(l.getYear(), l.getMonth())
                    .ifPresent(rate -> l.setAppliedRate(rate.getAnnualRate()));
        }
        // 이자액이 0이고 잔액과 이자율이 있으면 자동 계산
        if ((l.getInterestAmount() == null || l.getInterestAmount() == 0)
                && l.getLoanAmount() != null && l.getAppliedRate() != null) {
            l.setInterestAmount(
                loanService.calculateMonthlyInterest(l.getLoanAmount(), l.getAppliedRate(), l.getYear(), l.getMonth())
            );
        }
        if (l.getPaymentDay() == 0) l.setPaymentDay(27);
        return repo.save(l);
    }

    @PutMapping("/{id}")
    public LoanPlan update(@PathVariable Long id, @RequestBody LoanPlan l) {
        l.setId(id);
        if (l.getPaymentDay() == 0) l.setPaymentDay(27);
        LoanPlan saved = repo.save(l);
        // 추가상환 등 변경 → 이 달부터 이후 스케줄 자동 재계산
        scheduleService.recalcFrom(saved.getYear(), saved.getMonth());
        return repo.findById(id).orElse(saved);
    }

    /**
     * 30년(months) 상환 스케줄 전체 생성 (기존 데이터 대체, 추가상환액은 보존).
     */
    @PostMapping("/schedule/generate")
    public List<LoanPlan> generateSchedule(@RequestParam int year, @RequestParam int month,
                                           @RequestParam long openingBalance,
                                           @RequestParam BigDecimal annualRate,
                                           @RequestParam(defaultValue = "360") int months) {
        return scheduleService.generate(year, month, openingBalance, annualRate, months);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }

    /**
     * 지출반영: 해당 월 소득/지출 내역에 원리금상환·원금추가상환 거래를 생성/갱신.
     * - 원리금상환액 = 이자금액 + 정기상환액
     * - 원금추가상환 = 추가상환액 (0이면 기존 거래 제거)
     */
    @PostMapping("/{id}/reflect-expense")
    public Map<String, Object> reflectExpense(@PathVariable Long id) {
        LoanPlan l = repo.findById(id).orElseThrow();
        int payDay = l.getPaymentDay() > 0 ? l.getPaymentDay() : 27; // 결제일 (기본 27)
        long principalInterest = nz(l.getInterestAmount()) + nz(l.getRepaymentAmount());
        // 원리금상환: 결제일·청구일 모두 27(대출 결제일)
        upsertExpense(l.getYear(), l.getMonth(), PRINCIPAL_INTEREST, principalInterest, "원리금상환", payDay, payDay);

        long extra = nz(l.getExtraPayment());
        if (extra > 0) {
            // 원금추가상환: 결제일 자동세팅 없음
            upsertExpense(l.getYear(), l.getMonth(), EXTRA_PRINCIPAL, extra, "원금추가상환", null, null);
        } else {
            removeExpense(l.getYear(), l.getMonth(), EXTRA_PRINCIPAL);
        }
        // 이 달을 '상환 반영됨'으로 표시 → 현재 대출잔액 기준
        l.setReflectedYn("Y");
        repo.save(l);
        return Map.of("ok", true, "principalInterest", principalInterest, "extra", extra,
                "remainingBalance", nz(l.getRemainingBalance()));
    }

    private long nz(Long v) { return v == null ? 0L : v; }

    private String txIdFor(int year, int month, String subCd) {
        Transaction probe = new Transaction();
        probe.setYear(year);
        probe.setMonth(month);
        probe.setSubcategoryCode(subCd);
        return txService.generateId(probe); // TR+년+월+코드숫자
    }

    private void upsertExpense(int year, int month, String subCd, long amount, String note,
                              Integer transactionDay, Integer billingDay) {
        String txId = txIdFor(year, month, subCd);
        Transaction t = txRepo.findById(txId).orElseGet(Transaction::new);
        t.setId(txId);
        t.setYear(year);
        t.setMonth(month);
        t.setCategoryCode(EXPENSE);
        t.setSubcategoryCode(subCd);
        t.setAmount(amount);
        if (transactionDay != null) t.setTransactionDay(transactionDay); // 결제일
        if (billingDay != null) t.setBillingDay(billingDay);             // 청구일
        t.setNote(note);
        // 코드의 관련기관(REL_ORG_CD)을 기관으로 반영 (예: 새마을금고)
        String orgCd = codeRepo.findById(subCd).map(c -> c.getRelOrgCd()).orElse(null);
        if (orgCd != null && !orgCd.isBlank()) t.setOrgCode(orgCd);
        t.setDelYn("N");
        txRepo.save(t);
    }

    private void removeExpense(int year, int month, String subCd) {
        txRepo.findById(txIdFor(year, month, subCd)).ifPresent(t -> {
            t.setDelYn("Y");
            txRepo.save(t);
        });
    }
}
