import React from 'react';
import './OrderBook.css';

export default function OrderBook({ data }) {
  const { bids, asks } = data;

  // Find max total volume for scaling the depth bars
  let maxVolume = 0;
  if (bids.length > 0 && asks.length > 0) {
    const maxBid = parseFloat(bids[bids.length - 1].total);
    const maxAsk = parseFloat(asks[0].total); // Asks total accumulates from bottom up, so max is at index 0
    maxVolume = Math.max(maxBid, maxAsk);
  }

  return (
    <div className="order-book">
      <div className="ob-header">
        <span className="ob-col">Demanda (Volume)</span>
        <span className="ob-col center">Precio (USDT)</span>
        <span className="ob-col right">Oferta (Volume)</span>
      </div>

      <div className="ob-body">
        {/* Asks (Ventas) - Shown in red, typically upper half but in Binance mobile they are right side or top. In the screenshot, bids are left, asks are right. */}
        <div className="ob-side bids-side">
          {bids.map((bid, index) => {
            const depthPercentage = (parseFloat(bid.total) / maxVolume) * 100;
            return (
              <div key={`bid-${index}`} className="ob-row">
                <div 
                  className="ob-depth-bar bid-bar" 
                  style={{ width: `${depthPercentage}%` }} 
                />
                <span className="ob-val text-primary vol-col">{bid.total}</span>
                <span className="ob-val text-buy price-col">{bid.price}</span>
              </div>
            );
          })}
        </div>

        <div className="ob-side asks-side">
          {asks.map((ask, index) => {
            const depthPercentage = (parseFloat(ask.total) / maxVolume) * 100;
            return (
              <div key={`ask-${index}`} className="ob-row">
                <div 
                  className="ob-depth-bar ask-bar" 
                  style={{ width: `${depthPercentage}%` }} 
                />
                <span className="ob-val text-sell price-col">{ask.price}</span>
                <span className="ob-val text-primary right vol-col">{ask.total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
