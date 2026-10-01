import { useState, useEffect, useMemo } from 'react';
import {
  getConsumptions, importConsumptions, updateConsumption, deleteConsumption,
  getAllCodes,
} from '../api';

const CARD_ROOT_CODES = ['CD2211', 'CD2212', 'CD2213', 'CD2214', 'CD2215', 'CD2216'];
const CONSUM_ROOT = 'CD5000';
const fmt = (n) => n != null ? Number(n).toLocaleString('ko-KR') : '-';
const now = new Date();

// 카드사별 색상 (칩)
const CARD_COLOR = {
  CD2211: { bg: '#e3f2fd', fg: '#1565c0' }, // 삼성
  CD2212: { bg: '#fff8e1', fg: '#f9a825' }, // 국민
  CD2213: { bg: '#e8f5e9', fg: '#2e7d32' }, // 신한
  CD2214: { bg: '#ede7f6', fg: '#5e35b1' }, // 현대
  CD2215: { bg: '#fce4ec', fg: '#c2185b' }, // 비씨
  CD2216: { bg: '#e0f2f1', fg: '#00796b' }, // 하나
};
// 소비 대분류(중분류 코드)별 색상
const GROUP_COLOR = {
  CD5100: '#8e24aa', // 고양이
  CD5200: '#1565c0', // 생활비
  CD5300: '#e65100', // 선택지출
  __none__: '#bdbdbd',
};

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

  const nameOf = (code) => codes.find(c => c.cdId === code)?.cdNm ?? code ?? '-';
  const parentOf = (code) => codes.find(c => c.cdId === code)?.parentCdId;
  const cardOptions = CARD_ROOT_CODES.map(cd => ({ cd, nm: nameOf(cd) }));

  // 소비 카테고리 트리: 중분류 → 말단
  const catGroups = useMemo(() => {
    const mids = codes.filter(c => c.parentCdId === CONSUM_ROOT && c.delYn === 'N')
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return mids.map(m => ({
      mid: m,
      leaves: codes.filter(c => c.parentCdId === m.cdId && c.delYn === 'N')
                   .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }));
  }, [codes]);

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const unclassified = rows.filter(r => !r.categoryCode).length;

  // 카테고리별(말단) 합계 — 중분류 순서대로
  const byCategory = useMemo(() => {
    const sum = {};
    rows.forEach(r => {
      const leaf = r.categoryCode || '__none__';
      sum[leaf] = (sum[leaf] || 0) + (r.amount || 0);
    });
    const out = [];
    catGroups.forEach(g => g.leaves.forEach(l => {
      if (sum[l.cdId]) out.push({ group: g.mid.cdId, mid: g.mid.cdNm, leaf: l.cdNm, amount: sum[l.cdId] });
    }));
    if (sum['__none__']) out.push({ group: '__none__', mid: '미분류', leaf: '-', amount: sum['__none__'] });
    return out.sort((a, b) => b.amount - a.amount);
  }, [rows, catGroups]);

  const onImport = async () => {
    setImporting(true);
    try {
      const r = await importConsumptions();
      load();
      alert(`불러오기 완료: ${r.count}건 적재`);
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

  return (
    <div>
      <div className="page-header">
        <h2>카드 소비내역</h2>
        <div className="selector">
          <select value={year} onChange={e => setYear(+e.target.value)}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span>년</span>
          <select value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <span>월</span>
        </div>
        <button className="btn btn-primary" onClick={onImport} disabled={importing}>
          {importing ? '불러오는 중…' : '📥 문자 불러오기'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        💡 아이폰 단축어가 iCloud에 쌓은 카드 문자/알림을 불러와 건별로 저장해요. 각 건의 <b>소비 카테고리</b>를 지정하면 월별 소비 패턴을 볼 수 있어요.
      </div>

      {/* 요약 카드 */}
      <div className="asset-cards" style={{ marginBottom: 20 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* 건별 내역 */}
        <section>
          <div className="section-title">건별 내역</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>일시</th>
                  <th style={{ width: 110 }}>카드</th>
                  <th>가맹점</th>
                  <th style={{ width: 110 }}>금액</th>
                  <th style={{ width: 170 }}>소비 카테고리</th>
                  <th>원문</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">소비내역이 없어요. <b>문자 불러오기</b>를 눌러보세요.</td></tr>
                )}
                {rows.map(r => {
                  const cc = CARD_COLOR[r.cardCode] || { bg: '#eee', fg: '#555' };
                  return (
                    <tr key={r.id}>
                      <td className="col-c" style={{ color: '#666' }}>{fmtDt(r.usedAt)}</td>
                      <td className="col-c">
                        <select className="cell-select" value={r.cardCode || ''}
                                style={{ background: cc.bg, color: cc.fg, fontWeight: 700, border: 'none' }}
                                onChange={e => patch(r, 'cardCode', e.target.value)}>
                          {cardOptions.map(o => <option key={o.cd} value={o.cd} style={{ color: '#333', background: '#fff' }}>{o.nm}</option>)}
                        </select>
                      </td>
                      <td className="merchant-cell">{r.merchant || '-'}</td>
                      <td className="col-r" style={{ fontWeight: 700 }}>{fmt(r.amount)}</td>
                      <td className="col-c">
                        <select className={`cell-select ${r.categoryCode ? '' : 'unset'}`} value={r.categoryCode || ''}
                                style={{ width: '100%' }}
                                onChange={e => patch(r, 'categoryCode', e.target.value || null)}>
                          <option value="">＋ 분류 선택</option>
                          {catGroups.map(g => (
                            <optgroup key={g.mid.cdId} label={g.mid.cdNm}>
                              {g.leaves.map(l => <option key={l.cdId} value={l.cdId}>{l.cdNm}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td><div className="raw-text" title={r.rawText}>{(r.rawText || '').replace(/\n/g, ' ')}</div></td>
                      <td className="col-c"><button className="btn btn-danger" onClick={() => onDelete(r.id)}>삭제</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 카테고리별 월 합계 */}
        {byCategory.length > 0 && (
          <section>
            <div className="section-title">이번 달 카테고리별 소비</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>분류</th>
                    <th style={{ width: 140 }}>항목</th>
                    <th style={{ width: 130 }}>금액</th>
                    <th>비중</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((c, i) => {
                    const pct = total ? Math.round(c.amount / total * 100) : 0;
                    const color = GROUP_COLOR[c.group] || '#90a4ae';
                    return (
                      <tr key={i}>
                        <td className="col-c">
                          <span className="card-chip" style={{ background: color + '22', color }}>{c.mid}</span>
                        </td>
                        <td className="col-c" style={{ color: '#444' }}>{c.leaf}</td>
                        <td className="col-r" style={{ fontWeight: 700 }}>{fmt(c.amount)}</td>
                        <td>
                          <span className="bar-track"><span className="bar-fill" style={{ width: pct + '%', background: color }} /></span>
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="summary-row">
                    <td className="col-c" colSpan={2}>합계</td>
                    <td className="col-r">{fmt(total)}</td>
                    <td>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
