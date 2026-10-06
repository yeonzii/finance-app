package com.finance.app.repository;

import com.finance.app.entity.SpendingBudget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpendingBudgetRepository extends JpaRepository<SpendingBudget, Long> {
    Optional<SpendingBudget> findByYearAndMonth(int year, int month);
}
