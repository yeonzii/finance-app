import { useState, useEffect } from 'react';
import { getAllCodes, createCode, updateCode, deleteCode, restoreCode } from '../api';

const ROOT = 'CD0000';

// 부모 코드 기준 다음 자식 코드ID 자동 채번
// 코드체계: CD + 4자리, 부모 레벨 위치의 자리값을 증가시킨다.
//   ROOT(L0)→1번째자리, L1→2번째, L2→3번째, L3→4번째
function nextChildCode(parentCdId, parentLevel, allCodes) {
  const position = parentLevel; // 0~3 (채울 자리 인덱스)
  if (position > 3) return ''; // 4자리 초과(레벨5+)는 자동채번 불가

  const base = parentCdId.replace(/^CD/, '').padStart(4, '0').split('').map(Number);
  const siblings = allCodes.filter(c => c.parentCdId === parentCdId); // 삭제 포함 (PK 충돌 방지)
  let max = 0;
  siblings.forEach(c => {
    const d = Number(c.cdId.replace(/^CD/, '').padStart(4, '0')[position]);
    if (d > max) max = d;
  });
  const digits = [...base];
  digits[position] = max + 1;
  for (let i = position + 1; i < 4; i++) digits[i] = 0;
  return 'CD' + digits.join('');
}

