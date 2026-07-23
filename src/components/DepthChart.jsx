import React, { useMemo } from 'react';
import './DepthChart.css';

export default function DepthChart({ data }) {
  const { bids, asks } = data;
  
  // Use useMemo to avoid recalculating heavy SVG paths on every render unnecessarily
  const { bidPath, askPath, bidLine, askLine } = useMemo(() => {
    if (!bids || !asks || !bids.length || !asks.length) {
      return { bidPath: '', askPath: '', bidLine: '', askLine: '' };
    }

    const width = 800;
    const height = 250;
    const halfWidth = width / 2;

    const maxBidTotal = parseFloat(bids[bids.length - 1].total) || 0;
    const maxAskTotal = parseFloat(asks[0].total) || 0;
    const maxTotal = Math.max(maxBidTotal, maxAskTotal) * 1.05; // 5% padding
    
    // Si maxTotal es 0 (datos vacíos temporalmente), evitar NaN
    if (maxTotal === 0) return { bidPath: '', askPath: '', bidLine: '', askLine: '' };

    // Bids (Mitad izquierda)
    const bidPoints = bids.map((bid, i) => {
      const x = halfWidth - (i / Math.max(bids.length - 1, 1)) * halfWidth; 
      const y = height - (parseFloat(bid.total) / maxTotal) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    const bidPathStr = `M ${halfWidth},${height} ` + 
                       bidPoints.join(' L ') + 
                       ` L 0,${height} Z`;

    const bidLineStr = `M ${halfWidth},${height} L ` + bidPoints.join(' L ');

    // Asks (Mitad derecha)
    const reversedAsks = [...asks].reverse();
    const askPoints = reversedAsks.map((ask, i) => {
      const x = halfWidth + (i / Math.max(reversedAsks.length - 1, 1)) * halfWidth;
      const y = height - (parseFloat(ask.total) / maxTotal) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const askPathStr = `M ${halfWidth},${height} ` + 
                       askPoints.join(' L ') + 
                       ` L ${width},${height} Z`;

    const askLineStr = `M ${halfWidth},${height} L ` + askPoints.join(' L ');

    return { bidPath: bidPathStr, askPath: askPathStr, bidLine: bidLineStr, askLine: askLineStr };
  }, [bids, asks]);

  if (!bidPath) return (
     <div className="depth-chart-container">
       <div className="depth-header">
         <h3>Market Depth</h3>
       </div>
       <div className="svg-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
         Procesando datos del libro...
       </div>
     </div>
  );

  return (
    <div className="depth-chart-container">
      <div className="depth-header">
        <h3>Market Depth</h3>
      </div>
      <div className="svg-wrapper">
        <svg viewBox="0 0 800 250" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          {/* Bid Area */}
          <path 
            d={bidPath} 
            fill="rgba(14, 203, 129, 0.15)" 
          />
          {/* Bid Line */}
          <path
            d={bidLine}
            fill="none"
            stroke="var(--color-buy)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Ask Area */}
          <path 
            d={askPath} 
            fill="rgba(246, 70, 93, 0.15)" 
          />
          {/* Ask Line */}
          <path
            d={askLine}
            fill="none"
            stroke="var(--color-sell)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
