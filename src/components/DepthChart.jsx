import React from 'react';
import './DepthChart.css';

export default function DepthChart({ data }) {
  const { bids, asks } = data;
  
  if (!bids.length || !asks.length) return null;

  // We map the cumulative totals to SVG points
  const maxBidTotal = parseFloat(bids[bids.length - 1].total);
  const maxAskTotal = parseFloat(asks[0].total);
  const maxTotal = Math.max(maxBidTotal, maxAskTotal) * 1.1; // 10% padding

  const width = 800;
  const height = 200;
  const halfWidth = width / 2;

  // Bids mapping (Left side, from center to left)
  // We want the highest price (center) to have the lowest total, extending left to highest total
  const bidPoints = bids.map((bid, i) => {
    // Reverse the visual layout: i=0 is highest bid price (closest to center)
    const x = halfWidth - (i / bids.length) * halfWidth; 
    const y = height - (parseFloat(bid.total) / maxTotal) * height;
    return `${x},${y}`;
  });
  
  const bidPath = `M ${halfWidth},${height} ` + 
                  bidPoints.join(' ') + 
                  ` L 0,${height} Z`;

  // Asks mapping (Right side, from center to right)
  // asks[asks.length-1] is the lowest ask price (closest to center)
  const askPoints = [...asks].reverse().map((ask, i) => {
    const x = halfWidth + (i / asks.length) * halfWidth;
    const y = height - (parseFloat(ask.total) / maxTotal) * height;
    return `${x},${y}`;
  });

  const askPath = `M ${halfWidth},${height} ` + 
                  askPoints.join(' ') + 
                  ` L ${width},${height} Z`;

  return (
    <div className="depth-chart-container">
      <div className="depth-header">
        <h3>Market Depth</h3>
      </div>
      <div className="svg-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(14, 203, 129, 0.4)" />
              <stop offset="100%" stopColor="rgba(14, 203, 129, 0.05)" />
            </linearGradient>
            <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(246, 70, 93, 0.4)" />
              <stop offset="100%" stopColor="rgba(246, 70, 93, 0.05)" />
            </linearGradient>
          </defs>
          
          <polygon 
            points={bidPath} 
            fill="url(#bidGrad)" 
            stroke="var(--color-buy)" 
            strokeWidth="2"
            className="depth-polygon"
          />
          
          <polygon 
            points={askPath} 
            fill="url(#askGrad)" 
            stroke="var(--color-sell)" 
            strokeWidth="2"
            className="depth-polygon"
          />
        </svg>
      </div>
    </div>
  );
}
