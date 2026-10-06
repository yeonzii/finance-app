import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import {
  getConsumptions, importConsumptions, updateConsumption, deleteConsumption,
  createConsumption, getAllCodes,
} from '../api';

const CARD_ROOT_CODES = ['CD2211', 'CD2212', 'CD2213', 'CD2214', 'CD2215', 'CD2216'];
const CASH_CODE = 'CD3170'; // 현금
const CARD_SELECT_CODES = [...CARD_ROOT_CODES, CASH_CODE]; // 수단 선택 옵션(카드+현금)
const CONSUM_ROOT = 'CD5000';
const fmt = (n) => n != null ? Number(n).toLocaleString('ko-KR') : '-';
const now = new Date();
const WD = ['일', '월', '화', '수', '목', '금', '토'];

const CARD_COLOR = {
  CD2211: { bg: '#e3f2fd', fg: '#1565c0' }, CD2212: { bg: '#fff8e1', fg: '#f9a825' },
  CD2213: { bg: '#e8f5e9', fg: '#2e7d32' }, CD2214: { bg: '#ede7f6', fg: '#5e35b1' },
  CD2215: { bg: '#fce4ec', fg: '#c2185b' }, CD2216: { bg: '#e0f2f1', fg: '#00796b' },
  CD3170: { bg: '#eceff1', fg: '#546e7a' }, // 현금
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
  const [importing, setImporting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // 일자별 폴딩: 사용자가 직접 연/닫은 날짜만 기록, 나머지는 동적 기본값(오늘·미분류 펼침)
  const [userOpened, setUserOpened] = useState(() => new Set());
  const [userClosed, setUserClosed] = useState(() => new Set());

  const load = () => getConsumptions(year, month).then(setRows);
  useEffect(() => { load(); }, [year, month]);
  useEffect(() => { getAllCodes().then(setCodes); }, []);
  // 월 바뀌면 사용자 폴딩 선택 초기화
  useEffect(() => { setUserOpened(new Set()); setUserClosed(new Set()); }, [year, month]);

  const nameOf = (code) => codes.find(c => c.cdId === code)?.cdNm ?? code ?? '-';
  const cardOptions = CARD_SELECT_CODES.map(cd => ({ cd, nm: nameOf(cd) }));

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

  // 펼침 여부: 사용자가 직접 연/닫은 게 우선, 없으면 오늘·미분류는 기본 펼침
  const isDayOpen = (d) =>
    userOpened.has(d.key) ? true
    : userClosed.has(d.key) ? false
    : (d.isToday || d.unclassified.length > 0);
  const toggleDay = (d) => {
    if (isDayOpen(d)) {
      setUserClosed(p => new Set(p).add(d.key));
      setUserOpened(p => { const n = new Set(p); n.delete(d.key); return n; });
    } else {
      setUserOpened(p => new Set(p).add(d.key));
      setUserClosed(p => { const n = new Set(p); n.delete(d.key); return n; });
    }
  };
  const showAllOfDay = (key) => {
    setUserOpened(p => new Set(p).add(key));
    setUserClosed(p => { const n = new Set(p); n.delete(key); return n; });
  };

  // 분류(중분류)로 묶은 카테고리별 합계 — 분류 소계 + 분류 내 항목 나열
  const byGroup = useMemo(() => {
    const sum = {};
    rows.forEach(r => { const k = r.categoryCode || '__none__'; sum[k] = (sum[k] || 0) + (r.amount || 0); });
    const groups = [];
    catGroups.forEach(g => {
      const items = g.leaves.filter(l => sum[l.cdId])
        .map(l => ({ name: l.cdNm, amount: sum[l.cdId] }))
        .sort((a, b) => b.amount - a.amount);
      if (items.length) groups.push({ code: g.mid.cdId, name: g.mid.cdNm, items, total: items.reduce((s, i) => s + i.amount, 0) });
    });
    if (sum['__none__']) groups.push({ code: '__none__', name: '미분류', items: [], total: sum['__none__'] });
    // 고정 순서: 생활비 → 선택지출 → 고양이 → (기타) → 미분류
    const ORDER = ['CD5200', 'CD5300', 'CD5100'];
    const rank = (code) => code === '__none__' ? 999 : (ORDER.indexOf(code) === -1 ? 500 : ORDER.indexOf(code));
    return groups.sort((a, b) => rank(a.code) - rank(b.code));
  }, [rows, catGroups]);

  // 카드사(수단)별 총 결제금액
  const byCard = useMemo(() => {
    const sum = {};
    rows.forEach(r => { const k = r.cardCode || '기타'; sum[k] = (sum[k] || 0) + (r.amount || 0); });
    return Object.entries(sum).map(([code, amount]) => ({ code, amount, name: nameOf(code) }))
                 .sort((a, b) => b.amount - a.amount);
  }, [rows, codes]);

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
        <button className="btn" style={{ background: '#546e7a', color: '#fff' }} onClick={() => setManualOpen(true)}>
          ✍️ 직접 추가
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        💡 일자를 눌러 접고 펼칠 수 있어요. <b>오늘</b>과 <b>미분류가 있는 날</b>은 자동으로 펼쳐집니다.
      </div>

      <div className="asset-cards" style={{ marginBottom: 20 }}>
        <div className="asset-card">
          <div className="card-label">이번 달 총 소비</div>
          <div className="card-value amount-negative">{fmt(total)}원</div>
          {byCard.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', marginTop: 8 }}>
              {byCard.map(c => {
                const cc = CARD_COLOR[c.code] || { fg: '#666' };
                return (
                  <span key={c.code} style={{ fontSize: 11, color: '#777' }}>
                    <span style={{ color: cc.fg, fontWeight: 700 }}>{c.name}</span> {fmt(c.amount)}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="asset-card">
          <div className="card-label">건수 (총 / 미분류)</div>
          <div className="card-value">
            {rows.length}
            <span style={{ color: '#bbb', fontWeight: 400 }}> / </span>
            <span style={{ color: unclassified ? '#e65100' : '#2e7d32' }}>{unclassified}</span>
            <span style={{ fontSize: 14, color: '#888', fontWeight: 400 }}> 건</span>
          </div>
        </div>
      </div>

      <div className="consum-cols">
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
                  const isOpen = isDayOpen(d);
                  const showAll = d.isToday || userOpened.has(d.key);
                  const visible = !isOpen ? [] : (showAll ? d.rows : d.unclassified);
                  const hiddenClassified = d.rows.length - d.unclassified.length;
                  return (
                    <Fragment key={d.key}>
                      <tr className="day-header" onClick={() => toggleDay(d)}>
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

        {/* 분류별 월 합계 */}
        {byGroup.length > 0 && (
          <section>
            <div className="section-title">이번 달 카테고리별 소비</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>분류 / 항목</th><th style={{ width: 110 }}>금액</th><th style={{ width: 130 }}>비중</th></tr>
                </thead>
                <tbody>
                  {byGroup.map(g => {
                    const gpct = total ? Math.round(g.total / total * 100) : 0;
                    const color = GROUP_COLOR[g.code] || '#90a4ae';
                    return (
                      <Fragment key={g.code}>
                        <tr className="cat-group">
                          <td><span className="card-chip" style={{ background: color + '22', color }}>{g.name}</span></td>
                          <td className="col-r">{fmt(g.total)}</td>
                          <td>
                            <span className="bar-track" style={{ width: 70 }}><span className="bar-fill" style={{ width: gpct + '%', background: color }} /></span>
                            <span style={{ marginLeft: 6, fontSize: 12, color: '#555', fontWeight: 700 }}>{gpct}%</span>
                          </td>
                        </tr>
                        {g.items.map((it, i) => (
                          <tr className="cat-leaf" key={i}>
                            <td className="leaf-name">{it.name}</td>
                            <td className="col-r" style={{ color: '#444' }}>{fmt(it.amount)}</td>
                            <td style={{ fontSize: 12, color: '#999' }}>{total ? Math.round(it.amount / total * 100) : 0}%</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                  <tr className="summary-row">
                    <td>합계</td>
                    <td className="col-r">{fmt(total)}</td>
                    <td>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {manualOpen && (
        <ManualAddModal
          cardOptions={cardOptions}
          catGroups={catGroups}
          defaultYear={year}
          defaultMonth={month}
          onClose={() => setManualOpen(false)}
          onSave={async (data) => {
            await createConsumption(data);
            setManualOpen(false);
            // 추가한 달로 이동 후 로드
            if (data._year !== year || data._month !== month) {
              setYear(data._year); setMonth(data._month);
            } else {
              load();
            }
          }}
        />
      )}
    </div>
  );
}

// 수기 추가 모달 (현금 등)
function ManualAddModal({ cardOptions, catGroups, defaultYear, defaultMonth, onClose, onSave }) {
  const n = new Date();
  const two = (x) => String(x).padStart(2, '0');
  // 보는 달의 1일(또는 현재월이면 오늘)을 기본 일자로
  const isCur = defaultYear === n.getFullYear() && defaultMonth === n.getMonth() + 1;
  const defDate = isCur
    ? `${defaultYear}-${two(defaultMonth)}-${two(n.getDate())}`
    : `${defaultYear}-${two(defaultMonth)}-01`;
  const [date, setDate] = useState(defDate);
  const [time, setTime] = useState(`${two(n.getHours())}:${two(n.getMinutes())}`);
  const [cardCode, setCardCode] = useState('CD3170'); // 기본 현금
  const [merchant, setMerchant] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryCode, setCategoryCode] = useState('');

  const amount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
  const valid = date && amount > 0;

  const submit = () => {
    const usedAt = `${date}T${time || '00:00'}:00`;
    const [y, m] = date.split('-').map(Number);
    onSave({
      usedAt, cardCode, amount,
      merchant: merchant.trim() || null,
      categoryCode: categoryCode || null,
      _year: y, _month: m,
    });
  };

  const downOnOverlay = useRef(false);
  return (
    <div className="modal-overlay"
         onMouseDown={e => { downOnOverlay.current = e.target === e.currentTarget; }}
         onClick={e => { if (e.target === e.currentTarget && downOnOverlay.current) onClose(); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>소비내역 직접 추가</h3>
        <div style={{ background: '#eceff1', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#546e7a' }}>
          현금 결제 등 문자로 안 들어오는 소비를 직접 추가해요. 수단은 <b>현금</b>이 기본이며 카드로도 바꿀 수 있어요.
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>일자</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>시각</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label>수단</label>
            <select value={cardCode} onChange={e => setCardCode(e.target.value)}>
              {cardOptions.map(o => <option key={o.cd} value={o.cd}>{o.nm}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>금액 (원)</label>
            <input type="text" inputMode="numeric" value={amountStr} placeholder="예: 15000"
                   onChange={e => setAmountStr(e.target.value.replace(/[^0-9,]/g, ''))}
                   onBlur={e => setAmountStr(amount ? amount.toLocaleString('ko-KR') : '')} />
          </div>
          <div className="form-group full">
            <label>가맹점</label>
            <input type="text" value={merchant} placeholder="예: 전통시장" onChange={e => setMerchant(e.target.value)} />
          </div>
          <div className="form-group full">
            <label>소비 카테고리 (선택)</label>
            <select value={categoryCode} onChange={e => setCategoryCode(e.target.value)}>
              <option value="">— 미분류 —</option>
              {catGroups.map(g => (
                <optgroup key={g.mid.cdId} label={g.mid.cdNm}>
                  {g.leaves.map(l => <option key={l.cdId} value={l.cdId}>{l.cdNm}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" disabled={!valid} onClick={submit}>추가</button>
        </div>
      </div>
    </div>
  );
}
