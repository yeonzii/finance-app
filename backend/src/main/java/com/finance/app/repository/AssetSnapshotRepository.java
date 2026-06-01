package com.finance.app.repository;

import com.finance.app.entity.AssetSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AssetSnapshotRepository extends JpaRepository<AssetSnapshot, Long> {
    Optional<AssetSnapshot> findByYearAndMonth(int year, int month);
    List<AssetSnapshot> findByYearOrderByMonthAsc(int year);
}
