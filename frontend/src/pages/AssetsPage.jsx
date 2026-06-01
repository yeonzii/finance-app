import { useState, useEffect, useCallback } from 'react';
import { getAssets, saveAsset } from '../api';

const fmt = (n) => n != null && n !== 0 ? Number(n).toLocaleString('ko-KR') : '-';

const FIELDS = [
  { key: 'salary', label: '급여' },
  { key: 'interest', label: '이자' },
  { key: 'totalIncome', label: '총수입' },
  { key: 'wooriBalance', label: '우리은행' },
  { key: 'shinhanBalance', label: '신한은행' },
  { key: 'samsungCard', label: '삼성카드' },
  { key: 'shinhanCard', label: '신한카드' },
  { key: 'hyundaiCard', label: '현대카드' },
  { key: 'kookminCard', label: '국민카드' },
  { key: 'bcCard', label: '비씨카드' },
  { key: 'hanaCard', label: '하나카드' },
  { key: 'totalCard', label: '카드합계' },
  { key: 'expectedBalance', label: '예상잔액' },
  { key: 'savings', label: '대신저축은행' },
  { key: 'okayBank', label: '오케이뱅크' },
  { key: 'namuCj', label: '나무(CJ)' },
  { key: 'realOhMoney', label: '실제오머니' },
  { key: 'tossBanking', label: '토스뱅킹' },
  { key: 'miraeAsset', label: '미래에셋' },
  { key: 'miraeAssetTotal', label: '미래에셋합' },
  { key: 'bankTotal', label: '은행총합' },
  { key: 'retirementIrp', label: '퇴직연금IRP' },
  { key: 'totalAssets', label: '총자산' },
];

const MONTHS = Array.from({length:12},(_,i)=>i+1);

export default function AssetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [snapshots, setSnapshots] = useState([]);
  const [editing, setEditing] = useState(null); // { month, data }

  const load = useCallback(() => {
    getAssets(year).then(data => {
      // 12개월 슬롯 채우기
      const map = {};
      data.forEach(d => { map[d.month] = d; });
      setSnapshots(MONTHS.map(m => map[m] || { year, month: m }));
    });
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (snap) => setEditing({ month: snap.month, data: { ...snap } });
  const closeEdit = () => setEditing(null);

  const handleSave = async () => {
    await saveAsset(editing.data);
    closeEdit();
    load();
  };

  const setField = (k, v) => setEditing(e => ({ ...e, data: { ...e.data, [k]: v ? +v : null } }));

  const highlight = (key, val) => {
    if (key === 'totalAssets') return { fontWeight: 700, color: '#1a237e' };
    if (key === 'expectedBalance') return { fontWeight: 700 };
    return {};
  };

  return (
    <div>
      <div className="page-header">
        <h2>자산 현황</h2>
        <div className="selector">
          <select value={year} onChange={e=>setYear(+e.target.value)}>
            {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
          </select>
          <span>년</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>항목</th>
              {MONTHS.map(m=><th key={m}>{m}월</th>)}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(({ key, label }) => (
              <tr key={key} className={['totalAssets','bankTotal','totalCard','totalIncome'].includes(key)?'summary-row':''}>
                <td style={{fontWeight:600}}>{label}</td>
                {snapshots.map(snap => (
                  <td key={snap.month} style={highlight(key, snap[key])}>
                    {fmt(snap[key])}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td style={{fontWeight:600,color:'#1a237e'}}>수정</td>
              {snapshots.map(snap => (
                <td key={snap.month}>
                  <button className="btn btn-edit" style={{fontSize:11,padding:'3px 8px'}} onClick={()=>openEdit(snap)}>
                    수정
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{year}년 {editing.month}월 자산 입력</h3>
            <div className="form-grid">
              {FIELDS.map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label>{label}</label>
                  <input
                    type="number"
                    value={editing.data[key] ?? ''}
                    onChange={e=>setField(key, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={closeEdit}>취소</button>
              <button className="btn btn-primary" onClick={handleSave}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
