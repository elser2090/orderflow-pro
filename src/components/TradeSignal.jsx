import React, { useMemo } from 'react';
import './TradeSignal.css';

function computeSignal({ stats, momentum, cvdHistory, supportPrice, resistancePrice, tapeSpeed, nearDepth }) {
  let score = 0;
  const factors = [];
  
  const bp = parseFloat(stats.buyPressure) || 50;
  const sp = parseFloat(stats.sellPressure) || 50;
  const imb = parseFloat(stats.bookImbalance) || 0;
  
  // Order book pressure
  if (bp > 60) { score += 20; factors.push({ icon: '📊', text: `Presión compradora ${bp.toFixed(0)}%`, type: 'bull' }); }
  else if (sp > 60) { score -= 20; factors.push({ icon: '📊', text: `Presión vendedora ${sp.toFixed(0)}%`, type: 'bear' }); }
  
  // Momentum
  if (momentum > 65) { score += 20; factors.push({ icon: '⚡', text: `Momentum comprador: ${momentum.toFixed(0)}%`, type: 'bull' }); }
  else if (momentum < 35) { score -= 20; factors.push({ icon: '⚡', text: `Momentum vendedor: ${(100-momentum).toFixed(0)}%`, type: 'bear' }); }
  
  // CVD trend
  if (cvdHistory.length >= 10) {
    const recent = cvdHistory.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    if (last > first * 1.001) { score += 15; factors.push({ icon: '📈', text: 'CVD en tendencia alcista', type: 'bull' }); }
    else if (last < first * 0.999) { score -= 15; factors.push({ icon: '📉', text: 'CVD en tendencia bajista', type: 'bear' }); }
  }
  
  // Book imbalance
  if (imb > 20) { score += 15; factors.push({ icon: '🐂', text: `Libro desbalanceado +${imb.toFixed(0)}% compra`, type: 'bull' }); }
  else if (imb < -20) { score -= 15; factors.push({ icon: '🐻', text: `Libro desbalanceado ${imb.toFixed(0)}% venta`, type: 'bear' }); }
  
  // Support/Resistance
  if (supportPrice) { score += 10; factors.push({ icon: '🛡️', text: `Soporte detectado: ${supportPrice}`, type: 'bull' }); }
  if (resistancePrice) { score -= 10; factors.push({ icon: '🪧', text: `Resistencia detectada: ${resistancePrice}`, type: 'bear' }); }
  
  // Tape speed with context
  if (tapeSpeed > 10 && momentum > 55) { score += 10; factors.push({ icon: '🔥', text: `Flujo agresivo de compra (${tapeSpeed} ops/s)`, type: 'bull' }); }
  else if (tapeSpeed > 10 && momentum < 45) { score -= 10; factors.push({ icon: '🔥', text: `Flujo agresivo de venta (${tapeSpeed} ops/s)`, type: 'bear' }); }
  
  // Near depth
  const t05 = (nearDepth.bids05 + nearDepth.asks05) || 1;
  const bidRatio05 = nearDepth.bids05 / t05;
  if (bidRatio05 > 0.65) { score += 10; factors.push({ icon: '🟢', text: 'Liquidez inmediata favorece compra', type: 'bull' }); }
  else if (bidRatio05 < 0.35) { score -= 10; factors.push({ icon: '🔴', text: 'Liquidez inmediata favorece venta', type: 'bear' }); }
  
  // Clamp score
  score = Math.max(-100, Math.min(100, score));
  
  let signal, signalColor, signalBg;
  if (score >= 40) { signal = 'COMPRA FUERTE'; signalColor = '#0ecb81'; signalBg = 'rgba(14, 203, 129, 0.15)'; }
  else if (score >= 15) { signal = 'COMPRA'; signalColor = '#0ecb81'; signalBg = 'rgba(14, 203, 129, 0.08)'; }
  else if (score <= -40) { signal = 'VENTA FUERTE'; signalColor = '#f6465d'; signalBg = 'rgba(246, 70, 93, 0.15)'; }
  else if (score <= -15) { signal = 'VENTA'; signalColor = '#f6465d'; signalBg = 'rgba(246, 70, 93, 0.08)'; }
  else { signal = 'NEUTRAL'; signalColor = '#848E9C'; signalBg = 'rgba(132, 142, 156, 0.08)'; }
  
  const confidence = Math.abs(score);
  
  return { signal, score, confidence, signalColor, signalBg, factors };
}

