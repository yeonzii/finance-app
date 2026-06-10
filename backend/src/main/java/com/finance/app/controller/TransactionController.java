package com.finance.app.controller;

import com.finance.app.entity.Transaction;
import com.finance.app.repository.TransactionRepository;
import com.finance.app.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class TransactionController {

    private final TransactionRepository repo;
    private final TransactionService service;

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
        t.setId(service.generateId(t)); // TR+년+월+코드숫자 자동 생성
        return repo.save(t);
    }

    @PutMapping("/{id}")
    public Transaction update(@PathVariable String id, @RequestBody Transaction t) {
        t.setId(id); // ID는 유지 (분류 변경되어도 기존 ID 보존)
        return repo.save(t);
    }

    // 소프트 삭제 — 실제로 DB에서 지우지 않고 delYn='Y' 처리
    @DeleteMapping("/{id}")
    public void softDelete(@PathVariable String id) {
        repo.findById(id).ifPresent(t -> {
            t.setDelYn("Y");
            repo.save(t);
        });
    }
}
