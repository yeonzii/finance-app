package com.finance.app.service;

import com.finance.app.entity.LoanInterestRate;
import com.finance.app.repository.LoanInterestRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LoanService {

    private final LoanInterestRateRepository rateRepo;

    public Optional<LoanInterestRate> getApplicableRate(int year, int month) {
        return rateRepo.findApplicableRate(year * 100 + month);
    }

    /**
     * 월 이자액 계산
     *
     * 공식: 원금(잔액) × (연이자율 / 100) / 12  (단순 월할)
     * 이자지급일: 매달 27일
     */
    public long calculateMonthlyInterest(long balance, BigDecimal annualRate, int year, int month) {
        // balance × rate / 100 / 12, 원 단위 반올림
        return BigDecimal.valueOf(balance)
                .multiply(annualRate)
                .divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP)
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();
    }
}
