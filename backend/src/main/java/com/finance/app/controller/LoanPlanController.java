package com.finance.app.controller;

import com.finance.app.entity.LoanPlan;
import com.finance.app.repository.LoanPlanRepository;
import com.finance.app.service.LoanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class LoanPlanController {

    private final LoanPlanRepository repo;
    private final LoanService loanService;

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
        return repo.save(l);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
