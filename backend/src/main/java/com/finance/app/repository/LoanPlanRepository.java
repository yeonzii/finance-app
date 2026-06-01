package com.finance.app.repository;

import com.finance.app.entity.LoanPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LoanPlanRepository extends JpaRepository<LoanPlan, Long> {
    Optional<LoanPlan> findByYearAndMonth(int year, int month);
    List<LoanPlan> findAllByOrderByYearAscMonthAsc();
}
