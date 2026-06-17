package com.finance.app.repository;

import com.finance.app.entity.AssetValue;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AssetValueRepository extends JpaRepository<AssetValue, Long> {

    List<AssetValue> findByYear(int year);

    Optional<AssetValue> findByAssetItemIdAndYearAndMonth(Long assetItemId, int year, int month);
}
