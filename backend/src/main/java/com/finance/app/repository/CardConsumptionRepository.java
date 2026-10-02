package com.finance.app.repository;

import com.finance.app.entity.CardConsumption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardConsumptionRepository extends JpaRepository<CardConsumption, Long> {

    List<CardConsumption> findByYearAndMonthAndDelYnOrderByUsedAtAsc(int year, int month, String delYn);

    List<CardConsumption> findByYearAndDelYnOrderByMonthAscUsedAtAsc(int year, String delYn);

    boolean existsBySourceFile(String sourceFile);

    // 내용(원문) 기준 중복 방지 — 같은 알림을 다른 파일명으로 여러 번 공유한 경우
    boolean existsByRawTextAndDelYn(String rawText, String delYn);
}
