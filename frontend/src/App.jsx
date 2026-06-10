import { useState } from 'react';
import TransactionsPage from './pages/TransactionsPage';
import AssetsPage from './pages/AssetsPage';
import LoanPage from './pages/LoanPage';
import FixedCostPage from './pages/FixedCostPage';
import CommonCodesPage from './pages/CommonCodesPage';
import './App.css';

const TABS = [
  { key: 'transactions', label: '💰 소득/지출 내역' },
  { key: 'fixed', label: '📌 고정비 관리' },
  { key: 'assets', label: '📊 자산 현황' },
  { key: 'loans', label: '🏦 대출 상환 계획' },
  { key: 'codes', label: '⚙️ 공통코드 관리' },
];

export default function App() {
  const [tab, setTab] = useState('transactions');

  return (
    <div className="app">
      <header className="app-header">
        <h1>내 재정 관리</h1>
        <nav className="tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`tab-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {tab === 'transactions' && <TransactionsPage />}
        {tab === 'fixed' && <FixedCostPage />}
        {tab === 'assets' && <AssetsPage />}
        {tab === 'loans' && <LoanPage />}
        {tab === 'codes' && <CommonCodesPage />}
      </main>
    </div>
  );
}
