import React from 'react';
import './AnalysisPanel.css';

export default function AnalysisPanel({ stats, symbol, insights = [], supportPrice, resistancePrice, momentum = 50 }) {
  const { buyPressure, sellPressure } = stats;
  
  return (
    <div className="analysis-panel">
      <div className="panel-header">
        <div className="symbol-info">
          <h2>{symbol}</h2>
          <span className="badge">Perp.</span>
        </div>
        <div className="live-indicator">
          <span className="dot pulse"></span>
          Live Analysis
        </div>
      </div>
      
      <div className="pressure-container">
        <div className="metrics-label-row">
          <span>Presión Limit (Order Book)</span>
        </div>
        <div className="pressure-labels">
          <span className="text-buy">{buyPressure}%</span>
          <span className="text-sell">{sellPressure}%</span>
        </div>
        <div className="pressure-bar-bg">
          <div 
            className="pressure-bar-fill" 
            style={{ width: `${buyPressure}%` }}
          />
        </div>
      </div>

      <div className="momentum-container">
        <div className="metrics-label-row">
          <span>Aceleración Momentum (Market Trades)</span>
        </div>
        <div className="momentum-bar-bg">
          <div 
            className="momentum-bar-fill" 
            style={{ 
              width: `${momentum}%`,
              background: momentum > 55 ? 'var(--color-buy)' : momentum < 45 ? 'var(--color-sell)' : 'var(--text-secondary)'
            }}
          />
        </div>
      </div>

      <div className="key-levels-container">
        <div className="level-box support-box">
          <span className="level-title">Soporte Fuerte</span>
          <span className="level-price text-buy">{supportPrice || 'Escaneando...'}</span>
        </div>
        <div className="level-box resistance-box">
          <span className="level-title">Resistencia Fuerte</span>
          <span className="level-price text-sell">{resistancePrice || 'Escaneando...'}</span>
        </div>
      </div>

      <div className="ai-insights">
        <h3>AI Pattern Recognition</h3>
        {insights.length === 0 ? (
          <div className="insight-card empty-insight">
            <span className="insight-icon">⏳</span>
            <div className="insight-text">
              <strong>Escaneando el mercado...</strong>
              <p>Esperando a detectar patrones de liquidez o manipulaciones.</p>
            </div>
          </div>
        ) : (
          <div className="insights-list">
            {insights.map(insight => (
              <div key={insight.id} className={`insight-card severity-${insight.severity}`}>
                <span className="insight-icon">{insight.icon}</span>
                <div className="insight-text">
                  <strong>{insight.title}</strong>
                  <p>{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
