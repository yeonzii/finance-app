import { useState, useEffect, useRef } from 'react';
import {
  getFixedCosts, createFixedCost, updateFixedCost, deleteFixedCost,
  getAllCodes
} from '../api';

const fmt = (n) => n != null && n !== '' ? Number(n).toLocaleString('ko-KR') : '-';

const FIXED_PARENT = 'CD2100'; // 고정비용
const ORG_ROOT = 'CD3000';     // 기관분류

const EMPTY = {
  subcategoryCode: '', itemName: '', amount: '', orgCode: '',
  transactionDay: '', billingDay: '', note: ''
};

// 콤마 표시 금액 입력
function MoneyInput({ value, onChange, placeholder }) {
  const [display, setDisplay] = useState(value != null && value !== '' ? Number(value).toLocaleString('ko-KR') : '');
  const ref = useRef(null);
  useEffect(() => {
    setDisplay(value != null && value !== '' ? Number(value).toLocaleString('ko-KR') : '');
  }, [value]);
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setDisplay(raw ? Number(raw).toLocaleString('ko-KR') : '');
        onChange(raw ? Number(raw) : '');
      }}
    />
  );
}

export default function FixedCostPage() {
  const [list, setList] = useState([]);
  const [codes, setCodes] = useState([]);
  const [modal, setModal] = useState(null);

  const load = () => getFixedCosts().then(setList);
  useEffect(() => {
    load();
    getAllCodes().then(all => setCodes(all.filter(c => c.delYn === 'N')));
  }, []);

  const childrenOf = (pid) =>
    codes.filter(c => c.parentCdId === pid).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const nameById = (cdId) => codes.find(c => c.cdId === cdId)?.cdNm ?? cdId ?? '-';
  const leafDescendants = (cdId) => {
    const kids = childrenOf(cdId);
    if (kids.length === 0) return [];
    return kids.flatMap(k => {
      const grand = leafDescendants(k.cdId);
      return grand.length ? grand : [k];
    });
  };

  // 고정비용 하위 분류 (통신비/관리비/보험비/정기구독)
  const subcats = childrenOf(FIXED_PARENT);
  const orgTypes = childrenOf(ORG_ROOT);

  const openAdd = () => setModal({ mode: 'add', data: { ...EMPTY } });
  const openEdit = (row) => setModal({ mode: 'edit', data: { ...row } });
  const closeModal = () => setModal(null);

  // 세부항목 코드의 분류(부모) ID
  const parentOf = (leafCdId) => codes.find(c => c.cdId === leafCdId)?.parentCdId ?? '_';

  const handleSave = async (data) => {
    const payload = {
      ...data,
      // 항목명은 선택한 세부항목 코드명에서 자동 세팅
      itemName: nameById(data.subcategoryCode),
      amount: data.amount === '' ? null : +data.amount,
      transactionDay: data.transactionDay === '' ? null : +data.transactionDay,
      billingDay: data.billingDay === '' ? null : +data.billingDay,
    };
    if (modal.mode === 'add') await createFixedCost(payload);
    else await updateFixedCost(data.id, payload);
    closeModal();
    load();
  };

  const handleDelete = async (f) => {
    if (!confirm(`'${f.itemName}'을(를) 삭제할까요?`)) return;
    await deleteFixedCost(f.id);
    load();
  };

  // 분류(세부항목의 부모)별 그룹핑
  const grouped = subcats
    .map(sc => ({ sc, items: list.filter(f => parentOf(f.subcategoryCode) === sc.cdId) }))
    .filter(g => g.items.length > 0);
  const ungrouped = list.filter(f => !subcats.some(sc => sc.cdId === parentOf(f.subcategoryCode)));
  if (ungrouped.length) grouped.push({ sc: { cdId: '_', cdNm: '기타' }, items: ungrouped });

  const total = list.reduce((s, f) => s + (f.amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h2>고정비 관리</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ 고정비 추가</button>
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        💡 등록한 고정비는 <b>소득/지출 내역</b>에서 해당 월을 열 때 자동으로 추가돼요. 월별 금액은 거기서 수정할 수 있어요.
      </div>

      {/* 요약 */}
      <div className="asset-cards" style={{ marginBottom: 16 }}>
        <div className="asset-card">
          <div className="card-label">고정비 항목 수</div>
          <div className="card-value">{list.length}개</div>
        </div>
        <div className="asset-card">
          <div className="card-label">월 고정비 합계</div>
          <div className="card-value amount-negative">{fmt(total)}원</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 90, textAlign: 'center' }}>분류</th>
              <th style={{ textAlign: 'center' }}>세부항목</th>
              <th style={{ textAlign: 'center' }}>금액</th>
              <th style={{ textAlign: 'center' }}>기관</th>
              <th style={{ textAlign: 'center' }}>거래일</th>
              <th style={{ textAlign: 'center' }}>청구일</th>
              <th style={{ textAlign: 'center' }}>메모</th><th></th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && (
              <tr><td colSpan={8} className="empty-state">등록된 고정비가 없어요. 추가해보세요.</td></tr>
            )}
            {grouped.map(({ sc, items }) =>
              items.map((f, i) => (
                <tr key={f.id}>
                  {i === 0 && (
                    <td rowSpan={items.length + 1} style={{ width: 90, whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <span className="category-label" style={{ background: '#ffebee', color: '#c62828' }}>
                        {sc.cdNm}
                      </span>
                    </td>
                  )}
                  <td style={{ fontWeight: 600 }}>{f.itemName}</td>
                  <td className="amount-negative">{fmt(f.amount)}</td>
                  <td style={{ textAlign: 'center' }}>{f.orgCode ? nameById(f.orgCode) : '-'}</td>
                  <td style={{ textAlign: 'center' }}>{f.transactionDay ? `${f.transactionDay}일` : '-'}</td>
                  <td style={{ textAlign: 'center' }}>{f.billingDay ? `${f.billingDay}일` : '-'}</td>
                  <td style={{ color: '#888' }}>{f.note}</td>
                  <td>
                    <button className="btn btn-edit" onClick={() => openEdit(f)} style={{ marginRight: 4 }}>수정</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(f)}>삭제</button>
                  </td>
                </tr>
              )).concat(
                <tr key={`sum-${sc.cdId}`} className="summary-row">
                  <td style={{ color: '#555' }}>소계</td>
                  <td className="amount-negative">{fmt(items.reduce((s, f) => s + (f.amount || 0), 0))}</td>
                  <td colSpan={5}></td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <FixedCostModal
          modal={modal}
          subcats={subcats}
          orgTypes={orgTypes}
          leafDescendants={leafDescendants}
          parentOf={parentOf}
          MoneyInput={MoneyInput}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function FixedCostModal({ modal, subcats, orgTypes, leafDescendants, parentOf, MoneyInput, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 분류(세부항목의 부모) — 수정 시 기존 세부항목으로부터 역추적
  const [selectedCat, setSelectedCat] = useState(modal.data.subcategoryCode ? parentOf(modal.data.subcategoryCode) : '');
  // 선택된 분류의 세부항목(말단 코드)
  const subItems = selectedCat ? leafDescendants(selectedCat) : [];

  // 수정 시 기존 기관코드로부터 기관 종류 역추적
  const initialType = (() => {
    if (!modal.data.orgCode) return '';
    const t = orgTypes.find(ot => leafDescendants(ot.cdId).some(o => o.cdId === modal.data.orgCode));
    return t?.cdId ?? '';
  })();
  const [selectedOrgType, setSelectedOrgType] = useState(initialType);
  const orgs = selectedOrgType ? leafDescendants(selectedOrgType) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{modal.mode === 'add' ? '고정비 추가' : '고정비 수정'}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>분류</label>
            <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); set('subcategoryCode', ''); }}>
              <option value="">선택</option>
              {subcats.map(c => <option key={c.cdId} value={c.cdId}>{c.cdNm}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>세부항목</label>
            <select value={form.subcategoryCode || ''} onChange={e => set('subcategoryCode', e.target.value)} disabled={!selectedCat}>
              <option value="">선택</option>
              {subItems.map(c => <option key={c.cdId} value={c.cdId}>{c.cdNm}</option>)}
            </select>
            {selectedCat && subItems.length === 0 && (
              <small style={{ color: '#c62828' }}>세부항목이 없어요. 공통코드 관리에서 먼저 추가하세요.</small>
            )}
          </div>
          <div className="form-group">
            <label>금액</label>
            <MoneyInput value={form.amount} onChange={v => set('amount', v)} placeholder="0" />
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
          <div className="form-group">
            <label>거래일</label>
            <input type="number" min={1} max={31} value={form.transactionDay || ''} onChange={e => set('transactionDay', e.target.value ? +e.target.value : '')} placeholder="일" />
          </div>
          <div className="form-group">
            <label>청구일</label>
            <input type="number" min={1} max={31} value={form.billingDay || ''} onChange={e => set('billingDay', e.target.value ? +e.target.value : '')} placeholder="일" />
          </div>
          <div className="form-group full">
            <label>메모</label>
            <input value={form.note || ''} onChange={e => set('note', e.target.value)} placeholder="메모" />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.subcategoryCode}>저장</button>
        </div>
      </div>
    </div>
  );
}
