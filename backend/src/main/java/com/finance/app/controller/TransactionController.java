package com.finance.app.controller;

import com.finance.app.entity.Transaction;
import com.finance.app.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class TransactionController {

    private final TransactionRepository repo;

    @GetMapping
    public List<Transaction> getAll(@RequestParam(required = false) Integer year,
                                    @RequestParam(required = false) Integer month) {
        if (year != null && month != null) {
            return repo.findByYearAndMonthAndDelYnOrderByCategoryCodeAscIdAsc(year, month, "N");
        } else if (year != null) {
            return repo.findByYearAndDelYnOrderByMonthAscCategoryCodeAscIdAsc(year, "N");
        }
        return repo.findAll();
    }

    @PostMapping
    public Transaction create(@RequestBody Transaction t) {
        t.setDelYn("N");
        return repo.save(t);
    }

    @PutMapping("/{id}")
    public Transaction update(@PathVariable Long id, @RequestBody Transaction t) {
        t.setId(id);
        return repo.save(t);
    }

    // 소프트 삭제 — 실제로 DB에서 지우지 않고 delYn='Y' 처리
    @DeleteMapping("/{id}")
    public void softDelete(@PathVariable Long id) {
        repo.findById(id).ifPresent(t -> {
            t.setDelYn("Y");
            repo.save(t);
        });
    }
}
