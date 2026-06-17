import { useState, useEffect, useCallback, useRef } from 'react';
import { getAssetItems, getAssetValues, saveAssetValue, getAllCodes } from '../api';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const fmt = (n) => n != null && n !== '' ? Number(n).toLocaleString('ko-KR') : '';

const TYPES = [
  { key: 'INCOME',  label: '소득', color: '#2e7d32', bg: '#e8f5e9' },
  { key: 'EXPENSE', label: '지출', color: '#c62828', bg: '#ffebee' },
  { key: 'ASSET',   label: '자산', color: '#283593', bg: '#e8eaf6' },
];

export default function AssetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState([]);
  const [codes, setCodes] = useState([]);
  const [values, setValues] = useState([]); // [{assetItemId, year, month, amount}]
  const [modal, setModal] = useState(null);

  useEffect(() => {
    getAssetItems().then(setItems);
    getAllCodes().then(all => setCodes(all.filter(c => c.delYn === 'N')));
  }, []);

  const loadValues = useCallback(() => getAssetValues(year).then(setValues), [year]);
  useEffect(() => { loadValues(); }, [loadValues]);

  const nameById = (cdId) => codes.find(c => c.cdId === cdId)?.cdNm ?? cdId ?? '-';

  const valueMap = {};
  values.forEach(v => { valueMap[`${v.assetItemId}-${v.month}`] = v.amount; });
  const getVal = (itemId, month) => valueMap[`${itemId}-${month}`];

  const typeMonthTotal = (typeKey, month) =>
    items.filter(i => i.assetType === typeKey)
         .reduce((s, i) => s + (getVal(i.id, month) || 0), 0);
  const itemYearTotal = (itemId) =>
    MONTHS.reduce((s, m) => s + (getVal(itemId, m) || 0), 0);

  const openCell = (item, month) =>
    setModal({ item, month, amount: getVal(item.id, month) ?? '' });
  const closeModal = () => setModal(null);

  const handleSave = async (amount) => {
    await saveAssetValue({
      assetItemId: modal.item.id, year, month: modal.month,
      amount: amount === '' ? null : +amount,
    });
    closeModal();
    loadValues();
  };

  // 항목이 있는 구분만
  const activeTypes = TYPES
    .map(t => ({ ...t, list: items.filter(i => i.assetType === t.key) }))
    .filter(t => t.list.length > 0);

  const hasItems = items.length > 0;

  return (
    <div>
      <div className="page-header">
        <h2>자산 현황</h2>
        <div className="selector">
          <select value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <span>년</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        💡 셀을 클릭해 월별 금액을 입력하세요. 항목 구성은 <b>자산 항목 구성</b> 탭에서 관리해요.
      </div>

      {!hasItems ? (
        <div className="table-wrap"><div className="empty-state" style={{ padding: 40 }}>
          구성된 자산 항목이 없어요. <b>자산 항목 구성</b> 탭에서 먼저 항목을 추가하세요.
        </div></div>
      ) : (
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ position: 'sticky', left: 0, background: '#e8eaf6', minWidth: 56 }}>월</th>
                {activeTypes.map(t => (
                  <th key={t.key} colSpan={t.list.length + 1}
                      style={{ textAlign: 'center', color: t.color, background: t.bg }}>
                    {t.label}
                  </th>
                ))}
                <th rowSpan={2} style={{ textAlign: 'right', minWidth: 90, background: '#fff8e1' }}>수지<br/>(소득-지출)</th>
              </tr>
              <tr>
                {activeTypes.flatMap(t => [
                  ...t.list.map(it => (
                    <th key={it.id} style={{ textAlign: 'right', minWidth: 80 }}>{nameById(it.codeId)}</th>
                  )),
                  <th key={`${t.key}-sum`} style={{ textAlign: 'right', minWidth: 84, color: t.color, background: t.bg }}>{t.label}합계</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {MONTHS.map(m => {
                const net = typeMonthTotal('INCOME', m) - typeMonthTotal('EXPENSE', m);
                return (
                  <tr key={m}>
                    <td style={{ position: 'sticky', left: 0, background: '#fff', fontWeight: 600 }}>{m}월</td>
                    {activeTypes.flatMap(t => [
                      ...t.list.map(it => {
                        const v = getVal(it.id, m);
                        return (
                          <td key={it.id} onClick={() => openCell(it, m)}
                              style={{ textAlign: 'right', cursor: 'pointer', color: v != null ? '#222' : '#ccc' }}
                              title="클릭해서 입력">
                            {v != null ? fmt(v) : '·'}
                          </td>
                        );
                      }),
                      <td key={`${t.key}-sum`} style={{ textAlign: 'right', fontWeight: 600, color: t.color, background: t.bg }}>
                        {fmt(typeMonthTotal(t.key, m)) || '·'}
                      </td>,
                    ])}
                    <td style={{ textAlign: 'right', fontWeight: 600, background: '#fff8e1', color: net >= 0 ? '#2e7d32' : '#c62828' }}>
                      {fmt(net) || '·'}
                    </td>
                  </tr>
                );
              })}

              {/* 연간 합계 행 */}
              <tr className="summary-row" style={{ borderTop: '2px solid #999' }}>
                <td style={{ position: 'sticky', left: 0, background: '#f5f5f5', fontWeight: 700 }}>합계</td>
                {activeTypes.flatMap(t => [
                  ...t.list.map(it => (
                    <td key={it.id} style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(itemYearTotal(it.id))}</td>
                  )),
                  <td key={`${t.key}-sum`} style={{ textAlign: 'right', fontWeight: 700, color: t.color, background: t.bg }}>
                    {fmt(MONTHS.reduce((s, m) => s + typeMonthTotal(t.key, m), 0))}
                  </td>,
                ])}
                <td style={{ textAlign: 'right', fontWeight: 700, background: '#fff3c4' }}>
                  {fmt(MONTHS.reduce((s, m) => s + typeMonthTotal('INCOME', m) - typeMonthTotal('EXPENSE', m), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ValueModal
          modal={modal}
          itemName={nameById(modal.item.codeId)}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function ValueModal({ modal, itemName, onSave, onClose }) {
  const [amount, setAmount] = useState(modal.amount === '' ? '' : String(modal.amount));
  const [display, setDisplay] = useState(modal.amount !== '' && modal.amount != null ? Number(modal.amount).toLocaleString('ko-KR') : '');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const onChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmount(raw);
    setDisplay(raw ? Number(raw).toLocaleString('ko-KR') : '');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{itemName} · {modal.month}월</h3>
        <div className="form-grid">
          <div className="form-group full">
            <label>금액</label>
            <input ref={inputRef} type="text" inputMode="numeric" value={display}
                   onChange={onChange} placeholder="0"
                   onKeyDown={e => { if (e.key === 'Enter') onSave(amount); }} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave(amount)}>저장</button>
        </div>
      </div>
    </div>
  );
}
