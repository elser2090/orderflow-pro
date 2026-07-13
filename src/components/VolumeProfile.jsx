import React, { useMemo } from 'react';
import './VolumeProfile.css';

export default function VolumeProfile({ volumeProfile, currentPrice }) {
  const { profileRows, poc } = useMemo(() => {
    const keys = Object.keys(volumeProfile);
    if (keys.length === 0) return { profileRows: [], poc: null };

    // Find the max volume to scale widths (POC = Point of Control)
    let maxVol = 0;
    let pocPrice = null;

    const data = keys.map(priceStr => {
      const vol = volumeProfile[priceStr];
      if (vol > maxVol) {
        maxVol = vol;
        pocPrice = priceStr;
      }
      return { price: parseFloat(priceStr), vol, priceStr };
    });

    // Sort descending by price
    data.sort((a, b) => b.price - a.price);

    // Keep only the closest 30 buckets around the current price to avoid huge lists
    let filteredData = data;
    if (data.length > 30 && currentPrice) {
       // Find index closest to currentPrice
       const closestIdx = data.findIndex(d => d.price <= currentPrice);
       const start = Math.max(0, closestIdx - 15);
       const end = Math.min(data.length, start + 30);
       filteredData = data.slice(start, end);
    }

    const rows = filteredData.map(d => ({
      ...d,
      widthPct: (d.vol / maxVol) * 100,
      isPoc: d.priceStr === pocPrice
    }));

    return { profileRows: rows, poc: pocPrice };
  }, [volumeProfile, currentPrice]);

  return (
    <div className="volume-profile-panel">
      <div className="panel-header-mini">
        <h3>Volume Profile (POC)</h3>
      </div>
      
      <div className="vp-container">
        {profileRows.length === 0 ? (
          <div className="empty-state">Construyendo perfil...</div>
        ) : (
          <div className="vp-bars">
            {profileRows.map((row) => (
              <div 
                key={row.priceStr} 
                className={`vp-row ${row.isPoc ? 'vp-poc' : ''}`}
              >
                <span className="vp-price">{row.priceStr}</span>
                <div className="vp-bar-wrapper">
                  <div 
                    className="vp-bar-fill"
                    style={{ width: `${row.widthPct}%` }}
                  />
                  {row.isPoc && <span className="poc-label">POC</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
