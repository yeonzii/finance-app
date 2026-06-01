package com.finance.app.repository;

import com.finance.app.entity.LoanInterestRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LoanInterestRateRepository extends JpaRepository<LoanInterestRate, Long> {

    List<LoanInterestRate> findAllByOrderByStartYearAscStartMonthAsc();

    /**
     * 특정 년월에 적용되는 이자율 조회 — 가장 최근 시작일 기준 1건
     */
    @Query("""
        SELECT r FROM LoanInterestRate r
        WHERE r.delYn = 'N'
          AND (r.startYear * 100 + r.startMonth) <= (:yearMonth)
          AND (
            (r.endYear IS NULL AND r.endMonth IS NULL)
            OR (r.endYear * 100 + r.endMonth) >= (:yearMonth)
          )
        ORDER BY r.startYear DESC, r.startMonth DESC
        """)
    List<LoanInterestRate> findApplicableRates(@Param("yearMonth") int yearMonth);

    default Optional<LoanInterestRate> findApplicableRate(int yearMonth) {
        List<LoanInterestRate> list = findApplicableRates(yearMonth);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
