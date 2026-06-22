package com.finance.app.controller;

import com.finance.app.entity.FixedCost;
import com.finance.app.repository.FixedCostRepository;
import com.finance.app.service.FixedCostService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fixed-costs")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class FixedCostController {

    private final FixedCostRepository repo;
    private final FixedCostService service;

    // 활성 고정비 목록
    @GetMapping
    public List<FixedCost> getAll() {
        return repo.findByDelYnOrderBySubcategoryCodeAscIdAsc("N");
    }

    @PostMapping
    public FixedCost create(@RequestBody FixedCost f) {
        f.setDelYn("N");
        return repo.save(f);
    }

    @PutMapping("/{id}")
    public FixedCost update(@PathVariable Long id, @RequestBody FixedCost f) {
        f.setId(id);
        f.setDelYn("N");
        FixedCost saved = repo.save(f);
        // 변경한 월 다음 달부터의 자동생성 거래만 새 내용으로 갱신 (이전 달은 유지)
        service.syncFutureTransactions(saved);
        return saved;
    }

    // 소프트 삭제
    @DeleteMapping("/{id}")
    public void softDelete(@PathVariable Long id) {
        repo.findById(id).ifPresent(f -> {
            f.setDelYn("Y");
            repo.save(f);
        });
    }

    // 해당 월에 고정비를 거래로 자동 생성 (중복 방지). 생성 건수 반환
    @PostMapping("/generate")
    public Map<String, Object> generate(@RequestParam int year, @RequestParam int month) {
        int created = service.generateForMonth(year, month);
        return Map.of("created", created);
    }
}
