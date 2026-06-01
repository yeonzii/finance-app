package com.finance.app.controller;

import com.finance.app.entity.CommonCode;
import com.finance.app.repository.CommonCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/codes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class CommonCodeController {

    private final CommonCodeRepository repo;

    // 특정 그룹의 활성 코드 목록 (드롭다운용)
    @GetMapping("/group/{codeGroup}")
    public List<CommonCode> getByGroup(@PathVariable String codeGroup) {
        return repo.findByCodeGroupAndDelYnOrderBySortOrderAsc(codeGroup, "N");
    }

    // 상위 ID 기준 활성 코드 목록 (기관 하위 항목용)
    @GetMapping("/children/{parentId}")
    public List<CommonCode> getChildren(@PathVariable Long parentId) {
        return repo.findByParentIdAndDelYnOrderBySortOrderAsc(parentId, "N");
    }

    // 전체 목록 (관리 화면용, 삭제된 항목 포함)
    @GetMapping
    public List<CommonCode> getAll() {
        return repo.findAll();
    }

    // 추가
    @PostMapping
    public CommonCode create(@RequestBody CommonCode c) {
        c.setDelYn("N");
        return repo.save(c);
    }

    // 수정
    @PutMapping("/{id}")
    public CommonCode update(@PathVariable Long id, @RequestBody CommonCode c) {
        c.setId(id);
        return repo.save(c);
    }

    // 소프트 삭제
    @DeleteMapping("/{id}")
    public void softDelete(@PathVariable Long id) {
        repo.findById(id).ifPresent(c -> {
            c.setDelYn("Y");
            repo.save(c);
        });
    }

    // 복구
    @PutMapping("/{id}/restore")
    public CommonCode restore(@PathVariable Long id) {
        CommonCode c = repo.findById(id).orElseThrow();
        c.setDelYn("N");
        return repo.save(c);
    }
}
