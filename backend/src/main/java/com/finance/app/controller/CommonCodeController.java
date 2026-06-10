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

    // 특정 부모의 활성 하위코드 목록 (드롭다운/계층 탐색용)
    @GetMapping("/children/{parentCdId}")
    public List<CommonCode> getChildren(@PathVariable String parentCdId) {
        return repo.findByParentCdIdAndDelYnOrderBySortOrderAsc(parentCdId, "N");
    }

    // 특정 레벨의 활성 코드 목록
    @GetMapping("/level/{level}")
    public List<CommonCode> getByLevel(@PathVariable int level) {
        return repo.findByCdLevelAndDelYnOrderBySortOrderAsc(level, "N");
    }

    // 전체 목록 (관리 화면용, 삭제된 항목 포함)
    @GetMapping
    public List<CommonCode> getAll() {
        return repo.findAllByOrderByCdIdAsc();
    }

    // 추가
    @PostMapping
    public CommonCode create(@RequestBody CommonCode c) {
        if (c.getCdId() == null || c.getCdId().isBlank()) {
            throw new IllegalArgumentException("공통코드ID는 비어 있을 수 없습니다.");
        }
        c.setDelYn("N");
        return repo.save(c);
    }

    // 수정
    @PutMapping("/{cdId}")
    public CommonCode update(@PathVariable String cdId, @RequestBody CommonCode c) {
        c.setCdId(cdId);
        return repo.save(c);
    }

    // 소프트 삭제
    @DeleteMapping("/{cdId}")
    public void softDelete(@PathVariable String cdId) {
        repo.findById(cdId).ifPresent(c -> {
            c.setDelYn("Y");
            repo.save(c);
        });
    }

    // 복구
    @PutMapping("/{cdId}/restore")
    public CommonCode restore(@PathVariable String cdId) {
        CommonCode c = repo.findById(cdId).orElseThrow();
        c.setDelYn("N");
        return repo.save(c);
    }
}
