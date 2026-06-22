import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8080/api' });

// ── 공통코드 (TB_CODE) ────────────────────────────
// 특정 부모의 활성 하위코드
export const getCodeChildren = (parentCdId) =>
  api.get(`/codes/children/${parentCdId}`).then(r => r.data);

// 특정 레벨의 활성 코드
export const getCodesByLevel = (level) =>
  api.get(`/codes/level/${level}`).then(r => r.data);

// 전체 코드 (삭제 포함)
export const getAllCodes = () =>
  api.get('/codes').then(r => r.data);

export const createCode = (data) =>
  api.post('/codes', data).then(r => r.data);

export const updateCode = (cdId, data) =>
  api.put(`/codes/${cdId}`, data).then(r => r.data);

export const deleteCode = (cdId) =>
  api.delete(`/codes/${cdId}`);

export const restoreCode = (cdId) =>
  api.put(`/codes/${cdId}/restore`).then(r => r.data);

// ── 거래내역 ──────────────────────────────────────
export const getTransactions = (year, month) =>
  api.get('/transactions', { params: { year, month } }).then(r => r.data);

export const createTransaction = (data) =>
  api.post('/transactions', data).then(r => r.data);

export const updateTransaction = (id, data) =>
  api.put(`/transactions/${id}`, data).then(r => r.data);

export const deleteTransaction = (id) =>
  api.delete(`/transactions/${id}`);

// ── 고정비 ────────────────────────────────────────
export const getFixedCosts = () =>
  api.get('/fixed-costs').then(r => r.data);

export const createFixedCost = (data) =>
  api.post('/fixed-costs', data).then(r => r.data);

export const updateFixedCost = (id, data) =>
  api.put(`/fixed-costs/${id}`, data).then(r => r.data);

export const deleteFixedCost = (id) =>
  api.delete(`/fixed-costs/${id}`);

// 해당 월에 고정비를 거래로 자동 생성 (중복 방지)
export const generateFixedCosts = (year, month) =>
  api.post('/fixed-costs/generate', null, { params: { year, month } }).then(r => r.data);

// ── 자산 항목 구성 ────────────────────────────────
export const getAssetItems = () =>
  api.get('/asset-items').then(r => r.data);

export const createAssetItem = (data) =>
  api.post('/asset-items', data).then(r => r.data);

export const updateAssetItem = (id, data) =>
  api.put(`/asset-items/${id}`, data).then(r => r.data);

export const deleteAssetItem = (id) =>
  api.delete(`/asset-items/${id}`);

// ── 결제기관(카드사) 결제일 ───────────────────────
export const getPaymentInstitutions = () =>
  api.get('/payment-institutions').then(r => r.data);

export const savePaymentInstitution = (data) =>
  api.post('/payment-institutions', data).then(r => r.data);

// ── 자산현황 월별 값 ──────────────────────────────
export const getAssetValues = (year) =>
  api.get('/asset-values', { params: { year } }).then(r => r.data);

export const saveAssetValue = (data) =>
  api.post('/asset-values', data).then(r => r.data);

// ── 대출계획 ──────────────────────────────────────
export const getLoans = () =>
  api.get('/loans').then(r => r.data);

export const saveLoan = (data) =>
  data.id ? api.put(`/loans/${data.id}`, data).then(r => r.data)
           : api.post('/loans', data).then(r => r.data);

export const deleteLoan = (id) =>
  api.delete(`/loans/${id}`);

// 해당 월 소득/지출 내역에 원리금상환·원금추가상환 반영
export const reflectLoanExpense = (id) =>
  api.post(`/loans/${id}/reflect-expense`).then(r => r.data);

// ── 이자율 히스토리 ───────────────────────────────
export const getLoanRates = () =>
  api.get('/loans/rates').then(r => r.data);

export const calculateInterest = (year, month, balance) =>
  api.get('/loans/rates/calculate', { params: { year, month, balance } }).then(r => r.data);

export const saveLoanRate = (data) =>
  data.id ? api.put(`/loans/rates/${data.id}`, data).then(r => r.data)
           : api.post('/loans/rates', data).then(r => r.data);

export const deleteLoanRate = (id) =>
  api.delete(`/loans/rates/${id}`);
