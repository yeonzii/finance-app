package com.finance.app.controller;

import com.finance.app.entity.AssetSnapshot;
import com.finance.app.repository.AssetSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AssetSnapshotController {

    private final AssetSnapshotRepository repo;

    @GetMapping
    public List<AssetSnapshot> getAll(@RequestParam(required = false) Integer year) {
        if (year != null) return repo.findByYearOrderByMonthAsc(year);
        return repo.findAll();
    }

    @GetMapping("/{year}/{month}")
    public AssetSnapshot getByYearMonth(@PathVariable int year, @PathVariable int month) {
        return repo.findByYearAndMonth(year, month).orElse(null);
    }

    @PostMapping
    public AssetSnapshot create(@RequestBody AssetSnapshot a) {
        return repo.save(a);
    }

    @PutMapping("/{id}")
    public AssetSnapshot update(@PathVariable Long id, @RequestBody AssetSnapshot a) {
        a.setId(id);
        return repo.save(a);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
