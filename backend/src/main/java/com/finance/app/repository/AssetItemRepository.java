package com.finance.app.repository;

import com.finance.app.entity.AssetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssetItemRepository extends JpaRepository<AssetItem, Long> {

    // 활성 구성항목 (구분 → 순서)
    List<AssetItem> findByDelYnOrderByAssetTypeAscSortOrderAscIdAsc(String delYn);
}
