import { useState, useEffect } from 'react';
import { getAllCodes, createCode, updateCode, deleteCode, restoreCode } from '../api';

const EMPTY = { cdId: '', cdNm: '', cdLevel: 1, parentCdId: '', sortOrder: 1, delYn: 'N' };

// 계층 정렬: 부모 바로 아래 자식이 오도록 트리 평탄화
function buildTree(codes, showDeleted) {
  const visible = codes.filter(c => showDeleted || c.delYn === 'N');
  const byParent = {};
  visible.forEach(c => {
    const key = c.parentCdId || '__root__';
    (byParent[key] = byParent[key] || []).push(c);
  });
  Object.values(byParent).forEach(arr =>
    arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  );
  const result = [];
  const walk = (parentKey) => {
    (byParent[parentKey] || []).forEach(c => {
      result.push(c);
      walk(c.cdId);
    });
  };
  walk('__root__');
  return result;
}

export default function CommonCodesPage() {
  const [allCodes, setAllCodes] = useState([]);
  const [modal, setModal] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const load = () => getAllCodes().then(setAllCodes);
  useEffect(() => { load(); }, []);

  const tree = buildTree(allCodes, showDeleted);
  const parentOptions = allCodes.filter(c => c.delYn === 'N');

  const openAdd = () => setModal({ mode: 'add', data: { ...EMPTY } });
  const openEdit = (row) => setModal({ mode: 'edit', data: { ...row } });
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
        <button className="btn btn-primary" onClick={openAdd}>+ 코드 추가</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginLeft: 'auto' }}>
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
          삭제된 항목 보기
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>공통코드ID</th>
              <th>공통코드명</th>
              <th>레벨</th>
              <th>부모코드</th>
              <th>순서</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tree.length === 0 && (
              <tr><td colSpan={7} className="empty-state">코드가 없어요. 추가해보세요.</td></tr>
            )}
            {tree.map(c => {
              const parent = allCodes.find(p => p.cdId === c.parentCdId);
              return (
                <tr key={c.cdId} style={c.delYn === 'Y' ? { opacity: 0.4 } : {}}>
                  <td>
                    <code style={{ background: '#e8eaf6', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                      {c.cdId}
                    </code>
                  </td>
                  <td style={{ fontWeight: 600, paddingLeft: 12 + c.cdLevel * 16 }}>
                    {c.cdLevel > 0 && <span style={{ color: '#bbb', marginRight: 4 }}>└</span>}
                    {c.cdNm}
                  </td>
                  <td style={{ color: '#999', textAlign: 'center' }}>{c.cdLevel}</td>
                  <td style={{ color: '#666', fontSize: 12 }}>
                    {parent ? `${parent.cdNm} (${parent.cdId})` : '-'}
                  </td>
                  <td style={{ color: '#999', textAlign: 'center' }}>{c.sortOrder}</td>
                  <td>
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
        <CodeModal
          modal={modal}
          parentOptions={parentOptions}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function CodeModal({ modal, parentOptions, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{modal.mode === 'add' ? '코드 추가' : '코드 수정'}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>공통코드ID</label>
            <input
              value={form.cdId}
              onChange={e => set('cdId', e.target.value.toUpperCase())}
              placeholder="예: CD2150"
              disabled={modal.mode === 'edit'}
            />
          </div>
          <div className="form-group">
            <label>공통코드명</label>
            <input value={form.cdNm} onChange={e => set('cdNm', e.target.value)} placeholder="예: 교통비" />
          </div>
          <div className="form-group">
            <label>코드레벨</label>
            <input type="number" min={0} max={3} value={form.cdLevel} onChange={e => set('cdLevel', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>부모코드 (없으면 ROOT)</label>
            <select value={form.parentCdId || ''} onChange={e => set('parentCdId', e.target.value || null)}>
              <option value="">없음</option>
              {parentOptions.map(p => (
                <option key={p.cdId} value={p.cdId}>{p.cdNm} ({p.cdId})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>정렬순서</label>
            <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', +e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>저장</button>
        </div>
      </div>
    </div>
  );
}
