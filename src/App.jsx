import React, { useState } from 'react';
import { useOrderBook } from './hooks/useOrderBook';
import OrderBook from './components/OrderBook';
import DepthChart from './components/DepthChart';
import AnalysisPanel from './components/AnalysisPanel';
import NotificationHistory from './components/NotificationHistory';
import RecentTrades from './components/RecentTrades';
import './App.css';

const ASSETS = [
  { id: 'BTCUSDT', name: 'Bitcoin', icon: '₿' },
  { id: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ' },
  { id: 'BNBUSDT', name: 'Binance Coin', icon: '🟡' },
  { id: 'SOLUSDT', name: 'Solana', icon: '◎' },
  { id: 'ZECUSDT', name: 'Zcash', icon: 'ⓩ' },
  { id: 'SPCXBUSDT', name: 'SPACEX', icon: '🚀' }
];

function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { 
    data, stats, insights, history, currentPrice, isConnected, 
    supportPrice, resistancePrice, momentum,
    cvdHistory, tapeSpeed, nearDepth, recentTrades
  } = useOrderBook(symbol);

  const prevPriceRef = React.useRef(currentPrice);
  const [priceColor, setPriceColor] = useState('var(--color-buy)');

  React.useEffect(() => {
    if (currentPrice > prevPriceRef.current) setPriceColor('var(--color-buy)');
    else if (currentPrice < prevPriceRef.current) setPriceColor('var(--color-sell)');
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);

  const selectedAsset = ASSETS.find(a => a.id === symbol);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-area">
          <div className="logo-icon"></div>
          <h1>OrderFlow Pro</h1>
        </div>
        
        <div className="center-header">
          {isConnected && currentPrice > 0 && (
             <div className="big-price" style={{ color: priceColor }}>
               {currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toFixed(2)}
               <span className="price-currency">USDT</span>
             </div>
          )}
        </div>

        <div className="asset-selector-container">
          <button 
            className="asset-dropdown-btn" 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="asset-icon">{selectedAsset?.icon}</span>
            <span className="asset-name">{selectedAsset?.id}</span>
            <span className="dropdown-arrow">▼</span>
          </button>
          
          {isDropdownOpen && (
            <div className="asset-dropdown-menu">
              {ASSETS.map(asset => (
                <button 
                  key={asset.id}
                  className={`dropdown-item ${symbol === asset.id ? 'active' : ''}`}
                  onClick={() => {
                    setSymbol(asset.id);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="asset-icon">{asset.icon}</span>
                  <div className="asset-info">
                    <span className="asset-symbol">{asset.id}</span>
                    <span className="asset-fullname">{asset.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="header-actions">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Online' : 'Conectando...'}
          </div>
          <button className="btn-icon" onClick={() => setIsSettingsOpen(true)}>⚙️</button>
        </div>
      </header>

      <main className="main-content">
        {!isConnected ? (
          <div className="loading-screen">
            <div className="loader"></div>
            <h2>Conectando al mercado...</h2>
            <p>Estableciendo enlace seguro con Binance Spot para {symbol}</p>
          </div>
        ) : (
          <>
            <div className="left-column">
              <AnalysisPanel 
                stats={stats} 
                symbol={symbol} 
                insights={insights} 
                supportPrice={supportPrice}
                resistancePrice={resistancePrice}
                momentum={momentum}
                cvdHistory={cvdHistory}
                tapeSpeed={tapeSpeed}
                nearDepth={nearDepth}
              />
              <NotificationHistory history={history} />
            </div>
            
            <div className="middle-column">
               <DepthChart data={data} />
            </div>

            <div className="right-column">
              <OrderBook 
                data={data} 
                supportPrice={supportPrice}
                resistancePrice={resistancePrice}
              />
              <div className="trade-actions">
                <button className="btn-trade btn-buy">Buy Long</button>
                <button className="btn-trade btn-sell">Sell Short</button>
              </div>
              <RecentTrades trades={recentTrades} />
            </div>
          </>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configuración</h2>
              <button className="btn-close" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="setting-group">
                <label>Tema Visual</label>
                <select className="setting-select" disabled>
                  <option>Oscuro Profesional (Activo)</option>
                  <option>Claro (Próximamente)</option>
                </select>
              </div>
              <div className="setting-group">
                <label>Alertas de Sonido</label>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={soundEnabled} 
                    onChange={(e) => setSoundEnabled(e.target.checked)} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="setting-group">
                <label>Servidor de Datos</label>
                <div className="server-info">
                  <span className="server-dot"></span>
                  wss://stream.binance.com:9443
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