export default function TradeSignal({ stats, momentum, cvdHistory, supportPrice, resistancePrice, tapeSpeed, nearDepth, currentPrice, symbol }) {
  const { signal, score, confidence, signalColor, signalBg, factors } = useMemo(
    () => computeSignal({ stats, momentum, cvdHistory, supportPrice, resistancePrice, tapeSpeed, nearDepth }),
    [stats, momentum, cvdHistory, supportPrice, resistancePrice, tapeSpeed, nearDepth]
  );

  // Determine confirmation zones
  const entryZone = useMemo(() => {
    if (score > 0 && supportPrice) {
      return { entry: `Cerca de soporte: $${parseFloat(supportPrice).toLocaleString()}`, stopLoss: `Por debajo de: $${(parseFloat(supportPrice) * 0.995).toLocaleString()}`, takeProfit: resistancePrice ? `Objetivo: $${parseFloat(resistancePrice).toLocaleString()}` : 'Esperando resistencia...' };
    } else if (score < 0 && resistancePrice) {
      return { entry: `Cerca de resistencia: $${parseFloat(resistancePrice).toLocaleString()}`, stopLoss: `Por encima de: $${(parseFloat(resistancePrice) * 1.005).toLocaleString()}`, takeProfit: supportPrice ? `Objetivo: $${parseFloat(supportPrice).toLocaleString()}` : 'Esperando soporte...' };
    }
    return null;
  }, [score, supportPrice, resistancePrice]);

  return (
    <div className="trade-signal-panel" style={{ borderColor: signalColor }}>
      <div className="ts-header">
        <h3>Señal de Trading</h3>
        <span className="ts-symbol">{symbol}</span>
      </div>
      
      <div className="ts-signal-badge" style={{ background: signalBg, color: signalColor, boxShadow: `0 0 20px ${signalColor}33` }}>
        <span className="ts-signal-text">{signal}</span>
        <span className="ts-score">{score > 0 ? '+' : ''}{score}</span>
      </div>
      
      <div className="ts-confidence">
        <div className="ts-confidence-label">
          <span>Confianza</span>
          <span style={{ color: signalColor }}>{confidence}%</span>
        </div>
        <div className="ts-confidence-bar">
          <div className="ts-confidence-fill" style={{ width: `${confidence}%`, backgroundColor: signalColor }} />
        </div>
      </div>

      {/* Confirmation Zone */}
      <div className="ts-zones">
        <h4>Zona de Confirmación</h4>
        {entryZone ? (
          <div className="ts-zone-grid">
            <div className="ts-zone-item">
              <span className="ts-zone-label">🎯 Entrada</span>
              <span className="ts-zone-value">{entryZone.entry}</span>
            </div>
            <div className="ts-zone-item">
              <span className="ts-zone-label">🛑 Stop Loss</span>
              <span className="ts-zone-value ts-zone-danger">{entryZone.stopLoss}</span>
            </div>
            <div className="ts-zone-item">
              <span className="ts-zone-label">🏆 Take Profit</span>
              <span className="ts-zone-value ts-zone-profit">{entryZone.takeProfit}</span>
            </div>
          </div>
        ) : (
          <div className="ts-zone-waiting">
            <span>⏳</span>
            <p>Esperando niveles de confirmación...</p>
            <p className="ts-zone-sub">Se necesitan muros de soporte/resistencia en el libro de órdenes.</p>
          </div>
        )}
      </div>

      {/* Factors */}
      {factors.length > 0 && (
        <div className="ts-factors">
          <h4>Factores ({factors.filter(f => f.type === 'bull').length} alcistas, {factors.filter(f => f.type === 'bear').length} bajistas)</h4>
          <div className="ts-factor-list">
            {factors.map((f, i) => (
              <div key={i} className={`ts-factor ts-factor-${f.type}`}>
                <span className="ts-factor-icon">{f.icon}</span>
                <span className="ts-factor-text">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
