package com.finance.app.repository;

import com.finance.app.entity.CardConsumption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardConsumptionRepository extends JpaRepository<CardConsumption, Long> {

    List<CardConsumption> findByYearAndMonthAndDelYnOrderByUsedAtAsc(int year, int month, String delYn);

    List<CardConsumption> findByYearAndDelYnOrderByMonthAscUsedAtAsc(int year, String delYn);

    boolean existsBySourceFile(String sourceFile);
}
