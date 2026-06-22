import { useState, useEffect, useCallback } from 'react';
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getAllCodes, generateFixedCosts, getPaymentInstitutions
} from '../api';

const fmt = (n) => n != null ? Number(n).toLocaleString('ko-KR') : '-';

const ROOT = 'CD0000';
const ORG_ROOT = 'CD3000';   // 기관분류
const INCOME = 'CD1000';     // 소득
const EXPENSE = 'CD2000';    // 비용
const BANK = 'CD3300';       // 기관분류 > 은행
const CARD_ROOT = 'CD3100';  // 기관분류 > 카드사
const CARDVALUE = 'CD2210';  // 가변비용 > 카드값

// 대분류 코드 → 색상
const CATEGORY_STYLE = {
  CD1000: { bg: '#e8f5e9', color: '#2e7d32' }, // 소득
  CD2000: { bg: '#ffebee', color: '#c62828' }, // 비용
  CD4000: { bg: '#e8eaf6', color: '#283593' }, // 투자
};

const EMPTY_FORM = {
  year: new Date().getFullYear(), month: new Date().getMonth() + 1,
  categoryCode: '', subcategoryCode: '', amount: '',
  transactionDay: '', billingDay: '', orgCode: '', note: ''
};

export default function TransactionsPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows]   = useState([]);
  const [modal, setModal] = useState(null);
  const [codes, setCodes] = useState([]);   // 활성 코드 전체
  const [payMap, setPayMap] = useState({}); // 카드사 codeId → 결제일
  const [collapsed, setCollapsed] = useState({}); // `${cat}-${mid}` → true(접힘)
  const toggleMid = (cat, mid) =>
    setCollapsed(c => ({ ...c, [`${cat}-${mid}`]: !c[`${cat}-${mid}`] }));
  const isCollapsed = (cat, mid) => !!collapsed[`${cat}-${mid}`];

  useEffect(() => {
    getAllCodes().then(all => setCodes(all.filter(c => c.delYn === 'N')));
    getPaymentInstitutions().then(list => {
      const m = {};
      list.forEach(p => { if (p.paymentDay != null) m[p.codeId] = p.paymentDay; });
      setPayMap(m);
    });
  }, []);

  // ── 코드 헬퍼 ──────────────────────────────────
  const childrenOf = (pid) =>
    codes.filter(c => c.parentCdId === pid).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const nameById = (cdId) => codes.find(c => c.cdId === cdId)?.cdNm ?? cdId ?? '-';
  // 특정 코드의 말단(leaf) 후손들 = 실제 선택 가능한 항목
  const leafDescendants = (cdId) => {
    const kids = childrenOf(cdId);
    if (kids.length === 0) return [];
    return kids.flatMap(k => {
      const grand = leafDescendants(k.cdId);
      return grand.length ? grand : [k];
    });
  };
  // code가 anc(조상) 자신이거나 하위인지
  const isUnder = (code, anc) => {
    let c = code;
    for (let i = 0; i < 8 && c; i++) {
      if (c === anc) return true;
      c = codes.find(x => x.cdId === c)?.parentCdId;
    }
    return false;
  };
  const relOrgOf = (cdId) => codes.find(c => c.cdId === cdId)?.relOrgCd;
  // 카드 결제로 중복 계상되는 거래: 카드값 하위가 아니면서 관련기관이 카드사
  const isCardDuplicate = (subCd) =>
    !isUnder(subCd, CARDVALUE) && isUnder(relOrgOf(subCd), CARD_ROOT);

  // 말단(leaf) 코드에서 대분류(top)의 직속 자식(=중분류) 코드ID 도출
  const middleOf = (leafCdId, topCdId) => {
    let cur = codes.find(c => c.cdId === leafCdId);
    while (cur && cur.parentCdId && cur.parentCdId !== topCdId) {
      cur = codes.find(c => c.cdId === cur.parentCdId);
    }
    return cur?.cdId ?? '';
  };

  // 대분류 내 거래를 중분류별로 그룹핑 (중분류 코드 순)
  const middleGroupsOf = (cat, items) => {
    const map = new Map();
    items.forEach(it => {
      const mid = middleOf(it.subcategoryCode, cat) || it.subcategoryCode;
      if (!map.has(mid)) map.set(mid, []);
      map.get(mid).push(it);
    });
    return [...map.entries()]
      .map(([midId, list]) => ({
        midId, items: list,
        subtotal: list.reduce((s, r) => s + (r.amount || 0), 0),
      }))
      .sort((a, b) => a.midId.localeCompare(b.midId));
  };

  // 소분류 코드의 관련기관(REL_ORG_CD) → { orgCode, orgType(기관 종류) }
  const autoOrgFromCode = (subCd) => {
    const rel = codes.find(c => c.cdId === subCd)?.relOrgCd;
    if (!rel) return null;
    let n = codes.find(c => c.cdId === rel);
    while (n && n.parentCdId && n.parentCdId !== ORG_ROOT) n = codes.find(c => c.cdId === n.parentCdId);
    return { orgCode: rel, orgType: n?.cdId ?? '' };
  };

  // 거래 대분류 = ROOT의 자식 중 기관분류 제외 (소득/비용/투자)
  const categories = childrenOf(ROOT).filter(c => c.cdId !== ORG_ROOT);
  // 기관 종류 = 기관분류의 자식 (카드사/보험사/은행/증권사)
  const orgTypes = childrenOf(ORG_ROOT);

  const load = useCallback(() => getTransactions(year, month).then(setRows), [year, month]);

  // 월 변경 시: 고정비 자동 생성(중복 방지) 후 목록 로드
  useEffect(() => {
    let cancelled = false;
    generateFixedCosts(year, month)
      .catch(() => {})
      .then(() => { if (!cancelled) load(); });
    return () => { cancelled = true; };
  }, [year, month, load]);

  const openAdd  = () => setModal({ mode: 'add',  data: { ...EMPTY_FORM, year, month } });
  const openEdit = (row) => setModal({ mode: 'edit', data: { ...row } });
  const closeModal = () => setModal(null);

  const handleSave = async (data) => {
    if (modal.mode === 'add') await createTransaction(data);
    else await updateTransaction(data.id, data);
    closeModal();
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('삭제할까요? (소프트 삭제)')) return;
    await deleteTransaction(id);
    load();
  };

  const catStyle = (code) => CATEGORY_STYLE[code] ?? { bg: '#f5f5f5', color: '#555' };

  // 대분류별 그룹핑
  const grouped = categories
    .filter(cat => rows.some(r => r.categoryCode === cat.cdId))
    .map(cat => ({ cat, items: rows.filter(r => r.categoryCode === cat.cdId) }));

  const totalIncome  = rows.filter(r => r.categoryCode === INCOME).reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense = rows.filter(r => r.categoryCode !== INCOME).reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h2>소득/지출 내역</h2>
        <div className="selector">
          <select value={year} onChange={e => setYear(+e.target.value)}>
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <span>년</span>
          <select value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m}>{m}</option>)}
          </select>
          <span>월</span>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ 항목 추가</button>
      </div>

      {/* 요약 카드 */}
      <div className="asset-cards" style={{ marginBottom: 16 }}>
        <div className="asset-card">
          <div className="card-label">총 수입</div>
          <div className="card-value amount-positive">{fmt(totalIncome)}원</div>
        </div>
        <div className="asset-card">
          <div className="card-label">총 지출</div>
          <div className="card-value amount-negative">{fmt(totalExpense)}원</div>
        </div>
        <div className="asset-card">
          <div className="card-label">잔여</div>
          <div className="card-value" style={{ color: totalIncome - totalExpense >= 0 ? '#2e7d32' : '#c62828' }}>
            {fmt(totalIncome - totalExpense)}원
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 150 }}>대분류</th><th style={{ width: 150 }}>중분류</th><th>소분류</th><th>금액</th>
              <th>청구일</th><th>기관</th><th>결제일</th><th>메모</th><th></th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && (
              <tr><td colSpan={9} className="empty-state">이 달의 데이터가 없어요.</td></tr>
            )}
            {grouped.map(({ cat, items }) => {
              const style = catStyle(cat.cdId);
              const mids = middleGroupsOf(cat.cdId, items);
              const catTotal = items.reduce((s, r) => s + (r.amount || 0), 0);
              const isIncome = cat.cdId === INCOME;
              // 비용 대분류: 카드 결제로 중복 계상된 금액
              const dupCost = cat.cdId === EXPENSE
                ? items.filter(r => isCardDuplicate(r.subcategoryCode)).reduce((s, r) => s + (r.amount || 0), 0)
                : 0;
              const extraRows = dupCost > 0 ? 2 : 0; // (-)중복비용, (=)중복제거비용
              // 대분류 셀 rowspan = (각 중분류: 접힘 1행 / 펼침 항목수) 합 + 소계 + 추가요약
              const catRowSpan = mids.reduce(
                (s, g) => s + (isCollapsed(cat.cdId, g.midId) ? 1 : g.items.length), 0
              ) + 1 + extraRows;
              const out = [];
              let catRendered = false;
              const catCell = () => {
                catRendered = true;
                return (
                  <td rowSpan={catRowSpan} style={{ width: 150, whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <span className="category-label" style={{ background: style.bg, color: style.color }}>
                      {cat.cdNm}
                    </span>
                  </td>
                );
              };

              mids.forEach(g => {
                const collapsed = isCollapsed(cat.cdId, g.midId);
                const midName = nameById(g.midId);
                const toggle = (
                  <span onClick={() => toggleMid(cat.cdId, g.midId)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ color: '#3949ab', marginRight: 4 }}>{collapsed ? '▶' : '▼'}</span>{midName}
                  </span>
                );

                if (collapsed) {
                  out.push(
                    <tr key={`${cat.cdId}-${g.midId}`} style={{ background: '#fcfcfd' }}>
                      {!catRendered && catCell()}
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{toggle}</td>
                      <td style={{ color: '#aaa', fontSize: 12 }}>({g.items.length}개 항목)</td>
                      <td className={isIncome ? 'amount-positive' : 'amount-negative'} style={{ fontWeight: 600 }}>
                        {fmt(g.subtotal)}
                      </td>
                      <td colSpan={5}></td>
                    </tr>
                  );
                } else {
                  g.items.forEach((row, idx) => {
                    out.push(
                      <tr key={row.id}>
                        {!catRendered && catCell()}
                        {idx === 0 && (
                          <td rowSpan={g.items.length} style={{ fontWeight: 600, verticalAlign: 'top', textAlign: 'center' }}>
                            {toggle}
                            <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                              소계 {fmt(g.subtotal)}
                            </div>
                          </td>
                        )}
                        <td>{nameById(row.subcategoryCode)}</td>
                        <td className={isIncome ? 'amount-positive' : 'amount-negative'}>{fmt(row.amount)}</td>
                        <td className="col-c" style={{ color: '#888', fontSize: 12 }}>{row.billingDay ? `${row.billingDay}일` : ''}</td>
                        <td className="col-c">{row.orgCode ? nameById(row.orgCode) : ''}</td>
                        <td className="col-c">{row.transactionDay ? `${row.transactionDay}일` : ''}</td>
                        <td style={{ color: '#888' }}>{row.note}</td>
                        <td>
                          <button className="btn btn-edit" onClick={() => openEdit(row)} style={{ marginRight: 4 }}>수정</button>
                          <button className="btn btn-danger" onClick={() => handleDelete(row.id)}>삭제</button>
                        </td>
                      </tr>
                    );
                  });
                }
              });

              // 대분류 소계
              out.push(
                <tr key={`sum-${cat.cdId}`} className="summary-row">
                  <td style={{ color: '#555' }} colSpan={2}>소계</td>
                  <td className={isIncome ? 'amount-positive' : 'amount-negative'} style={{ fontWeight: 700 }}>{fmt(catTotal)}</td>
                  <td colSpan={5}></td>
                </tr>
              );
              // 비용: 카드 중복비용 / 중복제거비용
              if (dupCost > 0) {
                out.push(
                  <tr key={`dup-${cat.cdId}`} style={{ background: '#fff8f8' }}>
                    <td style={{ color: '#e65100', fontSize: 12 }} colSpan={2}>(-) 카드 중복비용</td>
                    <td style={{ color: '#e65100', fontWeight: 600 }}>-{fmt(dupCost)}</td>
                    <td colSpan={5} style={{ color: '#aaa', fontSize: 11 }}>고정비 중 카드결제분 (카드값에 이미 포함)</td>
                  </tr>
                );
                out.push(
                  <tr key={`net-${cat.cdId}`} className="summary-row" style={{ background: '#f1f8e9' }}>
                    <td style={{ color: '#2e7d32', fontWeight: 700 }} colSpan={2}>(=) 중복제거 비용</td>
                    <td style={{ color: '#2e7d32', fontWeight: 700 }}>{fmt(catTotal - dupCost)}</td>
                    <td colSpan={5}></td>
                  </tr>
                );
              }
              return out;
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <TransactionModal
          modal={modal}
          categories={categories}
          orgTypes={orgTypes}
          childrenOf={childrenOf}
          leafDescendants={leafDescendants}
          middleOf={middleOf}
          autoOrgFromCode={autoOrgFromCode}
          payMap={payMap}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function TransactionModal({ modal, categories, orgTypes, childrenOf, leafDescendants, middleOf, autoOrgFromCode, payMap, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 중분류: 대분류의 직속 자식. 수정 시 기존 소분류로부터 역추적
  const [middle, setMiddle] = useState(
    modal.data.subcategoryCode ? middleOf(modal.data.subcategoryCode, modal.data.categoryCode) : ''
  );
  const middleOptions = form.categoryCode ? childrenOf(form.categoryCode) : [];
  const subcodes = middle ? leafDescendants(middle) : []; // 선택한 중분류의 말단 항목

  // 기관 종류 선택 → 해당 기관들 (수정 시 기존 기관코드로부터 종류 역추적)
  const findOrgType = (orgCd) =>
    orgTypes.find(t => leafDescendants(t.cdId).some(o => o.cdId === orgCd))?.cdId ?? '';
  const [selectedOrgType, setSelectedOrgType] = useState(
    modal.data.orgCode ? findOrgType(modal.data.orgCode) : ''
  );
  const orgs = selectedOrgType ? leafDescendants(selectedOrgType) : [];

  // 기관 지정 + 결제일(카드사) 자동채움
  const applyOrg = (orgCd) => {
    set('orgCode', orgCd);
    if (orgCd && payMap[orgCd] != null) set('transactionDay', payMap[orgCd]);
  };

  // 소분류 지정 + 관련기관 자동채움 (수정 가능)
  const applySub = (v) => {
    set('subcategoryCode', v);
    if (!v) return;
    const auto = autoOrgFromCode(v);
    if (auto && auto.orgCode) { setSelectedOrgType(auto.orgType); applyOrg(auto.orgCode); }
  };

  const onChangeCategory = (v) => { set('categoryCode', v); setMiddle(''); set('subcategoryCode', ''); };
  const onChangeMiddle = (v) => {
    setMiddle(v);
    const leaves = v ? leafDescendants(v) : [];
    if (leaves.length === 0) applySub(v); // 중분류가 말단이면 그것이 곧 소분류
    else set('subcategoryCode', '');
  };
  // 청구일 입력: 기관 종류가 은행이면 결제일도 동일하게
  const onChangeBilling = (v) => {
    const day = v ? +v : null;
    set('billingDay', day);
    if (selectedOrgType === BANK && day != null) set('transactionDay', day);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <h3>{modal.mode === 'add' ? '항목 추가' : '항목 수정'}</h3>

        {/* 년/월 */}
        <div className="form-grid">
          <div className="form-group">
            <label>년</label>
            <input type="number" value={form.year} onChange={e => set('year', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>월</label>
            <input type="number" min={1} max={12} value={form.month} onChange={e => set('month', +e.target.value)} />
          </div>
        </div>

        {/* 대분류 / 중분류 / 소분류 */}
        <div className="form-grid cols-3">
          <div className="form-group">
            <label>대분류</label>
            <select value={form.categoryCode} onChange={e => onChangeCategory(e.target.value)}>
              <option value="">선택</option>
              {categories.map(c => <option key={c.cdId} value={c.cdId}>{c.cdNm}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>중분류</label>
            <select value={middle} onChange={e => onChangeMiddle(e.target.value)} disabled={!form.categoryCode}>
              <option value="">선택</option>
              {middleOptions.map(c => <option key={c.cdId} value={c.cdId}>{c.cdNm}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>소분류</label>
            <select value={form.subcategoryCode} onChange={e => applySub(e.target.value)}
                    disabled={!middle || subcodes.length === 0}>
              <option value="">{subcodes.length === 0 && middle ? '(중분류가 말단)' : '선택'}</option>
              {subcodes.map(c => <option key={c.cdId} value={c.cdId}>{c.cdNm}</option>)}
            </select>
          </div>
        </div>

        {/* 금액 / 청구일 */}
        <div className="form-grid">
          <div className="form-group">
            <label>금액</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.amount === '' || form.amount == null ? '' : Number(form.amount).toLocaleString('ko-KR')}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                set('amount', raw === '' ? '' : +raw);
              }}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label>청구일</label>
            <input type="number" min={1} max={31} value={form.billingDay || ''} onChange={e => onChangeBilling(e.target.value)} placeholder="일" />
          </div>
        </div>

        {/* 기관 종류 / 기관명 / 결제일 */}
        <div className="form-grid cols-3">
          <div className="form-group">
            <label>기관 종류</label>
            <select value={selectedOrgType} onChange={e => { setSelectedOrgType(e.target.value); set('orgCode', ''); }}>
              <option value="">선택</option>
              {orgTypes.map(o => <option key={o.cdId} value={o.cdId}>{o.cdNm}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>기관명</label>
            <select value={form.orgCode || ''} onChange={e => applyOrg(e.target.value)} disabled={!selectedOrgType}>
              <option value="">없음</option>
              {orgs.map(o => <option key={o.cdId} value={o.cdId}>{o.cdNm}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>결제일</label>
            <input type="number" min={1} max={31} value={form.transactionDay || ''} onChange={e => set('transactionDay', e.target.value ? +e.target.value : null)} placeholder="일" />
          </div>
        </div>

        {/* 메모 */}
        <div className="form-grid">
          <div className="form-group full">
            <label>메모</label>
            <input value={form.note || ''} onChange={e => set('note', e.target.value)} placeholder="메모" />
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
