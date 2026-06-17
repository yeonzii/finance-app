package com.finance.app.controller;

import com.finance.app.entity.AssetItem;
import com.finance.app.repository.AssetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset-items")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AssetItemController {

    private final AssetItemRepository repo;

    // 활성 구성항목 전체
    @GetMapping
    public List<AssetItem> getAll() {
        return repo.findByDelYnOrderByAssetTypeAscSortOrderAscIdAsc("N");
    }

    @PostMapping
    public AssetItem create(@RequestBody AssetItem a) {
        a.setDelYn("N");
        return repo.save(a);
    }

    @PutMapping("/{id}")
    public AssetItem update(@PathVariable Long id, @RequestBody AssetItem a) {
        a.setId(id);
        return repo.save(a);
    }

    // 소프트 삭제
    @DeleteMapping("/{id}")
    public void softDelete(@PathVariable Long id) {
        repo.findById(id).ifPresent(a -> {
            a.setDelYn("Y");
            repo.save(a);
        });
    }
}
