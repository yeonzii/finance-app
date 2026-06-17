package com.finance.app.controller;

import com.finance.app.entity.PaymentInstitution;
import com.finance.app.repository.PaymentInstitutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payment-institutions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PaymentInstitutionController {

    private final PaymentInstitutionRepository repo;

    @GetMapping
    public List<PaymentInstitution> getAll() {
        return repo.findAll();
    }

    // codeId 기준 upsert (결제일 저장)
    @PostMapping
    public PaymentInstitution save(@RequestBody PaymentInstitution p) {
        PaymentInstitution target = repo.findByCodeId(p.getCodeId()).orElse(new PaymentInstitution());
        target.setCodeId(p.getCodeId());
        target.setPaymentDay(p.getPaymentDay());
        return repo.save(target);
    }
}
