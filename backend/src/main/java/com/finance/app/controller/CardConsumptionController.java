package com.finance.app.controller;

import com.finance.app.entity.CardConsumption;
import com.finance.app.repository.CardConsumptionRepository;
import com.finance.app.service.ConsumptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/consumptions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class CardConsumptionController {

    private final CardConsumptionRepository repo;
    private final ConsumptionService service;

    /** 월별(또는 연별) 소비내역 조회 */
    @GetMapping
    public List<CardConsumption> list(@RequestParam(required = false) Integer year,
                                      @RequestParam(required = false) Integer month) {
        if (year != null && month != null)
            return repo.findByYearAndMonthAndDelYnOrderByUsedAtAsc(year, month, "N");
        if (year != null)
            return repo.findByYearAndDelYnOrderByMonthAscUsedAtAsc(year, "N");
        return repo.findAll();
    }

    /** 수기 추가 (현금 등) */
    @PostMapping
    public CardConsumption create(@RequestBody CardConsumption body) {
        java.time.LocalDateTime used = body.getUsedAt() != null ? body.getUsedAt() : java.time.LocalDateTime.now();
        body.setUsedAt(used);
        body.setYear(used.getYear());
        body.setMonth(used.getMonthValue());
        body.setId(null);
        body.setSourceFile(null);
        if (body.getRawText() == null) body.setRawText("수기입력");
        body.setDelYn("N");
        body.setCreatedAt(java.time.LocalDateTime.now());
        return repo.save(body);
    }

    /** iCloud 받은편지함 적재 */
    @PostMapping("/import")
    public Map<String, Object> importInbox() {
        List<CardConsumption> saved = service.importInbox();
        return Map.of("ok", true, "count", saved.size(), "items", saved, "inboxDir", service.getInboxDir());
    }

    /** 수정 (카드/금액/일시/가맹점/카테고리/메모) */
    @PutMapping("/{id}")
    public CardConsumption update(@PathVariable Long id, @RequestBody CardConsumption body) {
        CardConsumption c = repo.findById(id).orElseThrow();
        if (body.getUsedAt() != null) {
            c.setUsedAt(body.getUsedAt());
            c.setYear(body.getUsedAt().getYear());
            c.setMonth(body.getUsedAt().getMonthValue());
        }
        if (body.getCardCode() != null) c.setCardCode(body.getCardCode());
        if (body.getAmount() != null) c.setAmount(body.getAmount());
        c.setMerchant(body.getMerchant());
        c.setCategoryCode(body.getCategoryCode()); // null 허용(미분류로 되돌리기)
        c.setMemo(body.getMemo());
        return repo.save(c);
    }

    /** 소프트 삭제 */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.findById(id).ifPresent(c -> { c.setDelYn("Y"); repo.save(c); });
    }
}
