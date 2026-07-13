import React from 'react';
import './LiquidationFeed.css';

export default function LiquidationFeed({ liquidations }) {
  return (
    <div className="liquidation-panel">
      <div className="panel-header-mini">
        <h3>Radar de Liquidaciones 💀</h3>
      </div>
      
      <div className="liq-container">
        {liquidations.length === 0 ? (
          <div className="empty-state">Buscando sobre-apalancados...</div>
        ) : (
          <div className="liq-list">
            {liquidations.map((liq) => (
              <div 
                key={liq.id} 
                className={`liq-row ${liq.side === 'long' ? 'liq-long' : 'liq-short'}`}
              >
                <div className="liq-time">{liq.time}</div>
                <div className="liq-info">
                  <span className="liq-type">
                    {liq.side === 'long' ? 'LONG REKT' : 'SHORT REKT'}
                  </span>
                  <span className="liq-vol">${Math.round(liq.volume).toLocaleString()}</span>
                  <span className="liq-price">a {liq.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
