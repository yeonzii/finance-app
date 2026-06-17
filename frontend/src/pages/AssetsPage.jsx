import { useState, useEffect, useCallback } from 'react';
import { getAssetItems, getAssetValues, saveAssetValue, getAllCodes, getTransactions } from '../api';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const fmt = (n) => n != null && n !== '' ? Number(n).toLocaleString('ko-KR') : '';

const TYPES = [
  { key: 'INCOME',  label: '소득', color: '#2e7d32', bg: '#e8f5e9' },
  { key: 'EXPENSE', label: '지출', color: '#c62828', bg: '#ffebee' },
  { key: 'ASSET',   label: '자산', color: '#283593', bg: '#e8eaf6' },
];

// 인라인 금액 입력 셀 (콤마 표시, blur/Enter 시 저장) — 자산(ASSET) 행 전용
function CellInput({ value, onCommit }) {
  const [display, setDisplay] = useState(value != null ? Number(value).toLocaleString('ko-KR') : '');
  useEffect(() => {
    setDisplay(value != null ? Number(value).toLocaleString('ko-KR') : '');
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setDisplay(raw ? Number(raw).toLocaleString('ko-KR') : '');
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      style={{
        width: '100%', border: '1px solid transparent', background: 'transparent',
        textAlign: 'right', padding: '4px 6px', borderRadius: 4, font: 'inherit',
      }}
      onFocus={e => { e.target.style.border = '1px solid #3949ab'; e.target.style.background = '#fff'; e.target.select(); }}
      onBlur={e => {
        e.target.style.border = '1px solid transparent';
        e.target.style.background = 'transparent';
        const raw = display.replace(/[^0-9]/g, '');
        onCommit(raw === '' ? null : +raw);
      }}
    />
  );
}

export default function AssetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState([]);
  const [codes, setCodes] = useState([]);
  const [values, setValues] = useState([]); // ASSET 행 수동 입력값
  const [txs, setTxs] = useState([]);        // 거래내역 (소득/지출 자동계산용)

  useEffect(() => {
    getAssetItems().then(setItems);
    getAllCodes().then(all => setCodes(all.filter(c => c.delYn === 'N')));
  }, []);

  const loadValues = useCallback(() => getAssetValues(year).then(setValues), [year]);
  useEffect(() => { loadValues(); }, [loadValues]);

  // 소득=같은 년월 / 지출=다음 달 → 올해 전체 + 내년 1월 거래까지 필요
  useEffect(() => {
    Promise.all([getTransactions(year), getTransactions(year + 1, 1)])
      .then(([a, b]) => setTxs([...(a || []), ...(b || [])]))
      .catch(() => setTxs([]));
  }, [year]);

  const nameById = (cdId) => codes.find(c => c.cdId === cdId)?.cdNm ?? cdId ?? '-';

  // txCode가 ancCode(구성항목 코드)와 같거나 그 하위인지
  const inSubtree = (txCode, ancCode) => {
    let c = txCode;
    for (let i = 0; i < 8 && c; i++) {
      if (c === ancCode) return true;
      c = codes.find(x => x.cdId === c)?.parentCdId;
    }
    return false;
  };

  // 거래 합계: 특정 항목코드 × (년,월)
  const txSum = (codeId, ty, tm) =>
    txs.filter(t => t.year === ty && t.month === tm && inSubtree(t.subcategoryCode, codeId))
       .reduce((s, t) => s + (t.amount || 0), 0);

  // ASSET 수동값 맵
  const valueMap = {};
  values.forEach(v => { valueMap[`${v.assetItemId}-${v.month}`] = v.amount; });

  // 항목×월 값: 소득/지출은 거래에서 자동계산, 자산은 수동값
  const getVal = (item, month) => {
    if (item.assetType === 'INCOME') {
      return txSum(item.codeId, year, month); // 같은 년월
    }
    if (item.assetType === 'EXPENSE') {
      const m = month + 1;                     // 다음 달 지출
      const ty = m > 12 ? year + 1 : year;
      const tm = m > 12 ? 1 : m;
      return txSum(item.codeId, ty, tm);
    }
    return valueMap[`${item.id}-${month}`];    // ASSET: 수동
  };

  const itemsOf = (typeKey) =>
    items.filter(i => i.assetType === typeKey)
         .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
  const typeMonthTotal = (typeKey, month) =>
    itemsOf(typeKey).reduce((s, i) => s + (getVal(i, month) || 0), 0);
  const itemYearTotal = (item) =>
    MONTHS.reduce((s, m) => s + (getVal(item, m) || 0), 0);

  const commitValue = async (item, month, amount) => {
    const cur = getVal(item, month) ?? null;
    if (cur === amount) return;
    await saveAssetValue({ assetItemId: item.id, year, month, amount });
    loadValues();
  };

  const activeTypes = TYPES
    .map(t => ({ ...t, list: itemsOf(t.key) }))
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
        💡 <b>소득·지출</b> 행은 소득/지출 내역에서 자동 계산돼요 (소득=같은 달, 지출=다음 달 항목). <b>자산</b> 행만 셀에 직접 입력합니다.
      </div>

      {!hasItems ? (
        <div className="table-wrap"><div className="empty-state" style={{ padding: 40 }}>
          구성된 자산 항목이 없어요. <b>자산 항목 구성</b> 탭에서 먼저 항목을 추가하세요.
        </div></div>
      ) : (
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: 'max-content', minWidth: '100%' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ position: 'sticky', left: 0, background: '#e8eaf6', width: 56, minWidth: 56, textAlign: 'center' }}>월</th>
                {activeTypes.map(t => (
                  <th key={t.key} colSpan={t.list.length + 1}
                      style={{ textAlign: 'center', color: t.color, background: t.bg }}>
                    {t.label}{t.key !== 'ASSET' && <span style={{ fontWeight: 400, fontSize: 11 }}> (자동)</span>}
                  </th>
                ))}
                <th rowSpan={2} style={{ textAlign: 'center', width: 96, minWidth: 96, background: '#fff8e1' }}>수지<br/>(소득-지출)</th>
              </tr>
              <tr>
                {activeTypes.flatMap(t => [
                  ...t.list.map(it => (
                    <th key={it.id} style={{ textAlign: 'center', width: 96, minWidth: 96 }}>{nameById(it.codeId)}</th>
                  )),
                  <th key={`${t.key}-sum`} style={{ textAlign: 'center', width: 96, minWidth: 96, color: t.color, background: t.bg }}>{t.label}합계</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {MONTHS.map(m => {
                const net = typeMonthTotal('INCOME', m) - typeMonthTotal('EXPENSE', m);
                return (
                  <tr key={m}>
                    <td style={{ position: 'sticky', left: 0, background: '#fff', fontWeight: 600, textAlign: 'center' }}>{m}월</td>
                    {activeTypes.flatMap(t => [
                      ...t.list.map(it => (
                        <td key={it.id} style={{ padding: t.key === 'ASSET' ? 2 : '8px 6px', textAlign: 'right', background: t.key === 'ASSET' ? undefined : '#fcfcfc' }}>
                          {t.key === 'ASSET'
                            ? <CellInput value={getVal(it, m)} onCommit={(amt) => commitValue(it, m, amt)} />
                            : <span style={{ color: getVal(it, m) ? '#333' : '#ccc' }}>{getVal(it, m) ? fmt(getVal(it, m)) : '·'}</span>}
                        </td>
                      )),
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
                <td style={{ position: 'sticky', left: 0, background: '#f5f5f5', fontWeight: 700, textAlign: 'center' }}>합계</td>
                {activeTypes.flatMap(t => [
                  ...t.list.map(it => (
                    <td key={it.id} style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(itemYearTotal(it))}</td>
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
    </div>
  );
}
