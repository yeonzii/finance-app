import { useState, useEffect, useMemo } from 'react';
import {
  getConsumptions, importConsumptions, updateConsumption, deleteConsumption,
  getAllCodes,
} from '../api';

const CARD_ROOT_CODES = ['CD2211', 'CD2212', 'CD2213', 'CD2214', 'CD2215', 'CD2216'];
const CONSUM_ROOT = 'CD5000';
const fmt = (n) => n != null ? Number(n).toLocaleString('ko-KR') : '-';
const now = new Date();

// ISO(2026-10-01T12:34:00) → "10/01 12:34"
const fmtDt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function ConsumptionPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [codes, setCodes] = useState([]);
  const [importing, setImporting] = useState(false);

  const load = () => getConsumptions(year, month).then(setRows);
  useEffect(() => { load(); }, [year, month]);
  useEffect(() => { getAllCodes().then(setCodes); }, []);

  // 카드 코드 → 이름
  const cardName = (code) => codes.find(c => c.cdId === code)?.cdNm ?? code ?? '-';
  const cardOptions = CARD_ROOT_CODES
    .map(cd => ({ cd, nm: codes.find(c => c.cdId === cd)?.cdNm ?? cd }));

  // 소비 카테고리 트리: 중분류(고양이/생활비/선택지출) → 말단(식비 등)
  const catGroups = useMemo(() => {
    const mids = codes.filter(c => c.parentCdId === CONSUM_ROOT && c.delYn === 'N')
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return mids.map(m => ({
      mid: m,
      leaves: codes.filter(c => c.parentCdId === m.cdId && c.delYn === 'N')
                   .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }));
  }, [codes]);
  const catName = (code) => code ? (codes.find(c => c.cdId === code)?.cdNm ?? code) : null;

  // 합계
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const unclassified = rows.filter(r => !r.categoryCode).length;

  // 카테고리별(중분류 단위) 합계
  const byCategory = useMemo(() => {
    const parentOf = (leaf) => codes.find(c => c.cdId === leaf)?.parentCdId;
    const map = {};
    rows.forEach(r => {
      const mid = r.categoryCode ? parentOf(r.categoryCode) : '__none__';
      const leaf = r.categoryCode || '__none__';
      const key = `${mid}|${leaf}`;
      map[key] = (map[key] || 0) + (r.amount || 0);
    });
    // 중분류 > 말단 정렬된 목록
    const out = [];
    catGroups.forEach(g => {
      g.leaves.forEach(l => {
        const v = map[`${g.mid.cdId}|${l.cdId}`];
        if (v) out.push({ mid: g.mid.cdNm, leaf: l.cdNm, amount: v });
      });
    });
    const none = map[`__none__|__none__`];
    if (none) out.push({ mid: '미분류', leaf: '-', amount: none });
    return out;
  }, [rows, codes, catGroups]);

  const onImport = async () => {
    setImporting(true);
    try {
      const r = await importConsumptions();
      alert(`불러오기 완료: ${r.count}건 적재`);
      load();
    } catch (e) {
      alert('불러오기 실패: ' + (e?.message || e));
    } finally { setImporting(false); }
  };

  const patch = async (row, field, value) => {
    await updateConsumption(row.id, { ...row, [field]: value });
    load();
  };

  const onDelete = async (id) => {
    if (!confirm('이 소비내역을 삭제할까요?')) return;
    await deleteConsumption(id);
    load();
  };

  const years = [2025, 2026, 2027];

  return (
    <div>
      <div className="page-header">
        <h2>카드 소비내역</h2>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ marginRight: 4 }}>
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={e => setMonth(+e.target.value)} style={{ marginRight: 8 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
        <button className="btn btn-primary" onClick={onImport} disabled={importing}>
          {importing ? '불러오는 중…' : '📥 문자 불러오기'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        💡 아이폰 단축어가 iCloud에 쌓은 카드 문자/알림을 불러와 건별로 저장해요. 각 건의 <b>소비 카테고리</b>를 지정하면 월별 소비 패턴을 볼 수 있어요.
      </div>

      {/* 요약 */}
      <div className="asset-cards" style={{ marginBottom: 16 }}>
        <div className="asset-card">
          <div className="card-label">이번 달 총 소비</div>
          <div className="card-value amount-negative">{fmt(total)}원</div>
        </div>
        <div className="asset-card">
          <div className="card-label">건수</div>
          <div className="card-value">{rows.length}건</div>
        </div>
        <div className="asset-card">
          <div className="card-label">미분류</div>
          <div className="card-value" style={{ color: unclassified ? '#e65100' : '#2e7d32' }}>{unclassified}건</div>
        </div>
      </div>

      {/* 건별 내역 */}
      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>일시</th><th>카드</th><th>가맹점</th><th>금액</th>
              <th style={{ minWidth: 160 }}>소비 카테고리</th><th>원문</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="empty-state">소비내역이 없어요. <b>문자 불러오기</b>를 눌러보세요.</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} style={!r.categoryCode ? { background: '#fff8f0' } : undefined}>
                <td className="col-c" style={{ whiteSpace: 'nowrap' }}>{fmtDt(r.usedAt)}</td>
                <td className="col-c">
                  <select value={r.cardCode || ''} onChange={e => patch(r, 'cardCode', e.target.value)}>
                    {cardOptions.map(o => <option key={o.cd} value={o.cd}>{o.nm}</option>)}
                  </select>
                </td>
                <td>{r.merchant}</td>
                <td className="col-r" style={{ fontWeight: 600 }}>{fmt(r.amount)}</td>
                <td>
                  <select value={r.categoryCode || ''} onChange={e => patch(r, 'categoryCode', e.target.value || null)}
                          style={{ width: '100%', color: r.categoryCode ? '#1a237e' : '#aaa' }}>
                    <option value="">— 미분류 —</option>
                    {catGroups.map(g => (
                      <optgroup key={g.mid.cdId} label={g.mid.cdNm}>
                        {g.leaves.map(l => <option key={l.cdId} value={l.cdId}>{l.cdNm}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </td>
                <td style={{ fontSize: 11, color: '#aaa', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={r.rawText}>{(r.rawText || '').replace(/\n/g, ' ')}</td>
                <td><button className="btn btn-danger" onClick={() => onDelete(r.id)}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 카테고리별 월 합계 */}
      {byCategory.length > 0 && (
        <>
          <div className="section-title">이번 달 카테고리별 소비</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>분류</th><th>항목</th><th>금액</th><th>비중</th></tr></thead>
              <tbody>
                {byCategory.map((c, i) => (
                  <tr key={i}>
                    <td className="col-c" style={{ fontWeight: 600 }}>{c.mid}</td>
                    <td className="col-c">{c.leaf}</td>
                    <td className="col-r" style={{ fontWeight: 600 }}>{fmt(c.amount)}</td>
                    <td className="col-c" style={{ color: '#888' }}>{total ? Math.round(c.amount / total * 100) : 0}%</td>
                  </tr>
                ))}
                <tr className="summary-row">
                  <td className="col-c" colSpan={2}>합계</td>
                  <td className="col-r" style={{ fontWeight: 700 }}>{fmt(total)}</td>
                  <td className="col-c">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
