package com.finance.app.service;

import com.finance.app.entity.Transaction;
import org.springframework.stereotype.Service;

@Service
public class TransactionService {

    /**
     * 거래 ID 생성: "TR" + 년 + 월(2자리) + 분류 코드숫자(CD 제외)
     * 예) 2026년 6월, 소분류 CD2141 → TR2026062141
     * 소분류가 없으면 대분류, 그것도 없으면 0000 사용.
     */
    public String generateId(Transaction t) {
        String code = t.getSubcategoryCode();
        if (code == null || code.isBlank()) code = t.getCategoryCode();
        String num = (code == null || code.isBlank())
                ? "0000"
                : code.replaceFirst("^[A-Za-z]+", ""); // 앞쪽 영문(CD 등) 제거
        return String.format("TR%04d%02d%s", t.getYear(), t.getMonth(), num);
    }
}
