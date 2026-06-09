package com.finance.app.repository;

import com.finance.app.entity.CommonCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommonCodeRepository extends JpaRepository<CommonCode, String> {

    // 특정 부모의 활성 하위코드 목록 (드롭다운용)
    List<CommonCode> findByParentCdIdAndDelYnOrderBySortOrderAsc(String parentCdId, String delYn);

    // 특정 레벨의 활성 코드 목록
    List<CommonCode> findByCdLevelAndDelYnOrderBySortOrderAsc(int cdLevel, String delYn);

    // 전체 목록 (관리 화면용, 삭제 포함) — 코드ID 순
    List<CommonCode> findAllByOrderByCdIdAsc();
}
