import { useState, useEffect, useRef } from 'react';

// 세자리 콤마 포매팅 입력 컴포넌트
function MoneyInput({ value, onChange, placeholder, readOnly, style }) {
  const [display, setDisplay] = useState('');
  const inputRef = useRef(null);

  // 숫자값 → 콤마 문자열
  const toDisplay = (num) =>
    num != null && num !== '' ? Number(num).toLocaleString('ko-KR') : '';

  // 외부 value가 바뀌면 display 동기화 (포커스 중이 아닐 때만)
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDisplay(toDisplay(value));
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || raw === '-') { setDisplay(raw); onChange(null); return; }
    if (!/^\d+$/.test(raw)) return; // 숫자만 허용
    const num = parseInt(raw, 10);
    setDisplay(raw.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    onChange(num);
  };

  const handleBlur = () => setDisplay(toDisplay(value));
  const handleFocus = () => {
    // 포커스 시 커서를 끝으로
    setTimeout(() => inputRef.current?.setSelectionRange(display.length, display.length), 0);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={readOnly ? undefined : handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      readOnly={readOnly}
      style={style}
    />
  );
}
import {
  getLoans, saveLoan, deleteLoan, reflectLoanExpense, generateLoanSchedule,
  getLoanRates, saveLoanRate, deleteLoanRate, calculateInterest
} from '../api';

const fmt = (n) => n != null ? Number(n).toLocaleString('ko-KR') : '-';
const fmtRate = (r) => r != null ? `${Number(r).toFixed(2)}%` : '-';

const EMPTY_PLAN = {
  year: new Date().getFullYear(), month: new Date().getMonth() + 1,
  loanAmount: '', interestAmount: '', repaymentAmount: '',
  extraPayment: 0, remainingBalance: '', appliedRate: '', paymentDay: 27
};

const EMPTY_RATE = {
  startYear: new Date().getFullYear(), startMonth: 1,
  endYear: '', endMonth: '',
  annualRate: '', note: ''
};

