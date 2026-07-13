import React, { useMemo } from 'react';
import './WhaleBubbleChart.css';

export default function WhaleBubbleChart({ whaleTrades, currentPrice }) {
  const { bubbles, viewBox } = useMemo(() => {
    if (whaleTrades.length === 0) return { bubbles: [], viewBox: "0 0 400 200" };

    const width = 400;
    const height = 200;
    
    // Find price boundaries
    const prices = whaleTrades.map(t => t.price).concat([currentPrice]);
    const minPrice = Math.min(...prices) * 0.9995; // Add 0.05% padding
    const maxPrice = Math.max(...prices) * 1.0005;
    const priceRange = maxPrice - minPrice || 1;

    // Time boundaries (last 5 minutes or based on oldest trade)
    const now = Date.now();
    const oldestTime = Math.min(...whaleTrades.map(t => t.time));
    const timeRange = Math.max(now - oldestTime, 60000); // At least 1 minute range

    // Max volume for scaling
    const maxVol = Math.max(...whaleTrades.map(t => t.volumeUsdt)) || 1;

    const bubblesData = whaleTrades.map(trade => {
      const x = ((trade.time - oldestTime) / timeRange) * width;
      const y = height - ((trade.price - minPrice) / priceRange) * height;
      
      // Bubble radius based on relative volume (min 4px, max 25px)
      const radius = 4 + (Math.sqrt(trade.volumeUsdt / maxVol) * 21);
      
      return { ...trade, cx: x, cy: y, r: radius };
    });

    return { bubbles: bubblesData, viewBox: `0 0 ${width} ${height}` };
  }, [whaleTrades, currentPrice]);

  return (
    <div className="bubble-chart-panel">
      <div className="panel-header-mini">
        <h3>Radar de Ballenas (Bubble Chart)</h3>
      </div>
      
      <div className="bubble-canvas-container">
        {whaleTrades.length === 0 ? (
          <div className="empty-state">Esperando grandes operaciones...</div>
        ) : (
          <svg viewBox={viewBox} preserveAspectRatio="none" className="bubble-svg">
            {/* Draw current price line */}
            {bubbles.length > 0 && (
               <line 
                 x1="0" 
                 x2="400" 
                 y1={bubbles[bubbles.length-1].cy} 
                 y2={bubbles[bubbles.length-1].cy} 
                 stroke="var(--color-border)" 
                 strokeDasharray="4 4" 
               />
            )}
            
            {bubbles.map(b => (
              <circle
                key={b.id}
                cx={b.cx}
                cy={b.cy}
                r={b.r}
                fill={b.side === 'buy' ? 'var(--color-buy)' : 'var(--color-sell)'}
                fillOpacity="0.4"
                stroke={b.side === 'buy' ? 'var(--color-buy)' : 'var(--color-sell)'}
                strokeWidth="2"
                className="whale-bubble"
              >
                <title>{`${b.side === 'buy' ? 'COMPRA' : 'VENTA'} $${b.volumeUsdt.toLocaleString()} a ${b.price}`}</title>
              </circle>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