export default function CommonCodesPage() {
  const [allCodes, setAllCodes] = useState([]);
  const [modal, setModal] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  // 현재 탐색 중인 부모코드 (ROOT면 레벨1이 보임)
  const [currentParent, setCurrentParent] = useState(ROOT);

  const load = () => getAllCodes().then(setAllCodes);
  useEffect(() => { load(); }, []);

  // 현재 부모의 직속 하위코드만 (정렬)
  const rows = allCodes
    .filter(c => c.parentCdId === currentParent && (showDeleted || c.delYn === 'N'))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const hasChildren = (cdId) => allCodes.some(c => c.parentCdId === cdId && c.delYn === 'N');

  // 현재 부모 노드 (ROOT면 가상 노드)
  const currentNode = currentParent === ROOT
    ? { cdId: ROOT, cdNm: 'ROOT', cdLevel: 0 }
    : allCodes.find(c => c.cdId === currentParent);

  // 브레드크럼 경로 (ROOT 제외)
  const breadcrumb = [];
  let cur = currentParent;
  while (cur && cur !== ROOT) {
    const node = allCodes.find(c => c.cdId === cur);
    if (!node) break;
    breadcrumb.unshift(node);
    cur = node.parentCdId;
  }

  // 더블클릭: 하위 유무와 상관없이 진입 (빈 목록이면 추가 가능)
  const drillInto = (c) => setCurrentParent(c.cdId);

  // 추가: 현재 페이지의 하위코드로 추가 (ID 자동 채번)
  const openAdd = () => {
    const parentLevel = currentNode?.cdLevel ?? 0;
    const newId = nextChildCode(currentParent, parentLevel, allCodes);
    const siblings = allCodes.filter(c => c.parentCdId === currentParent && c.delYn === 'N');
    const nextSort = siblings.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), 0) + 1;
    setModal({
      mode: 'add',
      data: { cdId: newId, cdNm: '', cdLevel: parentLevel + 1, parentCdId: currentParent, sortOrder: nextSort, delYn: 'N' },
      parentName: currentNode?.cdNm ?? 'ROOT',
    });
  };
  const openEdit = (row) => {
    const parent = allCodes.find(c => c.cdId === row.parentCdId);
    setModal({ mode: 'edit', data: { ...row }, parentName: parent?.cdNm ?? 'ROOT' });
  };
  const closeModal = () => setModal(null);

  const handleSave = async (data) => {
    const payload = {
      ...data,
      parentCdId: data.parentCdId || null,
      cdLevel: +data.cdLevel,
      sortOrder: +data.sortOrder,
    };
    if (modal.mode === 'add') await createCode(payload);
    else await updateCode(data.cdId, payload);
    closeModal();
    load();
  };

  const handleDelete = async (c) => {
    if (!confirm(`'${c.cdNm}'을(를) 삭제할까요? (복구 가능)`)) return;
    await deleteCode(c.cdId);
    load();
  };

  const handleRestore = async (c) => {
    await restoreCode(c.cdId);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h2>공통코드 관리</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ 하위코드 추가</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginLeft: 'auto' }}>
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
          삭제된 항목 보기
        </label>
      </div>

      {/* 브레드크럼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 14, flexWrap: 'wrap' }}>
        <button
          className="btn"
          style={{ background: currentParent === ROOT ? '#3949ab' : '#e8eaf6', color: currentParent === ROOT ? '#fff' : '#3949ab', padding: '4px 12px' }}
          onClick={() => setCurrentParent(ROOT)}
        >
          🏠 전체
        </button>
        {breadcrumb.map((node, i) => (
          <span key={node.cdId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#bbb' }}>›</span>
            <button
              className="btn"
              style={{ background: i === breadcrumb.length - 1 ? '#3949ab' : '#e8eaf6', color: i === breadcrumb.length - 1 ? '#fff' : '#3949ab', padding: '4px 12px' }}
              onClick={() => setCurrentParent(node.cdId)}
            >
              {node.cdNm}
            </button>
          </span>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        💡 행을 <b>더블클릭</b>하면 하위 코드로 이동해요 (하위가 없어도 진입해서 추가 가능). <b>+ 하위코드 추가</b>는 현재 위치의 하위로 등록돼요.
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>공통코드ID</th>
              <th>공통코드명</th>
              <th style={{ textAlign: 'center' }}>레벨</th>
              <th style={{ textAlign: 'center' }}>순서</th>
              <th style={{ textAlign: 'center' }}>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="empty-state">하위 코드가 없어요. <b>+ 하위코드 추가</b>로 등록해보세요.</td></tr>
            )}
            {rows.map(c => {
              const drillable = hasChildren(c.cdId);
              return (
                <tr
                  key={c.cdId}
                  onDoubleClick={() => drillInto(c)}
                  style={{ opacity: c.delYn === 'Y' ? 0.4 : 1, cursor: 'pointer' }}
                  title="더블클릭하면 하위 코드를 봅니다"
                >
                  <td>
                    <code style={{ background: '#e8eaf6', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                      {c.cdId}
                    </code>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {c.cdNm}
                    {drillable && <span style={{ color: '#3949ab', marginLeft: 6, fontSize: 12 }}>▸ 하위</span>}
                  </td>
                  <td style={{ color: '#999', textAlign: 'center' }}>{c.cdLevel}</td>
                  <td style={{ color: '#999', textAlign: 'center' }}>{c.sortOrder}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: c.delYn === 'N' ? '#e8f5e9' : '#ffebee',
                      color: c.delYn === 'N' ? '#2e7d32' : '#c62828'
                    }}>
                      {c.delYn === 'N' ? '정상' : '삭제'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {c.delYn === 'N' ? (
                      <>
                        <button className="btn btn-edit" onClick={() => openEdit(c)}>수정</button>
                        <button className="btn btn-danger" onClick={() => handleDelete(c)}>삭제</button>
                      </>
                    ) : (
                      <button className="btn" style={{ background: '#e65100', color: 'white', padding: '4px 8px', fontSize: 12 }}
                        onClick={() => handleRestore(c)}>복구</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <CodeModal modal={modal} onSave={handleSave} onClose={closeModal} />
      )}
    </div>
  );
}

function CodeModal({ modal, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{modal.mode === 'add' ? '하위코드 추가' : '코드 수정'}</h3>
        <div style={{ background: '#e8eaf6', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#3949ab' }}>
          상위: <strong>{modal.parentName}</strong> · 레벨 <strong>{form.cdLevel}</strong> · 코드ID 자동부여
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>공통코드ID (자동)</label>
            <input value={form.cdId} disabled />
          </div>
          <div className="form-group">
            <label>공통코드명</label>
            <input value={form.cdNm} onChange={e => set('cdNm', e.target.value)} placeholder="예: 넷플릭스" autoFocus />
          </div>
          <div className="form-group">
            <label>정렬순서</label>
            <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', +e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.cdId || !form.cdNm}>저장</button>
        </div>
      </div>
    </div>
  );
}