export default function LoanPage() {
  const [tab, setTab] = useState('plan'); // 'plan' | 'rates'
  const [plans, setPlans] = useState([]);
  const [rates, setRates] = useState([]);
  const [planModal, setPlanModal] = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [genModal, setGenModal] = useState(null);

  const loadPlans = () => getLoans().then(setPlans);
  const loadRates = () => getLoanRates().then(setRates);

  useEffect(() => { loadPlans(); loadRates(); }, []);

  // 상환계획 요약
  const latestBalance = plans.length > 0 ? plans[plans.length - 1].remainingBalance : null;
  const totalRepaid   = plans.reduce((s, r) => s + (r.repaymentAmount || 0) + (r.extraPayment || 0), 0);
  const totalInterest = plans.reduce((s, r) => s + (r.interestAmount || 0), 0);

  // 이자율 히스토리에서 해당 월 이자율 찾기 (프론트 표시용)
  const getRateForMonth = (year, month) => {
    const ym = year * 100 + month;
    return rates.find(r => {
      const start = r.startYear * 100 + r.startMonth;
      const end   = r.endYear && r.endMonth ? r.endYear * 100 + r.endMonth : 999999;
      return r.delYn === 'N' && start <= ym && ym <= end;
    });
  };

  return (
    <div>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'plan' ? 'btn-primary' : ''}`}
          style={tab !== 'plan' ? { background: '#e8eaf6', color: '#3949ab' } : {}}
          onClick={() => setTab('plan')}
        >
          📋 월별 상환 계획
        </button>
        <button
          className={`btn ${tab === 'rates' ? 'btn-primary' : ''}`}
          style={tab !== 'rates' ? { background: '#e8eaf6', color: '#3949ab' } : {}}
          onClick={() => setTab('rates')}
        >
          📈 이자율 히스토리
        </button>
      </div>

      {tab === 'plan' && (
        <PlanTab
          plans={plans}
          rates={rates}
          getRateForMonth={getRateForMonth}
          latestBalance={latestBalance}
          totalRepaid={totalRepaid}
          totalInterest={totalInterest}
          onAdd={() => {
          const lastPlan = plans[plans.length - 1];
          setPlanModal({ mode: 'add', data: { ...EMPTY_PLAN, loanAmount: lastPlan?.remainingBalance || '' } });
        }}
          onEdit={(r) => setPlanModal({ mode: 'edit', data: { ...r } })}
          onGenerate={() => {
            const last = plans[plans.length - 1];
            setGenModal({
              year: new Date().getFullYear(), month: new Date().getMonth() + 1,
              openingBalance: '', annualRate: '4.20', months: 360,
            });
          }}
          onExtraChange={async (p, extra) => {
            await saveLoan({ ...p, extraPayment: extra });
            loadPlans(); // 백엔드가 이후 월 자동 재계산 → 재로딩
          }}
          onDelete={async (id) => {
            if (!confirm('삭제할까요?')) return;
            await deleteLoan(id);
            loadPlans();
          }}
          onReflect={async (p) => {
            if (!confirm(`${p.year}년 ${p.month}월 소득/지출 내역에 원리금상환/원금추가상환을 반영할까요?`)) return;
            const r = await reflectLoanExpense(p.id);
            alert(`반영 완료\n원리금상환: ${fmt(r.principalInterest)}원\n원금추가상환: ${fmt(r.extra)}원`);
          }}
        />
      )}

      {tab === 'rates' && (
        <RatesTab
          rates={rates}
          plans={plans}
          getRateForMonth={getRateForMonth}
          onAdd={() => setRateModal({ mode: 'add', data: { ...EMPTY_RATE } })}
          onEdit={(r) => setRateModal({ mode: 'edit', data: { ...r } })}
          onDelete={async (id) => {
            if (!confirm('이자율을 삭제(비활성)할까요?')) return;
            await deleteLoanRate(id);
            loadRates();
          }}
        />
      )}

      {planModal && (
        <PlanModal
          modal={planModal}
          onSave={async (data) => {
            await saveLoan(data);
            setPlanModal(null);
            loadPlans();
          }}
          onClose={() => setPlanModal(null)}
        />
      )}

      {rateModal && (
        <RateModal
          modal={rateModal}
          onSave={async (data) => {
            await saveLoanRate(data);
            setRateModal(null);
            loadRates();
          }}
          onClose={() => setRateModal(null)}
        />
      )}

      {genModal && (
        <ScheduleGenModal
          data={genModal}
          onGenerate={async (params) => {
            if (!confirm('기존 상환 스케줄을 새로 생성합니다. (추가상환액은 유지) 계속할까요?')) return;
            await generateLoanSchedule(params);
            setGenModal(null);
            loadPlans();
          }}
          onClose={() => setGenModal(null)}
        />
      )}
    </div>
  );
}

// ── 월별 상환 계획 탭 ──────────────────────────────────────────────
function PlanTab({ plans, getRateForMonth, latestBalance, totalRepaid, totalInterest, onAdd, onEdit, onDelete, onReflect, onGenerate, onExtraChange }) {
  return (
    <>
      <div className="page-header">
        <h2>월별 상환 계획</h2>
        <button className="btn" style={{ background: '#1a237e', color: '#fff', marginRight: 6 }} onClick={onGenerate}>📅 30년 스케줄 생성</button>
        <button className="btn btn-primary" onClick={onAdd}>+ 월 추가</button>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        💡 원리금균등상환(기간유지형). <b>추가 상환액</b>만 입력하면 이후 달의 이자·정기·잔액이 자동 재계산돼요.
      </div>

      <div className="asset-cards" style={{ marginBottom: 16 }}>
        <div className="asset-card">
          <div className="card-label">현재 대출 잔액</div>
          <div className="card-value amount-negative">{latestBalance != null ? fmt(latestBalance) + '원' : '-'}</div>
        </div>
        <div className="asset-card">
          <div className="card-label">총 상환 금액</div>
          <div className="card-value amount-positive">{fmt(totalRepaid)}원</div>
        </div>
        <div className="asset-card">
          <div className="card-label">총 납부 이자</div>
          <div className="card-value" style={{ color: '#e65100' }}>{fmt(totalInterest)}원</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>년월</th>
              <th>잔여개월</th>
              <th>월초 잔액</th>
              <th style={{ color: '#1a237e' }}>적용 이자율</th>
              <th style={{ color: '#e65100' }}>이자금액 (27일)</th>
              <th>정기 상환액</th>
              <th style={{ color: '#1a237e' }}>총 원리금상환액</th>
              <th>추가 상환액</th>
              <th>월말 잔액</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr><td colSpan={10} className="empty-state">상환 스케줄이 없어요. <b>30년 스케줄 생성</b>으로 만들어보세요.</td></tr>
            )}
            {plans.map(p => {
              const rateInfo = getRateForMonth(p.year, p.month);
              const hasRateMismatch = rateInfo && p.appliedRate &&
                Number(rateInfo.annualRate).toFixed(2) !== Number(p.appliedRate).toFixed(2);
              return (
                <tr key={p.id}>
                  <td className="col-c" style={{ fontWeight: 600 }}>{p.year}년 {p.month}월</td>
                  <td className="col-c" style={{ color: '#888' }}>{p.remainingMonths ?? '-'}</td>
                  <td className="col-r">{fmt(p.loanAmount)}</td>
                  <td className="col-c" style={{ fontWeight: 600, color: '#1a237e' }}>
                    {fmtRate(p.appliedRate)}
                    {hasRateMismatch && (
                      <span title={`현재 이자율: ${fmtRate(rateInfo?.annualRate)}`}
                        style={{ marginLeft: 4, color: '#e65100', cursor: 'help', fontSize: 11 }}>
                        ⚠ 변경됨
                      </span>
                    )}
                  </td>
                  <td className="col-r" style={{ color: '#e65100', fontWeight: 600 }}>
                    {fmt(p.interestAmount)}
                    <span style={{ color: '#aaa', fontWeight: 400, fontSize: 11, marginLeft: 4 }}>
                      ({p.paymentDay || 27}일)
                    </span>
                  </td>
                  <td className="col-r">{fmt(p.repaymentAmount)}</td>
                  <td className="col-r" style={{ fontWeight: 700, color: '#1a237e' }}>{fmt((p.interestAmount || 0) + (p.repaymentAmount || 0))}</td>
                  <td style={{ padding: 2 }}>
                    <ExtraInput value={p.extraPayment} onCommit={(v) => onExtraChange(p, v)} />
                  </td>
                  <td className="col-r" style={{ fontWeight: 700, color: '#c62828' }}>{fmt(p.remainingBalance)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-edit" onClick={() => onEdit(p)} style={{ marginRight: 4 }}>수정</button>
                    <button className="btn btn-danger" onClick={() => onDelete(p.id)} style={{ marginRight: 4 }}>삭제</button>
                    <button className="btn" style={{ background: '#2e7d32', color: '#fff', padding: '4px 8px', fontSize: 12 }}
                            onClick={() => onReflect(p)} title="해당 월 소득/지출 내역에 원리금상환·원금추가상환 반영">지출반영</button>
                  </td>
                </tr>
              );
            })}
            {plans.length > 0 && (
              <tr className="summary-row">
                <td className="col-c">합계</td>
                <td className="col-c">-</td>
                <td className="col-c">-</td>
                <td className="col-c">-</td>
                <td className="col-r" style={{ color: '#e65100' }}>{fmt(totalInterest)}</td>
                <td className="col-r">{fmt(plans.reduce((s, r) => s + (r.repaymentAmount || 0), 0))}</td>
                <td className="col-r" style={{ fontWeight: 700, color: '#1a237e' }}>{fmt(plans.reduce((s, r) => s + (r.interestAmount || 0) + (r.repaymentAmount || 0), 0))}</td>
                <td className="col-r">{fmt(plans.reduce((s, r) => s + (r.extraPayment || 0), 0))}</td>
                <td className="col-c">-</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// 추가 상환액 인라인 입력 (콤마, blur/Enter 시 저장→자동재계산)
function ExtraInput({ value, onCommit }) {
  const [display, setDisplay] = useState(value ? Number(value).toLocaleString('ko-KR') : '');
  useEffect(() => { setDisplay(value ? Number(value).toLocaleString('ko-KR') : ''); }, [value]);
  return (
    <input
      type="text" inputMode="numeric" value={display} placeholder="0"
      onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setDisplay(raw ? Number(raw).toLocaleString('ko-KR') : ''); }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      onFocus={e => { e.target.style.border = '1px solid #2e7d32'; e.target.style.background = '#fff'; e.target.select(); }}
      onBlur={e => {
        e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent';
        const raw = display.replace(/[^0-9]/g, '');
        const num = raw === '' ? 0 : +raw;
        if (num !== (value || 0)) onCommit(num);
      }}
      style={{ width: '100%', border: '1px solid transparent', background: 'transparent',
               textAlign: 'right', padding: '4px 6px', borderRadius: 4, font: 'inherit', color: '#2e7d32', fontWeight: 600 }}
    />
  );
}

// 30년 스케줄 생성 모달
function ScheduleGenModal({ data, onGenerate, onClose }) {
  const [form, setForm] = useState(data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.openingBalance && form.annualRate && form.months;
  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>30년 상환 스케줄 생성</h3>
        <div style={{ background: '#e8eaf6', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#3949ab' }}>
          원리금균등상환(기간유지형)으로 시작 시점부터 개월수만큼 전체 생성해요. 기존 <b>추가상환액</b>은 유지됩니다.
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>시작 년</label>
            <input type="number" value={form.year} onChange={e => set('year', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>시작 월</label>
            <input type="number" min={1} max={12} value={form.month} onChange={e => set('month', +e.target.value)} />
          </div>
          <div className="form-group full">
            <label>시작 월초 잔액 (원)</label>
            <MoneyInput value={form.openingBalance} onChange={v => set('openingBalance', v)} placeholder="예: 830000000" />
          </div>
          <div className="form-group">
            <label>연이자율 (%)</label>
            <input type="number" step="0.01" value={form.annualRate} onChange={e => set('annualRate', e.target.value)} placeholder="4.20" />
          </div>
          <div className="form-group">
            <label>개월수</label>
            <input type="number" value={form.months} onChange={e => set('months', +e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" disabled={!valid}
                  onClick={() => onGenerate({ year: form.year, month: form.month, openingBalance: form.openingBalance, annualRate: form.annualRate, months: form.months })}>
            생성
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 이자율 히스토리 탭 ──────────────────────────────────────────────
function RatesTab({ rates, plans, getRateForMonth, onAdd, onEdit, onDelete }) {
  return (
    <>
      <div className="page-header">
        <h2>이자율 히스토리</h2>
        <button className="btn btn-primary" onClick={onAdd}>+ 이자율 추가</button>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
          변동 가능 (6개월 단위) · 이자지급일 매달 27일 · 계산식: 잔액 × 연이자율% ÷ 12
        </span>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>적용 시작</th>
              <th>적용 종료</th>
              <th>연이자율</th>
              <th>월이자율</th>
              <th>메모</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 && (
              <tr><td colSpan={7} className="empty-state">등록된 이자율이 없어요.</td></tr>
            )}
            {rates.map(r => {
              const isActive = r.delYn === 'N';
              const monthlyRate = r.annualRate ? (Number(r.annualRate) / 12).toFixed(4) : '-';
              return (
                <tr key={r.id} style={!isActive ? { opacity: 0.4 } : {}}>
                  <td className="col-c" style={{ fontWeight: 600 }}>{r.startYear}년 {r.startMonth}월</td>
                  <td className="col-c">{r.endYear && r.endMonth ? `${r.endYear}년 ${r.endMonth}월` : '현재까지'}</td>
                  <td className="col-c" style={{ fontWeight: 700, color: '#1a237e', fontSize: 15 }}>
                    {fmtRate(r.annualRate)}
                  </td>
                  <td className="col-c" style={{ color: '#555' }}>{monthlyRate}%</td>
                  <td style={{ color: '#888' }}>{r.note}</td>
                  <td className="col-c">
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: isActive ? '#e8f5e9' : '#ffebee',
                      color: isActive ? '#2e7d32' : '#c62828'
                    }}>
                      {isActive ? '적용중' : '비활성'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {isActive && (
                      <>
                        <button className="btn btn-edit" onClick={() => onEdit(r)}>수정</button>
                        <button className="btn btn-danger" onClick={() => onDelete(r.id)}>삭제</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 월별 이자율 적용 현황 */}
      {plans.length > 0 && (
        <>
          <div className="section-title">월별 적용 이자율 확인</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>년월</th>
                  <th>대출 잔액</th>
                  <th>저장된 이자율</th>
                  <th>이자액</th>
                  <th>이자지급일</th>
                  <th>현재 해당구간 이자율</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(p => {
                  const currentRate = getRateForMonth(p.year, p.month);
                  const isSame = !p.appliedRate || !currentRate ||
                    Number(p.appliedRate).toFixed(2) === Number(currentRate.annualRate).toFixed(2);
                  return (
                    <tr key={p.id}>
                      <td className="col-c" style={{ fontWeight: 600 }}>{p.year}년 {p.month}월</td>
                      <td className="col-r">{fmt(p.loanAmount)}</td>
                      <td className="col-c" style={{ fontWeight: 600, color: '#1a237e' }}>{fmtRate(p.appliedRate)}</td>
                      <td className="col-r" style={{ color: '#e65100' }}>{fmt(p.interestAmount)}</td>
                      <td className="col-c">매달 {p.paymentDay || 27}일</td>
                      <td className="col-c">{currentRate ? fmtRate(currentRate.annualRate) : '등록된 이자율 없음'}</td>
                      <td className="col-c">
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: isSame ? '#e8f5e9' : '#fff3e0',
                          color: isSame ? '#2e7d32' : '#e65100'
                        }}>
                          {isSame ? '일치' : '이자율 변경됨'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// ── 상환 계획 모달 ──────────────────────────────────────────────────
function PlanModal({ modal, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcDetail, setCalcDetail] = useState(null); // { annualRate }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 모달 열릴 때 잔액이 이미 있으면 바로 이자 자동계산
  useEffect(() => {
    if (modal.data.loanAmount && modal.mode === 'add') {
      autoCalcInterest(modal.data.loanAmount, modal.data.year, modal.data.month);
    }
  }, []);

  const autoCalcInterest = async (balance, year, month) => {
    if (!balance || !year || !month) return;
    setCalcLoading(true);
    try {
      const result = await calculateInterest(year, month, balance);
      if (result.interestAmount != null) {
        setForm(f => ({
          ...f,
          interestAmount: result.interestAmount,
          appliedRate: result.annualRate,
          paymentDay: result.paymentDay || 27
        }));
        setCalcDetail({ annualRate: result.annualRate });
      }
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{modal.mode === 'add' ? '월 상환 추가' : '상환 수정'}</h3>

        <div style={{ background: '#e8eaf6', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#3949ab', lineHeight: 1.6 }}>
          💡 잔액 입력 시 이자 자동 계산 · 이자지급일 매달 <strong>27일</strong><br/>
          <span style={{ color: '#555' }}>계산식: 잔액 × 연이자율% ÷ 12 (월할)</span>
          {calcDetail && (
            <div style={{ marginTop: 6, color: '#1a237e', fontWeight: 600 }}>
              → {Number(calcDetail.annualRate).toFixed(2)}% 적용 (월할)
            </div>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>년</label>
            <input type="number" value={form.year} onChange={e => set('year', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>월</label>
            <input type="number" min={1} max={12} value={form.month} onChange={e => set('month', +e.target.value)} />
          </div>
          <div className="form-group full">
            <label>대출 잔액 (전월 기준)</label>
            <MoneyInput
              value={form.loanAmount}
              placeholder="이자 자동계산의 기준 잔액"
              onChange={v => {
                set('loanAmount', v);
                autoCalcInterest(v, form.year, form.month);
              }}
            />
          </div>
          <div className="form-group">
            <label>
              이자금액 (27일)
              {calcLoading && <span style={{ color: '#888', fontSize: 11 }}> 계산중...</span>}
            </label>
            <MoneyInput
              value={form.interestAmount}
              placeholder="자동계산 또는 직접입력"
              onChange={v => set('interestAmount', v)}
            />
          </div>
          <div className="form-group">
            <label>적용 이자율 (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.appliedRate || ''}
              placeholder="자동조회됨"
              onChange={e => set('appliedRate', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>정기 상환액</label>
            <MoneyInput
              value={form.repaymentAmount}
              placeholder="0"
              onChange={v => setForm(f => ({
                ...f,
                repaymentAmount: v,
                remainingBalance: (f.loanAmount || 0) - (v || 0) - (f.extraPayment || 0)
              }))}
            />
          </div>
          <div className="form-group">
            <label>추가 상환액</label>
            <MoneyInput
              value={form.extraPayment}
              placeholder="0"
              onChange={v => setForm(f => ({
                ...f,
                extraPayment: v,
                remainingBalance: (f.loanAmount || 0) - (f.repaymentAmount || 0) - (v || 0)
              }))}
            />
          </div>
          <div className="form-group full">
            <label>상환 후 잔액 (자동계산)</label>
            <MoneyInput
              value={form.remainingBalance}
              readOnly
              style={{ background: '#f5f6fa', color: '#1a237e', fontWeight: 600, cursor: 'default' }}
              placeholder="정기+추가 상환액 입력 시 자동계산"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ── 이자율 모달 ────────────────────────────────────────────────────
function RateModal({ modal, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const monthlyPreview = form.annualRate
    ? (Number(form.annualRate) / 12).toFixed(4) + '%'
    : '-';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{modal.mode === 'add' ? '이자율 추가' : '이자율 수정'}</h3>

        <div style={{ background: '#fff3e0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e65100' }}>
          ⚠️ 종료년월을 비워두면 현재까지 적용됩니다. 이자율 변경 시 기존 구간의 종료년월을 먼저 설정하세요.
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>적용 시작 년</label>
            <input type="number" value={form.startYear} onChange={e => set('startYear', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>적용 시작 월</label>
            <input type="number" min={1} max={12} value={form.startMonth} onChange={e => set('startMonth', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>적용 종료 년 (빈칸=현재까지)</label>
            <input type="number" value={form.endYear || ''} onChange={e => set('endYear', e.target.value ? +e.target.value : null)} placeholder="예: 2026" />
          </div>
          <div className="form-group">
            <label>적용 종료 월</label>
            <input type="number" min={1} max={12} value={form.endMonth || ''} onChange={e => set('endMonth', e.target.value ? +e.target.value : null)} placeholder="예: 12" />
          </div>
          <div className="form-group full">
            <label>연이자율 (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.annualRate || ''}
              onChange={e => set('annualRate', e.target.value)}
              placeholder="예: 3.50"
            />
            {form.annualRate && (
              <span style={{ fontSize: 12, color: '#1a237e', marginTop: 4 }}>
                → 월이자율: {monthlyPreview}
              </span>
            )}
          </div>
          <div className="form-group full">
            <label>메모</label>
            <input value={form.note || ''} onChange={e => set('note', e.target.value)} placeholder="예: 2026년 상반기 금리인상 반영" />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>저장</button>
        </div>
      </div>
    </div>
  );
}
