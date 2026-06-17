package com.finance.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * 결제기관(카드사) 결제일 관리
 * - codeId: 기관분류>카드사 하위 코드 (CD31xx)
 * - paymentDay: 결제일 (매월 N일)
 */
@Entity
@Table(name = "payment_institutions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"code_id"}))
@Getter @Setter @NoArgsConstructor
public class PaymentInstitution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_id", nullable = false)
    private String codeId;

    // 결제일 (1~31)
    private Integer paymentDay;
}
