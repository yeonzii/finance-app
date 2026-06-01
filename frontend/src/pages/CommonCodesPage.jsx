import { useState, useEffect } from 'react';
import { getAllCodes, createCode, updateCode, deleteCode, restoreCode } from '../api';

// 코드 그룹 목록 (순서 고정)
const CODE_GROUPS = ['대분류', '소득유형', '비용유형', '투자유형', '기관유형', '카드사', '보험사', '은행', '증권사'];

const EMPTY = { codeGroup: '대분류', parentId: '', code: '', codeName: '', sortOrder: 0 };

export default function CommonCodesPage() {
  const [allCodes, setAllCodes] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('대분류');
  const [modal, setModal] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const load = () => getAllCodes().then(setAllCodes);
  useEffect(() => { load(); }, []);

  const groupedCodes = allCodes.filter(c =>
    c.codeGroup === selectedGroup && (showDeleted || c.delYn === 'N')
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  // 상위 코드 목록 (해당 그룹의 상위가 될 수 있는 것들)
  const parentOptions = allCodes.filter(c => c.delYn === 'N');

  const openAdd = () => setModal({ mode: 'add', data: { ...EMPTY, codeGroup: selectedGroup } });
  const openEdit = (row) => setModal({ mode: 'edit', data: { ...row } });
  const closeModal = () => setModal(null);

  const handleSave = async (data) => {
    const payload = { ...data, parentId: data.parentId || null };
    if (modal.mode === 'add') await createCode(payload);
    else await updateCode(data.id, payload);
    closeModal();
    load();
  };

  const handleDelete = async (c) => {
    if (!confirm(`'${c.codeName}'을(를) 삭제할까요? (복구 가능)`)) return;
    await deleteCode(c.id);
    load();
  };

  const handleRestore = async (c) => {
    await restoreCode(c.id);
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

      {/* 그룹 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {CODE_GROUPS.map(g => (
          <button
            key={g}
            className={`btn ${selectedGroup === g ? 'btn-primary' : ''}`}
            style={selectedGroup !== g ? { background: '#e8eaf6', color: '#3949ab' } : {}}
            onClick={() => setSelectedGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>코드값</th>
              <th>표시명</th>
              <th>상위코드</th>
              <th>순서</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groupedCodes.length === 0 && (
              <tr><td colSpan={7} className="empty-state">코드가 없어요. 추가해보세요.</td></tr>
            )}
            {groupedCodes.map(c => {
              const parent = allCodes.find(p => p.id === c.parentId);
              return (
                <tr key={c.id} style={c.delYn === 'Y' ? { opacity: 0.4 } : {}}>
                  <td style={{ color: '#999', fontSize: 11 }}>{c.id}</td>
                  <td><code style={{ background: '#e8eaf6', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{c.code}</code></td>
                  <td style={{ fontWeight: 600 }}>{c.codeName}</td>
                  <td style={{ color: '#666', fontSize: 12 }}>{parent ? `${parent.codeName} (${parent.code})` : '-'}</td>
                  <td style={{ color: '#999' }}>{c.sortOrder}</td>
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
          codeGroups={CODE_GROUPS}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function CodeModal({ modal, parentOptions, codeGroups, onSave, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{modal.mode === 'add' ? '코드 추가' : '코드 수정'}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>코드 그룹</label>
            <select value={form.codeGroup} onChange={e => set('codeGroup', e.target.value)}>
              {codeGroups.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>상위코드 (없으면 빈칸)</label>
            <select value={form.parentId || ''} onChange={e => set('parentId', e.target.value ? +e.target.value : null)}>
              <option value="">없음</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>{p.codeName} ({p.codeGroup})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>코드값 (영문)</label>
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="예: SALARY" />
          </div>
          <div className="form-group">
            <label>표시명</label>
            <input value={form.codeName} onChange={e => set('codeName', e.target.value)} placeholder="예: 급여" />
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
