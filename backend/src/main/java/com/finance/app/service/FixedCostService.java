package com.finance.app.service;

import com.finance.app.entity.CommonCode;
import com.finance.app.entity.FixedCost;
import com.finance.app.entity.Transaction;
import com.finance.app.repository.CommonCodeRepository;
import com.finance.app.repository.FixedCostRepository;
import com.finance.app.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FixedCostService {

    private final FixedCostRepository fixedCostRepo;
    private final TransactionRepository txRepo;
    private final CommonCodeRepository codeRepo;

    /**
     * 해당 월에 등록된 고정비를 거래로 자동 생성 (중복 방지).
     * 이미 생성된 고정비는 건너뛴다. 생성한 건수를 반환.
     */
    public synchronized int generateForMonth(int year, int month) {
        List<FixedCost> fixedCosts = fixedCostRepo.findByDelYnOrderBySubcategoryCodeAscIdAsc("N");

        // 이미 이 달에 생성된 고정비 ID 집합
        Set<Long> already = txRepo.findByYearAndMonthAndFixedCostIdIsNotNull(year, month)
                .stream().map(Transaction::getFixedCostId).collect(Collectors.toSet());

        int created = 0;
        for (FixedCost fc : fixedCosts) {
            if (already.contains(fc.getId())) continue;

            Transaction t = new Transaction();
            t.setYear(year);
            t.setMonth(month);
            t.setCategoryCode(findLevel1Ancestor(fc.getSubcategoryCode())); // 비용(CD2000)
            t.setSubcategoryCode(fc.getSubcategoryCode());
            t.setAmount(fc.getAmount());
            t.setOrgCode(fc.getOrgCode());
            t.setTransactionDay(fc.getTransactionDay());
            t.setBillingDay(fc.getBillingDay());
            t.setNote(fc.getItemName());
            t.setFixedCostId(fc.getId());
            t.setDelYn("N");
            txRepo.save(t);
            created++;
        }
        return created;
    }

    // leaf 코드에서 레벨1 조상(대분류)을 찾는다. 못 찾으면 입력값 그대로.
    private String findLevel1Ancestor(String cdId) {
        String cur = cdId;
        for (int i = 0; i < 5 && cur != null; i++) {
            CommonCode node = codeRepo.findById(cur).orElse(null);
            if (node == null) break;
            if (node.getCdLevel() == 1) return node.getCdId();
            cur = node.getParentCdId();
        }
        return cdId;
    }
}
