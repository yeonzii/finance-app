import { useState, useEffect } from 'react';
import {
  getAssetItems, createAssetItem, updateAssetItem, deleteAssetItem, getAllCodes
} from '../api';

const INCOME_ROOT = 'CD1000'; // 소득
const EXPENSE_ROOT = 'CD2000'; // 비용
const ORG_ROOT = 'CD3000';    // 기관분류

// 구분별 설정: 라벨 + 항목 선택 소스(공통코드 루트)
const TYPES = [
  { key: 'INCOME',  label: '소득', root: INCOME_ROOT,  codeLabel: '소득 코드',     color: '#2e7d32', bg: '#e8f5e9' },
  { key: 'EXPENSE', label: '지출', root: EXPENSE_ROOT, codeLabel: '비용 코드',     color: '#c62828', bg: '#ffebee' },
  { key: 'ASSET',   label: '자산', root: ORG_ROOT,     codeLabel: '기관분류 코드', color: '#283593', bg: '#e8eaf6' },
];

export default function AssetItemsPage() {
  const [items, setItems] = useState([]);
  const [codes, setCodes] = useState([]);
  const [modal, setModal] = useState(null);
  const [drag, setDrag] = useState(null); // { id, type }

  const load = () => getAssetItems().then(setItems);
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
  // 부모명 (그룹 라벨)
  const parentName = (cdId) => {
    const node = codes.find(c => c.cdId === cdId);
    return node ? (codes.find(p => p.cdId === node.parentCdId)?.cdNm ?? '') : '';
  };

  const openAdd = (type) => setModal({ type });
  const closeModal = () => setModal(null);

  const handleSave = async (typeKey, codeId) => {
    const items4type = items.filter(i => i.assetType === typeKey);
    const nextSort = items4type.reduce((m, i) => Math.max(m, i.sortOrder ?? 0), 0) + 1;
    await createAssetItem({ assetType: typeKey, codeId, itemName: nameById(codeId), sortOrder: nextSort });
    closeModal();
    load();
  };

  const handleDelete = async (it) => {
    if (!confirm(`'${it.itemName}'을(를) 구성에서 제거할까요?`)) return;
    await deleteAssetItem(it.id);
    load();
  };

  // ── 순서 변경 ────────────────────────────────────
  const listOf = (typeKey) =>
    items.filter(i => i.assetType === typeKey)
         .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);

  const persistOrder = async (ordered) => {
    const changed = ordered
      .map((it, i) => ({ it, sort: i + 1 }))
      .filter(({ it, sort }) => it.sortOrder !== sort);
    if (changed.length === 0) return;
    await Promise.all(changed.map(({ it, sort }) => updateAssetItem(it.id, { ...it, sortOrder: sort })));
    load();
  };

  const move = (typeKey, id, dir) => {
    const list = listOf(typeKey);
    const idx = list.findIndex(i => i.id === id);
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const re = [...list];
    [re[idx], re[j]] = [re[j], re[idx]];
    persistOrder(re);
  };

  const onDropRow = (typeKey, targetId) => {
    if (!drag || drag.type !== typeKey || drag.id === targetId) { setDrag(null); return; }
    const list = listOf(typeKey);
    const from = list.findIndex(i => i.id === drag.id);
    const to = list.findIndex(i => i.id === targetId);
    if (from < 0 || to < 0) { setDrag(null); return; }
    const re = [...list];
    const [moved] = re.splice(from, 1);
    re.splice(to, 0, moved);
    setDrag(null);
    persistOrder(re);
  };

  return (
    <div>
      <div className="page-header">
        <h2>자산 항목 구성</h2>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        💡 자산현황에 표시할 항목을 구분별로 구성하세요. 소득은 <b>소득 코드</b>, 지출·자산은 <b>기관분류 코드</b>에서 선택합니다.
        <br/>↕ 드래그하거나 <b>▲▼</b> 버튼으로 순서를 바꾸면 자산현황에도 그 순서로 반영돼요.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {TYPES.map(t => {
          const list = listOf(t.key);
          return (
            <div key={t.key} className="table-wrap" style={{ borderTop: `3px solid ${t.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                <span style={{ fontWeight: 700, color: t.color }}>
                  <span style={{ background: t.bg, color: t.color, padding: '2px 10px', borderRadius: 12, fontSize: 13 }}>{t.label}</span>
                  <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>{list.length}개</span>
                </span>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openAdd(t)}>+ 추가</button>
              </div>
              <table>
                <thead>
                  <tr><th style={{ width: 24 }}></th><th>분류</th><th>항목</th><th>순서</th><th></th></tr>
                </thead>
                <tbody>
                  {list.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">구성된 항목이 없어요.</td></tr>
                  )}
                  {list.map((it, idx) => (
                    <tr key={it.id}
                        draggable
                        onDragStart={() => setDrag({ id: it.id, type: t.key })}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => onDropRow(t.key, it.id)}
                        style={{ background: drag?.id === it.id ? '#eef' : undefined, cursor: 'grab' }}>
                      <td style={{ textAlign: 'center', color: '#bbb', cursor: 'grab' }} title="드래그하여 이동">⠿</td>
                      <td style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>{parentName(it.codeId) || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{nameById(it.codeId)}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn" style={{ padding: '2px 6px', background: '#e8eaf6', color: '#3949ab' }}
                                disabled={idx === 0} onClick={() => move(t.key, it.id, -1)} title="위로">▲</button>
                        <button className="btn" style={{ padding: '2px 6px', marginLeft: 2, background: '#e8eaf6', color: '#3949ab' }}
                                disabled={idx === list.length - 1} onClick={() => move(t.key, it.id, 1)} title="아래로">▼</button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger" onClick={() => handleDelete(it)}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {modal && (
        <AddItemModal
          type={modal.type}
          leaves={leafDescendants(modal.type.root)}
          parentName={parentName}
          existingCodeIds={items.filter(i => i.assetType === modal.type.key).map(i => i.codeId)}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function AddItemModal({ type, leaves, parentName, existingCodeIds, onSave, onClose }) {
  const [codeId, setCodeId] = useState('');
  // 이미 구성된 항목은 제외
  const options = leaves.filter(l => !existingCodeIds.includes(l.cdId));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{type.label} 항목 추가</h3>
        <div className="form-grid">
          <div className="form-group full">
            <label>항목 선택 ({type.codeLabel})</label>
            <select value={codeId} onChange={e => setCodeId(e.target.value)} autoFocus>
              <option value="">선택</option>
              {options.map(l => (
                <option key={l.cdId} value={l.cdId}>
                  {parentName(l.cdId) ? `${parentName(l.cdId)} > ${l.cdNm}` : l.cdNm}
                </option>
              ))}
            </select>
            {options.length === 0 && (
              <small style={{ color: '#c62828' }}>추가할 수 있는 항목이 없어요 (모두 구성됨 또는 코드 미등록).</small>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave(type.key, codeId)} disabled={!codeId}>저장</button>
        </div>
      </div>
    </div>
  );
}
