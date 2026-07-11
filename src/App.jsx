import React, { useState } from 'react';
import { useOrderBook } from './hooks/useOrderBook';
import OrderBook from './components/OrderBook';
import DepthChart from './components/DepthChart';
import AnalysisPanel from './components/AnalysisPanel';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [inputSymbol, setInputSymbol] = useState('BTCUSDT');
  const { data, stats, insights } = useOrderBook(symbol);

  const handleSymbolChange = (e) => {
    e.preventDefault();
    if (inputSymbol.trim()) {
      setSymbol(inputSymbol.toUpperCase());
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-area">
          <div className="logo-icon"></div>
          <h1>OrderFlow Pro</h1>
        </div>
        
        <form className="symbol-form" onSubmit={handleSymbolChange}>
          <input 
            type="text" 
            value={inputSymbol} 
            onChange={(e) => setInputSymbol(e.target.value)} 
            placeholder="Ej. BTCUSDT"
            className="symbol-input"
          />
          <button type="submit" className="btn-search">Cambiar Activo</button>
        </form>

        <div className="header-actions">
          <button className="btn-icon">⚙️</button>
        </div>
      </header>

      <main className="main-content">
        <div className="left-column">
          <AnalysisPanel stats={stats} symbol={symbol} insights={insights} />
          <DepthChart data={data} />
        </div>
        
        <div className="right-column">
          <OrderBook data={data} />
          
          <div className="trade-actions">
            <button className="btn-trade btn-buy">Buy Long</button>
            <button className="btn-trade btn-sell">Sell Short</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
