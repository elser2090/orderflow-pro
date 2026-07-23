import React, { useState, useMemo } from 'react';
import './OrderBook.css';

function getPrecision(num) {
  const str = num.toString();
  const dotIndex = str.indexOf('.');
  return dotIndex === -1 ? 0 : str.length - dotIndex - 1;
}

function getGroupingOptions(price) {
  if (price > 10000) return [1, 5, 10, 50, 100];
  if (price > 1000) return [0.1, 1, 5, 10, 50];
  if (price > 100) return [0.01, 0.1, 1, 5, 10];
  if (price > 10) return [0.01, 0.1, 0.5, 1, 5];
  return [0.001, 0.01, 0.1, 0.5, 1];
}

function aggregateOrders(orders, groupSize, side) {
  if (!orders || orders.length === 0) return [];
  
  const groups = new Map();
  const precision = getPrecision(groupSize);
  
  orders.forEach(order => {
    const price = parseFloat(order.price);
    const amount = parseFloat(order.amount);
    
    let groupedPrice;
    if (side === 'bid') {
      groupedPrice = Math.floor(price / groupSize) * groupSize;
    } else {
      groupedPrice = Math.ceil(price / groupSize) * groupSize;
    }
    
    const key = groupedPrice.toFixed(precision);
    const existing = groups.get(key) || 0;
    groups.set(key, existing + amount);
  });
  
  let result = Array.from(groups.entries()).map(([price, amount]) => ({
    price,
    amount: amount.toFixed(3),
    total: '0'
  }));
  
  if (side === 'bid') {
    result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  } else {
    result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  }
  
  let cumTotal = 0;
  for (let i = 0; i < result.length; i++) {
    cumTotal += parseFloat(result[i].amount);
    result[i].total = cumTotal.toFixed(3);
  }
  
  return result;
}

export default function OrderBook({ data, supportPrice, resistancePrice }) {
  const { bids, asks } = data;
  
  const midPrice = bids.length > 0 ? parseFloat(bids[0].price) : 0;
  const priceRange = midPrice > 10000 ? 'xl' : midPrice > 1000 ? 'l' : midPrice > 100 ? 'm' : midPrice > 10 ? 's' : 'xs';
  const groupingOptions = useMemo(() => getGroupingOptions(midPrice), [priceRange]);
  
  const [groupIndex, setGroupIndex] = useState(2);
  const safeGroupIndex = Math.min(groupIndex, groupingOptions.length - 1);
  const groupSize = groupingOptions[safeGroupIndex];
  
  const groupedBids = useMemo(() => aggregateOrders(bids, groupSize, 'bid'), [bids, groupSize]);
  const groupedAsks = useMemo(() => aggregateOrders(asks, groupSize, 'ask'), [asks, groupSize]);
  
  let maxVolume = 0;
  if (groupedBids.length > 0 && groupedAsks.length > 0) {
    const maxBid = parseFloat(groupedBids[groupedBids.length - 1].total);
    const maxAsk = parseFloat(groupedAsks[groupedAsks.length - 1].total);
    maxVolume = Math.max(maxBid, maxAsk);
  }

  return (
    <div className="order-book">
      <div className="ob-header">
        <span className="ob-title">Libro de Órdenes</span>
        <div className="ob-grouping">
          {groupingOptions.map((opt, i) => (
            <button
              key={opt}
              className={`ob-group-btn ${i === safeGroupIndex ? 'active' : ''}`}
              onClick={() => setGroupIndex(i)}
              title={`Agrupar cada ${opt}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-col-headers">
        <span className="ob-col">Vol. Total</span>
        <span className="ob-col center">Precio (USDT)</span>
        <span className="ob-col right">Vol. Total</span>
      </div>

      <div className="ob-body">
        <div className="ob-side bids-side">
          {groupedBids.map((bid) => {
            const depthPercentage = maxVolume > 0 ? (parseFloat(bid.total) / maxVolume) * 100 : 0;
            const isSupport = supportPrice && Math.abs(parseFloat(bid.price) - parseFloat(supportPrice)) < groupSize;
            return (
              <div key={`bid-${bid.price}`} className={`ob-row ${isSupport ? 'support-detected' : ''}`}>
                <div className="ob-depth-bar bid-bar" style={{ width: `${depthPercentage}%` }} />
                <span className="ob-val text-primary vol-col">{bid.total}</span>
                <span className="ob-val text-buy price-col">{bid.price}</span>
              </div>
            );
          })}
        </div>

        <div className="ob-side asks-side">
          {groupedAsks.map((ask) => {
            const depthPercentage = maxVolume > 0 ? (parseFloat(ask.total) / maxVolume) * 100 : 0;
            const isResistance = resistancePrice && Math.abs(parseFloat(ask.price) - parseFloat(resistancePrice)) < groupSize;
            return (
              <div key={`ask-${ask.price}`} className={`ob-row ${isResistance ? 'resistance-detected' : ''}`}>
                <div className="ob-depth-bar ask-bar" style={{ width: `${depthPercentage}%` }} />
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
