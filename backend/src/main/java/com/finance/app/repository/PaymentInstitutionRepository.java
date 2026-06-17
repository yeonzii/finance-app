package com.finance.app.repository;

import com.finance.app.entity.PaymentInstitution;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentInstitutionRepository extends JpaRepository<PaymentInstitution, Long> {
    Optional<PaymentInstitution> findByCodeId(String codeId);
}
