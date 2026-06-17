package com.finance.app.controller;

import com.finance.app.entity.AssetValue;
import com.finance.app.repository.AssetValueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset-values")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AssetValueController {

    private final AssetValueRepository repo;

    // 연도별 전체 값 (그리드 로딩용)
    @GetMapping
    public List<AssetValue> getByYear(@RequestParam int year) {
        return repo.findByYear(year);
    }

    // 항목×년×월 단위 upsert (모달 저장)
    @PostMapping
    public AssetValue save(@RequestBody AssetValue v) {
        AssetValue target = repo
                .findByAssetItemIdAndYearAndMonth(v.getAssetItemId(), v.getYear(), v.getMonth())
                .orElse(new AssetValue());
        target.setAssetItemId(v.getAssetItemId());
        target.setYear(v.getYear());
        target.setMonth(v.getMonth());
        target.setAmount(v.getAmount());
        return repo.save(target);
    }
}
