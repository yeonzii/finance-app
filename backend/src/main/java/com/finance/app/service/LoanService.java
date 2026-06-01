package com.finance.app.service;

import com.finance.app.entity.LoanInterestRate;
import com.finance.app.repository.LoanInterestRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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
     * 공식: 잔액 × (연이자율 / 100) / 365 × 적용일수
     * 적용일수: 전달 28일 ~ 이번달 27일 (ChronoUnit.DAYS)
     * 이자지급일: 매달 27일
     */
    public long calculateMonthlyInterest(long balance, BigDecimal annualRate, int year, int month) {
        long days = calcDays(year, month);

        // balance × rate / 100 / 365 × days, 원 단위 반올림
        return BigDecimal.valueOf(balance)
                .multiply(annualRate)
                .divide(BigDecimal.valueOf(36500), 10, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(days))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();
    }

    /**
     * 전달 28일 ~ 이번달 27일까지의 일수 계산
     * 예) 2025년 5월 → 2025-04-28 ~ 2025-05-27 → 29일
     */
    public long calcDays(int year, int month) {
        LocalDate from = LocalDate.of(year, month, 27).minusMonths(1).withDayOfMonth(28);
        LocalDate to   = LocalDate.of(year, month, 27);
        return ChronoUnit.DAYS.between(from, to) + 1; // 시작일 포함
    }
}
