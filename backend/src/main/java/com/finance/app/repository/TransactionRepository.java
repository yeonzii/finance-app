package com.finance.app.repository;

import com.finance.app.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, String> {

    // 소프트삭제(N) 항목만 조회
    List<Transaction> findByYearAndMonthAndDelYnOrderByCategoryCodeAscIdAsc(
            int year, int month, String delYn);

    List<Transaction> findByYearAndDelYnOrderByMonthAscCategoryCodeAscIdAsc(
            int year, String delYn);

    // 특정 월에 이미 생성된 고정비 거래 (삭제 포함, 중복 생성 방지용)
    List<Transaction> findByYearAndMonthAndFixedCostIdIsNotNull(int year, int month);
}
