import React, { useMemo } from 'react';
import './AnalysisPanel.css';

export default function AnalysisPanel({ 
  stats, 
  symbol, 
  insights = [], 
  supportPrice, 
  resistancePrice, 
  momentum = 50,
  cvdHistory = [],
  tapeSpeed = 0,
  nearDepth = { bids05: 0, asks05: 0, bids10: 0, asks10: 0, bids20: 0, asks20: 0 }
}) {
  const { buyPressure, sellPressure } = stats;

  // 1. CVD Sparkline Calculation
  const { cvdPath, cvdDirectionColor } = useMemo(() => {
    if (cvdHistory.length < 2) return { cvdPath: '', cvdDirectionColor: 'var(--text-secondary)' };
    
    const width = 200;
    const height = 40;
    const min = Math.min(...cvdHistory);
    const max = Math.max(...cvdHistory);
    const range = max - min || 1;

    const points = cvdHistory.map((val, i) => {
      const x = (i / (cvdHistory.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4; // 4px padding
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Check direction (last vs first in history)
    const firstVal = cvdHistory[0];
    const lastVal = cvdHistory[cvdHistory.length - 1];
    const color = lastVal >= firstVal ? 'var(--color-buy)' : 'var(--color-sell)';

    return {
      cvdPath: `M ${points.join(' L ')}`,
      cvdDirectionColor: color
    };
  }, [cvdHistory]);

  // 2. Speed of Tape (SOT) Status
  const { tapeStatus, tapeColor, tapePct } = useMemo(() => {
    // Normalizing tape speed (0 to 30 trades/sec max for visual representation)
    const maxSpeed = 30;
    const pct = Math.min((tapeSpeed / maxSpeed) * 100, 100);
    
    let status = 'Baja';
    let color = 'var(--text-secondary)';
    if (tapeSpeed > 15) {
      status = 'Extrema 🔥';
      color = 'var(--color-sell)';
    } else if (tapeSpeed > 6) {
      status = 'Alta ⚡';
      color = 'var(--color-highlight)';
    } else if (tapeSpeed > 2) {
      status = 'Normal';
      color = 'var(--color-buy)';
    }
    return { tapeStatus: status, tapeColor: color, tapePct: pct };
  }, [tapeSpeed]);

  // 3. Near-Depth Ratios
  const depthRatios = useMemo(() => {
    const t05 = nearDepth.bids05 + nearDepth.asks05 || 1;
    const t10 = nearDepth.bids10 + nearDepth.asks10 || 1;
    const t20 = nearDepth.bids20 + nearDepth.asks20 || 1;

    return {
      b05Pct: ((nearDepth.bids05 / t05) * 100).toFixed(0),
      a05Pct: ((nearDepth.asks05 / t05) * 100).toFixed(0),
      b10Pct: ((nearDepth.bids10 / t10) * 100).toFixed(0),
      a10Pct: ((nearDepth.asks10 / t10) * 100).toFixed(0),
      b20Pct: ((nearDepth.bids20 / t20) * 100).toFixed(0),
      a20Pct: ((nearDepth.asks20 / t20) * 100).toFixed(0),
    };
  }, [nearDepth]);

  return (
    <div className="analysis-panel">
      <div className="panel-header">
        <div className="symbol-info">
          <h2>{symbol}</h2>
          <span className="badge">Binance Futures</span>
        </div>
        <div className="live-indicator">
          <span className="dot pulse"></span>
          Live
        </div>
      </div>
      
      {/* 1. Limit Pressure */}
      <div className="pressure-container">
        <div className="metrics-label-row">
          <span>Presión Libro Completo</span>
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

      {/* 2. Ratios de Profundidad Cercana */}
      <div className="near-depth-container">
        <div className="metrics-label-row">
          <span>Presión de Liquidez Inmediata</span>
        </div>
        <div className="depth-ratio-row">
          <span className="ratio-label">Rango 0.5%</span>
          <div className="ratio-bar-bg">
            <div className="ratio-bar-bids" style={{ width: `${depthRatios.b05Pct}%` }}>{depthRatios.b05Pct}%</div>
            <div className="ratio-bar-asks" style={{ width: `${depthRatios.a05Pct}%` }}>{depthRatios.a05Pct}%</div>
          </div>
        </div>
        <div className="depth-ratio-row" style={{ marginTop: '6px' }}>
          <span className="ratio-label">Rango 1.0%</span>
          <div className="ratio-bar-bg">
            <div className="ratio-bar-bids" style={{ width: `${depthRatios.b10Pct}%` }}>{depthRatios.b10Pct}%</div>
            <div className="ratio-bar-asks" style={{ width: `${depthRatios.a10Pct}%` }}>{depthRatios.a10Pct}%</div>
          </div>
        </div>
        <div className="depth-ratio-row" style={{ marginTop: '6px' }}>
          <span className="ratio-label">Rango 2.0%</span>
          <div className="ratio-bar-bg">
            <div className="ratio-bar-bids" style={{ width: `${depthRatios.b20Pct}%` }}>{depthRatios.b20Pct}%</div>
            <div className="ratio-bar-asks" style={{ width: `${depthRatios.a20Pct}%` }}>{depthRatios.a20Pct}%</div>
          </div>
        </div>
      </div>

      {/* 3. Momentum & CVD Sparkline */}
      <div className="momentum-cvd-grid">
        <div className="momentum-container">
          <div className="metrics-label-row">
            <span>Momentum de Flujo</span>
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

        <div className="cvd-container">
          <div className="metrics-label-row">
            <span>CVD Sparkline (Neta)</span>
          </div>
          <div className="cvd-sparkline-box">
            {cvdPath ? (
              <svg viewBox="0 0 200 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <path
                  d={cvdPath}
                  fill="none"
                  stroke={cvdDirectionColor}
                  strokeWidth="2"
                />
              </svg>
            ) : (
              <span className="cvd-loading">Inicializando Delta...</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Speed of Tape (SOT) */}
      <div className="sot-container">
        <div className="metrics-label-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Velocidad de Operación (SOT)</span>
          <span style={{ color: tapeColor, fontWeight: 700 }}>{tapeStatus}</span>
        </div>
        <div className="sot-bar-bg">
          <div 
            className="sot-bar-fill" 
            style={{ 
              width: `${tapePct}%`, 
              backgroundColor: tapeColor 
            }}
          />
        </div>
        <div className="sot-info-row">
          <span>{tapeSpeed} trades/seg</span>
        </div>
      </div>

      {/* 5. Key Levels */}
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

      {/* 6. AI Insights */}
      <div className="ai-insights">
        <h3>Análisis en Tiempo Real</h3>
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
              <div key={insight.id} className={`insight-card insight-${insight.type || 'neutral'}`}>
                <span className="insight-icon">{insight.icon}</span>
                <div className="insight-text">
                  <p>{insight.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
