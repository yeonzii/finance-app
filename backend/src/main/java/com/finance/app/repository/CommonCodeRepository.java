package com.finance.app.repository;

import com.finance.app.entity.CommonCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommonCodeRepository extends JpaRepository<CommonCode, Long> {

    // 특정 그룹의 활성 코드 목록 (소프트삭제 제외)
    List<CommonCode> findByCodeGroupAndDelYnOrderBySortOrderAsc(String codeGroup, String delYn);

    // 상위 ID 기준 활성 코드 목록
    List<CommonCode> findByParentIdAndDelYnOrderBySortOrderAsc(Long parentId, String delYn);

    // 전체 조회 (관리 화면용, 삭제 포함)
    List<CommonCode> findByCodeGroupOrderBySortOrderAsc(String codeGroup);

    // 코드값으로 조회
    CommonCode findByCodeGroupAndCode(String codeGroup, String code);
}
