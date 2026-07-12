import React from 'react';
import './RecentTrades.css';

export default function RecentTrades({ trades = [] }) {
  return (
    <div className="recent-trades-container">
      <div className="trades-header">
        <h3>Live Market Tape</h3>
        <span className="trades-pulse"></span>
      </div>
      
      <div className="trades-table-header">
        <span>Hora</span>
        <span>Precio</span>
        <span className="right-align">Tamaño</span>
        <span className="right-align">Valor (USDT)</span>
      </div>

      <div className="trades-list-container">
        {trades.length === 0 ? (
          <div className="empty-trades">Escuchando operaciones...</div>
        ) : (
          <div className="trades-list">
            {trades.map((trade) => {
              const isLarge = parseFloat(trade.usd) > 5000;
              return (
                <div 
                  key={trade.id} 
                  className={`trade-row trade-${trade.side} ${isLarge ? 'trade-large-block' : ''}`}
                >
                  <span className="trade-time">{trade.time}</span>
                  <span className="trade-price">{trade.price}</span>
                  <span className="trade-qty right-align">{trade.qty}</span>
                  <span className="trade-usd right-align font-bold">
                    ${parseInt(trade.usd).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
