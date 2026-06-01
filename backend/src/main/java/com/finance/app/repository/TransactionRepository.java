package com.finance.app.repository;

import com.finance.app.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // 소프트삭제(N) 항목만 조회
    List<Transaction> findByYearAndMonthAndDelYnOrderByCategoryCodeAscIdAsc(
            int year, int month, String delYn);

    List<Transaction> findByYearAndDelYnOrderByMonthAscCategoryCodeAscIdAsc(
            int year, String delYn);
}
