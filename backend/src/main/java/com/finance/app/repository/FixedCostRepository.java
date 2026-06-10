package com.finance.app.repository;

import com.finance.app.entity.FixedCost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FixedCostRepository extends JpaRepository<FixedCost, Long> {

    // 활성 고정비 목록 (분류 → 항목 순)
    List<FixedCost> findByDelYnOrderBySubcategoryCodeAscIdAsc(String delYn);
}
