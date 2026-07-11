import React from 'react';
import './AnalysisPanel.css';

export default function AnalysisPanel({ stats, symbol }) {
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

      <div className="ai-insights">
        <h3>AI Pattern Recognition</h3>
        <div className="insight-card">
          <span className="insight-icon">🔍</span>
          <div className="insight-text">
            <strong>Strong Buy Wall Detected</strong>
            <p>Significant liquidity concentrated at 145.00 USDT</p>
          </div>
        </div>
      </div>
    </div>
  );
}
