import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import {
  getConsumptions, importConsumptions, updateConsumption, deleteConsumption,
  getAllCodes,
} from '../api';

const CARD_ROOT_CODES = ['CD2211', 'CD2212', 'CD2213', 'CD2214', 'CD2215', 'CD2216'];
const CONSUM_ROOT = 'CD5000';
const fmt = (n) => n != null ? Number(n).toLocaleString('ko-KR') : '-';
const now = new Date();
const WD = ['일', '월', '화', '수', '목', '금', '토'];

const CARD_COLOR = {
  CD2211: { bg: '#e3f2fd', fg: '#1565c0' }, CD2212: { bg: '#fff8e1', fg: '#f9a825' },
  CD2213: { bg: '#e8f5e9', fg: '#2e7d32' }, CD2214: { bg: '#ede7f6', fg: '#5e35b1' },
  CD2215: { bg: '#fce4ec', fg: '#c2185b' }, CD2216: { bg: '#e0f2f1', fg: '#00796b' },
};
const GROUP_COLOR = { CD5100: '#8e24aa', CD5200: '#1565c0', CD5300: '#e65100', __none__: '#bdbdbd' };

const pad = (x) => String(x).padStart(2, '0');
const dayKeyOf = (iso) => iso ? iso.slice(0, 10) : 'unknown';          // "2026-10-02"
const fmtTime = (iso) => iso ? iso.slice(11, 16) : '-';                // "09:23"
const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const dayLabel = (key) => {
  const d = new Date(key + 'T00:00:00');
  return `${d.getMonth() + 1}/${pad(d.getDate())} (${WD[d.getDay()]})`;
};

