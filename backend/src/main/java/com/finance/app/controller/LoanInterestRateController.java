package com.finance.app.controller;

import com.finance.app.entity.LoanInterestRate;
import com.finance.app.repository.LoanInterestRateRepository;
import com.finance.app.service.LoanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/loans/rates")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class LoanInterestRateController {

    private final LoanInterestRateRepository repo;
    private final LoanService loanService;

    // 전체 이자율 히스토리 (시간순)
    @GetMapping
    public List<LoanInterestRate> getAll() {
        return repo.findAllByOrderByStartYearAscStartMonthAsc();
    }

    // 특정 년월에 적용되는 이자율 + 이자액 계산
    @GetMapping("/calculate")
    public Map<String, Object> calculate(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false, defaultValue = "0") long balance) {

        Map<String, Object> result = new HashMap<>();
        loanService.getApplicableRate(year, month).ifPresentOrElse(rate -> {
            long interest = loanService.calculateMonthlyInterest(balance, rate.getAnnualRate(), year, month);
            long days = loanService.calcDays(year, month);
            result.put("rate", rate);
            result.put("annualRate", rate.getAnnualRate());
            result.put("interestAmount", interest);
            result.put("paymentDay", 27);
            result.put("days", days);
        }, () -> {
            result.put("rate", null);
            result.put("annualRate", null);
            result.put("interestAmount", null);
            result.put("paymentDay", 27);
        });
        return result;
    }

    @PostMapping
    public LoanInterestRate create(@RequestBody LoanInterestRate r) {
        r.setDelYn("N");
        return repo.save(r);
    }

    @PutMapping("/{id}")
    public LoanInterestRate update(@PathVariable Long id, @RequestBody LoanInterestRate r) {
        r.setId(id);
        return repo.save(r);
    }

    // 소프트 삭제
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.findById(id).ifPresent(r -> {
            r.setDelYn("Y");
            repo.save(r);
        });
    }
}
