import { useState, useEffect } from 'react';
import { getPaymentInstitutions, savePaymentInstitution, getAllCodes } from '../api';

const CARD_ROOT = 'CD3100'; // 기관분류 > 카드사

export default function PaymentInstitutionsPage() {
  const [cards, setCards] = useState([]);   // 카드사 코드 목록
  const [payMap, setPayMap] = useState({}); // codeId → paymentDay

  const loadPay = () => getPaymentInstitutions().then(list => {
    const m = {};
    list.forEach(p => { m[p.codeId] = p.paymentDay; });
    setPayMap(m);
  });

  useEffect(() => {
    getAllCodes().then(all => {
      const active = all.filter(c => c.delYn === 'N');
      setCards(active.filter(c => c.parentCdId === CARD_ROOT)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    });
    loadPay();
  }, []);

  const commit = async (codeId, day) => {
    const cur = payMap[codeId] ?? null;
    const val = day === '' ? null : +day;
    if (cur === val) return;
    await savePaymentInstitution({ codeId, paymentDay: val });
    loadPay();
  };

  return (
    <div>
      <div className="page-header">
        <h2>결제기관 관리</h2>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        💡 카드사별 <b>결제일</b>을 등록하세요. 소득/지출·고정비 입력 시 해당 카드사를 선택하면 결제일자가 자동으로 채워집니다.
      </div>

      <div className="table-wrap" style={{ maxWidth: 480 }}>
        <table>
          <thead>
            <tr>
              <th>카드사</th>
              <th style={{ textAlign: 'center' }}>결제일</th>
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 && (
              <tr><td colSpan={2} className="empty-state">카드사 코드가 없어요. 공통코드 관리에서 먼저 등록하세요.</td></tr>
            )}
            {cards.map(c => (
              <tr key={c.cdId}>
                <td style={{ fontWeight: 600 }}>{c.cdNm}</td>
                <td style={{ textAlign: 'center' }}>
                  <DayInput value={payMap[c.cdId]} onCommit={(d) => commit(c.cdId, d)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DayInput({ value, onCommit }) {
  const [v, setV] = useState(value != null ? String(value) : '');
  useEffect(() => { setV(value != null ? String(value) : ''); }, [value]);
  return (
    <span>
      <input
        type="number" min={1} max={31}
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => onCommit(v)}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        placeholder="-"
        style={{ width: 70, textAlign: 'center', padding: '4px 6px' }}
      />
      <span style={{ marginLeft: 4, color: '#888' }}>일</span>
    </span>
  );
}