export default function ConsumptionPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [importing, setImporting] = useState(false);

  // 일자별 폴딩 상태
  const [openDays, setOpenDays] = useState(() => new Set());   // 펼쳐진 날짜
  const [userDays, setUserDays] = useState(() => new Set());   // 사용자가 직접 연 날짜(→전체 표시)
  const initedRef = useRef(null);

  const load = () => { setLoaded(false); return getConsumptions(year, month).then(d => { setRows(d); setLoaded(true); }); };
  useEffect(() => { load(); }, [year, month]);
  useEffect(() => { getAllCodes().then(setCodes); }, []);

  const nameOf = (code) => codes.find(c => c.cdId === code)?.cdNm ?? code ?? '-';
  const cardOptions = CARD_ROOT_CODES.map(cd => ({ cd, nm: nameOf(cd) }));

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

  // 일자별 그룹 (최신일 먼저)
  const days = useMemo(() => {
    const map = {};
    rows.forEach(r => { const k = dayKeyOf(r.usedAt); (map[k] = map[k] || []).push(r); });
    return Object.keys(map).sort().reverse().map(k => {
      const rs = map[k].slice().sort((a, b) => (a.usedAt || '').localeCompare(b.usedAt || ''));
      return {
        key: k, rows: rs, total: rs.reduce((s, x) => s + (x.amount || 0), 0),
        unclassified: rs.filter(x => !x.categoryCode), isToday: k === todayKey,
      };
    });
  }, [rows]);

  // 월 진입 시 1회 초기 폴딩: 오늘 + 미분류 있는 날 펼침
  const initKey = `${year}-${month}`;
  useEffect(() => {
    if (!loaded || initedRef.current === initKey) return;
    const init = new Set();
    days.forEach(d => { if (d.isToday || d.unclassified.length > 0) init.add(d.key); });
    setOpenDays(init);
    setUserDays(new Set());
    initedRef.current = initKey;
  }, [loaded, days, initKey]);

  const toggleDay = (key) => {
    setUserDays(prev => new Set(prev).add(key));
    setOpenDays(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const showAllOfDay = (key) => setUserDays(prev => new Set(prev).add(key));

  // 카테고리별(말단) 합계
  const byCategory = useMemo(() => {
    const sum = {};
    rows.forEach(r => { const leaf = r.categoryCode || '__none__'; sum[leaf] = (sum[leaf] || 0) + (r.amount || 0); });
    const out = [];
    catGroups.forEach(g => g.leaves.forEach(l => {
      if (sum[l.cdId]) out.push({ group: g.mid.cdId, mid: g.mid.cdNm, leaf: l.cdNm, amount: sum[l.cdId] });
    }));
    if (sum['__none__']) out.push({ group: '__none__', mid: '미분류', leaf: '-', amount: sum['__none__'] });
    return out.sort((a, b) => b.amount - a.amount);
  }, [rows, catGroups]);

  const onImport = async () => {
    setImporting(true);
    try { const r = await importConsumptions(); await load(); alert(`불러오기 완료: ${r.count}건 적재`); }
    catch (e) { alert('불러오기 실패: ' + (e?.message || e)); }
    finally { setImporting(false); }
  };
  const patch = async (row, field, value) => { await updateConsumption(row.id, { ...row, [field]: value }); load(); };
  const onDelete = async (id) => { if (!confirm('이 소비내역을 삭제할까요?')) return; await deleteConsumption(id); load(); };

  const renderRow = (r) => {
    const cc = CARD_COLOR[r.cardCode] || { bg: '#eee', fg: '#555' };
    return (
      <tr key={r.id}>
        <td className="col-c" style={{ color: '#666' }}>{fmtTime(r.usedAt)}</td>
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
                  style={{ width: '100%' }} onChange={e => patch(r, 'categoryCode', e.target.value || null)}>
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
        💡 일자를 눌러 접고 펼칠 수 있어요. <b>오늘</b>과 <b>미분류가 있는 날</b>은 자동으로 펼쳐집니다.
      </div>

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
        {/* 건별 내역 (일자별 폴딩) */}
        <section>
          <div className="section-title">건별 내역</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>시각</th>
                  <th style={{ width: 110 }}>카드</th>
                  <th>가맹점</th>
                  <th style={{ width: 110 }}>금액</th>
                  <th style={{ width: 170 }}>소비 카테고리</th>
                  <th>원문</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {days.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">소비내역이 없어요. <b>문자 불러오기</b>를 눌러보세요.</td></tr>
                )}
                {days.map(d => {
                  const isOpen = openDays.has(d.key);
                  const showAll = d.isToday || userDays.has(d.key);
                  const visible = !isOpen ? [] : (showAll ? d.rows : d.unclassified);
                  const hiddenClassified = d.rows.length - d.unclassified.length;
                  return (
                    <Fragment key={d.key}>
                      <tr className="day-header" onClick={() => toggleDay(d.key)}>
                        <td colSpan={7}>
                          <div className="day-row">
                            <span className="chev">{isOpen ? '▾' : '▸'}</span>
                            <b>{dayLabel(d.key)}</b>
                            {d.isToday && <span className="day-badge" style={{ background: '#e8eaf6', color: '#3949ab' }}>오늘</span>}
                            <span style={{ color: '#888', fontWeight: 400 }}>· {d.rows.length}건</span>
                            {d.unclassified.length > 0 && <span className="day-badge">미분류 {d.unclassified.length}</span>}
                            <span className="spacer" />
                            <span className="day-total">일계 {fmt(d.total)}원</span>
                          </div>
                        </td>
                      </tr>
                      {visible.map(renderRow)}
                      {isOpen && !showAll && hiddenClassified > 0 && (
                        <tr>
                          <td colSpan={7} className="col-c" style={{ background: '#fafbff' }}>
                            <button className="linklike" onClick={() => showAllOfDay(d.key)}>
                              + 분류완료 {hiddenClassified}건 더보기
                            </button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
                  <tr><th style={{ width: 120 }}>분류</th><th style={{ width: 140 }}>항목</th><th style={{ width: 130 }}>금액</th><th>비중</th></tr>
                </thead>
                <tbody>
                  {byCategory.map((c, i) => {
                    const pct = total ? Math.round(c.amount / total * 100) : 0;
                    const color = GROUP_COLOR[c.group] || '#90a4ae';
                    return (
                      <tr key={i}>
                        <td className="col-c"><span className="card-chip" style={{ background: color + '22', color }}>{c.mid}</span></td>
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
