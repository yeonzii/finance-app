import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8080/api' });

// ── 공통코드 ──────────────────────────────────────
export const getCodesByGroup = (codeGroup) =>
  api.get(`/codes/group/${encodeURIComponent(codeGroup)}`).then(r => r.data);

export const getCodeChildren = (parentId) =>
  api.get(`/codes/children/${parentId}`).then(r => r.data);

export const getAllCodes = () =>
  api.get('/codes').then(r => r.data);

export const createCode = (data) =>
  api.post('/codes', data).then(r => r.data);

export const updateCode = (id, data) =>
  api.put(`/codes/${id}`, data).then(r => r.data);

export const deleteCode = (id) =>
  api.delete(`/codes/${id}`);

export const restoreCode = (id) =>
  api.put(`/codes/${id}/restore`).then(r => r.data);

// ── 거래내역 ──────────────────────────────────────
export const getTransactions = (year, month) =>
  api.get('/transactions', { params: { year, month } }).then(r => r.data);

export const createTransaction = (data) =>
  api.post('/transactions', data).then(r => r.data);

export const updateTransaction = (id, data) =>
  api.put(`/transactions/${id}`, data).then(r => r.data);

export const deleteTransaction = (id) =>
  api.delete(`/transactions/${id}`);

// ── 자산현황 ──────────────────────────────────────
export const getAssets = (year) =>
  api.get('/assets', { params: { year } }).then(r => r.data);

export const getAsset = (year, month) =>
  api.get(`/assets/${year}/${month}`).then(r => r.data);

export const saveAsset = (data) =>
  data.id ? api.put(`/assets/${data.id}`, data).then(r => r.data)
           : api.post('/assets', data).then(r => r.data);

// ── 대출계획 ──────────────────────────────────────
export const getLoans = () =>
  api.get('/loans').then(r => r.data);

export const saveLoan = (data) =>
  data.id ? api.put(`/loans/${data.id}`, data).then(r => r.data)
           : api.post('/loans', data).then(r => r.data);

export const deleteLoan = (id) =>
  api.delete(`/loans/${id}`);

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
