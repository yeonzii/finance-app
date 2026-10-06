package com.finance.app.controller;

import com.finance.app.entity.SpendingBudget;
import com.finance.app.repository.SpendingBudgetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class SpendingBudgetController {

    private final SpendingBudgetRepository repo;

    /** 해당 월 목표액 조회 (없으면 null 본문) */
    @GetMapping
    public SpendingBudget get(@RequestParam int year, @RequestParam int month) {
        return repo.findByYearAndMonth(year, month).orElse(null);
    }

    /** 목표액 설정/변경 (월 단위 upsert) */
    @PostMapping
    public SpendingBudget save(@RequestBody SpendingBudget body) {
        SpendingBudget b = repo.findByYearAndMonth(body.getYear(), body.getMonth())
                               .orElseGet(SpendingBudget::new);
        b.setYear(body.getYear());
        b.setMonth(body.getMonth());
        b.setAmount(body.getAmount());
        return repo.save(b);
    }
}
