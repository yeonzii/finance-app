import { useState, useEffect, useCallback } from 'react';
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getCodesByGroup, getAllCodes
} from '../api';

const fmt = (n) => n != null ? Number(n).toLocaleString('ko-KR') : '-';

// 대분류 코드 → 색상 클래스
const CATEGORY_STYLE = {
  INCOME:  { bg: '#e8f5e9', color: '#2e7d32' },
  EXPENSE: { bg: '#ffebee', color: '#c62828' },
  INVEST:  { bg: '#e8eaf6', color: '#283593' },
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

  // 공통코드 캐시
  const [categories, setCategories]     = useState([]);  // 대분류
  const [allSubcodes, setAllSubcodes]   = useState([]);  // 소득유형+비용유형+투자유형
  const [orgTypes, setOrgTypes]         = useState([]);  // 기관유형
  const [allOrgs, setAllOrgs]           = useState([]);  // 카드사+보험사+은행+증권사 통합

  useEffect(() => {
    // 공통코드 한 번에 로드
    Promise.all([
      getCodesByGroup('대분류'),
      getAllCodes(),
    ]).then(([cats, all]) => {
      setCategories(cats);
      // 소분류: 소득유형/비용유형/투자유형
      setAllSubcodes(all.filter(c =>
        ['소득유형','비용유형','투자유형'].includes(c.codeGroup) && c.delYn === 'N'
      ));
      // 기관유형 (카드사/보험사/은행/증권사 상위)
      setOrgTypes(all.filter(c => c.codeGroup === '기관유형' && c.delYn === 'N'));
      // 실제 기관 목록
      setAllOrgs(all.filter(c =>
        ['카드사','보험사','은행','증권사'].includes(c.codeGroup) && c.delYn === 'N'
      ));
    });
  }, []);

  const load = useCallback(() => {
    return getTransactions(year, month).then(setRows);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

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
    if (!confirm('삭제할까요? (복구 불가능 아님, 소프트 삭제)')) return;
    await deleteTransaction(id);
    load();
  };

  // 코드 → 표시명 변환 헬퍼
  const catName  = (code) => categories.find(c => c.code === code)?.codeName ?? code;
  const subName  = (code) => allSubcodes.find(c => c.code === code)?.codeName ?? code;
  const orgName  = (code) => allOrgs.find(c => c.code === code)?.codeName ?? code;
  const catStyle = (code) => CATEGORY_STYLE[code] ?? { bg: '#f5f5f5', color: '#555' };

  // 대분류별 그룹핑
  const grouped = categories
    .filter(cat => rows.some(r => r.categoryCode === cat.code))
    .map(cat => ({ cat, items: rows.filter(r => r.categoryCode === cat.code) }));

  const totalIncome  = rows.filter(r => r.categoryCode === 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense = rows.filter(r => r.categoryCode !== 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);

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
              <th>대분류</th><th>항목</th><th>금액</th>
              <th>일자</th><th>청구일</th><th>기관</th><th>메모</th><th></th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && (
              <tr><td colSpan={8} className="empty-state">이 달의 데이터가 없어요.</td></tr>
            )}
            {grouped.map(({ cat, items }) => {
              const style = catStyle(cat.code);
              return items.map((row, i) => (
                <tr key={row.id}>
                  {i === 0 && (
                    <td rowSpan={items.length + 1}>
                      <span className="category-label" style={{ background: style.bg, color: style.color }}>
                        {cat.codeName}
                      </span>
                    </td>
                  )}
                  <td>{subName(row.subcategoryCode)}</td>
                  <td className={cat.code === 'INCOME' ? 'amount-positive' : 'amount-negative'}>
                    {fmt(row.amount)}
                  </td>
                  <td>{row.transactionDay ? `${row.transactionDay}일` : ''}</td>
                  <td style={{ color: '#888', fontSize: 12 }}>{row.billingDay ? `청구일 ${row.billingDay}일` : ''}</td>
                  <td>{orgName(row.orgCode)}</td>
                  <td style={{ color: '#888' }}>{row.note}</td>
                  <td>
                    <button className="btn btn-edit" onClick={() => openEdit(row)} style={{ marginRight: 4 }}>수정</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(row.id)}>삭제</button>
                  </td>
                </tr>
              )).concat(
                <tr key={`sum-${cat.code}`} className="summary-row">
                  <td style={{ color: '#555' }}>소계</td>
                  <td>{fmt(items.reduce((s, r) => s + (r.amount || 0), 0))}</td>
                  <td colSpan={6}></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <TransactionModal
          modal={modal}
          categories={categories}
          allSubcodes={allSubcodes}
          orgTypes={orgTypes}
          allOrgs={allOrgs}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function TransactionModal({ modal, categories, allSubcodes, orgTypes, allOrgs, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 선택한 대분류에 따라 소분류 필터링
  const subcodeMap = { INCOME: '소득유형', EXPENSE: '비용유형', INVEST: '투자유형' };
  const subcodes = allSubcodes.filter(c => c.codeGroup === (subcodeMap[form.categoryCode] ?? ''));

  // 선택한 기관유형에 따라 실제 기관 필터링
  const [selectedOrgType, setSelectedOrgType] = useState('');
  const orgTypeMap = { CARD_CO: '카드사', INS_CO: '보험사', BANK: '은행', BROK: '증권사' };
  const filteredOrgs = selectedOrgType
    ? allOrgs.filter(o => o.codeGroup === orgTypeMap[selectedOrgType])
    : allOrgs;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{modal.mode === 'add' ? '항목 추가' : '항목 수정'}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>년</label>
            <input type="number" value={form.year} onChange={e => set('year', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>월</label>
            <input type="number" min={1} max={12} value={form.month} onChange={e => set('month', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>대분류</label>
            <select value={form.categoryCode} onChange={e => { set('categoryCode', e.target.value); set('subcategoryCode', ''); }}>
              <option value="">선택</option>
              {categories.map(c => <option key={c.code} value={c.code}>{c.codeName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>소분류</label>
            <select value={form.subcategoryCode} onChange={e => set('subcategoryCode', e.target.value)} disabled={!form.categoryCode}>
              <option value="">선택</option>
              {subcodes.map(c => <option key={c.code} value={c.code}>{c.codeName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>금액</label>
            <input type="number" value={form.amount} onChange={e => set('amount', +e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>일자</label>
            <input type="number" min={1} max={31} value={form.transactionDay || ''} onChange={e => set('transactionDay', e.target.value ? +e.target.value : null)} placeholder="일" />
          </div>
          <div className="form-group">
            <label>청구일</label>
            <input type="number" min={1} max={31} value={form.billingDay || ''} onChange={e => set('billingDay', e.target.value ? +e.target.value : null)} placeholder="일" />
          </div>
          <div className="form-group">
            <label>기관 종류</label>
            <select value={selectedOrgType} onChange={e => { setSelectedOrgType(e.target.value); set('orgCode', ''); }}>
              <option value="">전체</option>
              {orgTypes.map(o => <option key={o.code} value={o.code}>{o.codeName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>기관명</label>
            <select value={form.orgCode || ''} onChange={e => set('orgCode', e.target.value)}>
              <option value="">없음</option>
              {filteredOrgs.map(o => <option key={o.code} value={o.code}>{o.codeName}</option>)}
            </select>
          </div>
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
