import { useState, useEffect, useCallback } from 'react';
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getAllCodes
} from '../api';

const fmt = (n) => n != null ? Number(n).toLocaleString('ko-KR') : '-';

const ROOT = 'CD0000';
const ORG_ROOT = 'CD3000';   // 기관분류
const INCOME = 'CD1000';     // 소득

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

  useEffect(() => {
    getAllCodes().then(all => setCodes(all.filter(c => c.delYn === 'N')));
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

  // 거래 대분류 = ROOT의 자식 중 기관분류 제외 (소득/비용/투자)
  const categories = childrenOf(ROOT).filter(c => c.cdId !== ORG_ROOT);
  // 기관 종류 = 기관분류의 자식 (카드사/보험사/은행/증권사)
  const orgTypes = childrenOf(ORG_ROOT);

  const load = useCallback(() => getTransactions(year, month).then(setRows), [year, month]);
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
              <th>대분류</th><th>항목</th><th>금액</th>
              <th>일자</th><th>청구일</th><th>기관</th><th>메모</th><th></th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && (
              <tr><td colSpan={8} className="empty-state">이 달의 데이터가 없어요.</td></tr>
            )}
            {grouped.map(({ cat, items }) => {
              const style = catStyle(cat.cdId);
              return items.map((row, i) => (
                <tr key={row.id}>
                  {i === 0 && (
                    <td rowSpan={items.length + 1}>
                      <span className="category-label" style={{ background: style.bg, color: style.color }}>
                        {cat.cdNm}
                      </span>
                    </td>
                  )}
                  <td>{nameById(row.subcategoryCode)}</td>
                  <td className={cat.cdId === INCOME ? 'amount-positive' : 'amount-negative'}>
                    {fmt(row.amount)}
                  </td>
                  <td>{row.transactionDay ? `${row.transactionDay}일` : ''}</td>
                  <td style={{ color: '#888', fontSize: 12 }}>{row.billingDay ? `청구일 ${row.billingDay}일` : ''}</td>
                  <td>{row.orgCode ? nameById(row.orgCode) : ''}</td>
                  <td style={{ color: '#888' }}>{row.note}</td>
                  <td>
                    <button className="btn btn-edit" onClick={() => openEdit(row)} style={{ marginRight: 4 }}>수정</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(row.id)}>삭제</button>
                  </td>
                </tr>
              )).concat(
                <tr key={`sum-${cat.cdId}`} className="summary-row">
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
          orgTypes={orgTypes}
          leafDescendants={leafDescendants}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function TransactionModal({ modal, categories, orgTypes, leafDescendants, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 선택한 대분류의 말단 항목들
  const subcodes = form.categoryCode ? leafDescendants(form.categoryCode) : [];

  // 기관 종류 선택 → 해당 기관들
  const [selectedOrgType, setSelectedOrgType] = useState('');
  const orgs = selectedOrgType ? leafDescendants(selectedOrgType) : [];

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
              {categories.map(c => <option key={c.cdId} value={c.cdId}>{c.cdNm}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>소분류</label>
            <select value={form.subcategoryCode} onChange={e => set('subcategoryCode', e.target.value)} disabled={!form.categoryCode}>
              <option value="">선택</option>
              {subcodes.map(c => <option key={c.cdId} value={c.cdId}>{c.cdNm}</option>)}
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
              <option value="">선택</option>
              {orgTypes.map(o => <option key={o.cdId} value={o.cdId}>{o.cdNm}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>기관명</label>
            <select value={form.orgCode || ''} onChange={e => set('orgCode', e.target.value)} disabled={!selectedOrgType}>
              <option value="">없음</option>
              {orgs.map(o => <option key={o.cdId} value={o.cdId}>{o.cdNm}</option>)}
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
