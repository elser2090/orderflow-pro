import { useState, useEffect, useRef } from 'react';

export function useOrderBook(symbol = 'BTCUSDT') {
  const [data, setData] = useState({ bids: [], asks: [] });
  const [stats, setStats] = useState({ buyPressure: 50, sellPressure: 50 });
  const [insights, setInsights] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const previousWallsRef = useRef({ bidWall: null, askWall: null });
  const activeAlertsRef = useRef([]);

  useEffect(() => {
    let ws = null;
    let mockInterval = null;

    // Reset state on symbol change
    setData({ bids: [], asks: [] });
    setStats({ buyPressure: 50, sellPressure: 50 });
    setInsights([]);
    setIsConnected(false);
    activeAlertsRef.current = [];
    previousWallsRef.current = { bidWall: null, askWall: null };

    const processData = (responseBids, responseAsks) => {
      let tBid = 0;
      let maxBidAmount = 0;
      let bidWallPrice = 0;
      
      const newBids = responseBids.map(b => {
        const price = parseFloat(b[0]);
        const amount = parseFloat(b[1]);
        tBid += amount;
        
        if (amount > maxBidAmount) {
          maxBidAmount = amount;
          bidWallPrice = price;
        }
        
        return { 
          price: price.toFixed(4), 
          amount: amount.toFixed(3), 
          total: tBid.toFixed(3) 
        };
      });

      let tAsk = 0;
      let maxAskAmount = 0;
      let askWallPrice = 0;
      
      const reversedAsks = [...responseAsks].reverse();
      const newAsks = reversedAsks.map(a => {
        const price = parseFloat(a[0]);
        const amount = parseFloat(a[1]);
        
        if (amount > maxAskAmount) {
          maxAskAmount = amount;
          askWallPrice = price;
        }
        
        return {
          price: price.toFixed(4),
          amount: amount.toFixed(3),
          total: '0'
        }
      });

      for(let i = newAsks.length - 1; i >= 0; i--) {
          tAsk += parseFloat(newAsks[i].amount);
          newAsks[i].total = tAsk.toFixed(3);
      }

      setData({ bids: newBids, asks: newAsks });

      const totalVolume = tBid + tAsk;
      const buyPressureNum = totalVolume > 0 ? (tBid / totalVolume) * 100 : 50;
      const sellPressureNum = totalVolume > 0 ? (tAsk / totalVolume) * 100 : 50;

      setStats({
        buyPressure: buyPressureNum.toFixed(2),
        sellPressure: sellPressureNum.toFixed(2)
      });

      const currentInsights = [];
      const avgBidAmount = tBid / 20;
      const avgAskAmount = tAsk / 20;

      if (buyPressureNum > 65) {
        currentInsights.push({ id: 'imbalance', type: 'BUY_IMBALANCE', icon: '⚖️', title: 'Desequilibrio de Compras', message: `Fuerte presión compradora (${buyPressureNum.toFixed(1)}%). Posible subida.`, severity: 'medium' });
      } else if (sellPressureNum > 65) {
        currentInsights.push({ id: 'imbalance', type: 'SELL_IMBALANCE', icon: '⚖️', title: 'Desequilibrio de Ventas', message: `Fuerte presión vendedora (${sellPressureNum.toFixed(1)}%). Posible caída.`, severity: 'medium' });
      }

      let currentBidWall = null;
      let currentAskWall = null;

      if (maxBidAmount > avgBidAmount * 3.5 && maxBidAmount > 5) {
        currentBidWall = { price: bidWallPrice, amount: maxBidAmount };
        currentInsights.push({ id: 'bid_wall', type: 'BUY_WALL', icon: '🛡️', title: 'Fuerte Barrera de Compra', message: `Muro detectado en ${bidWallPrice.toFixed(2)} con ${maxBidAmount.toFixed(1)} vol.`, severity: 'high' });
      }

      if (maxAskAmount > avgAskAmount * 3.5 && maxAskAmount > 5) {
        currentAskWall = { price: askWallPrice, amount: maxAskAmount };
        currentInsights.push({ id: 'ask_wall', type: 'SELL_WALL', icon: '🧱', title: 'Fuerte Barrera de Venta', message: `Muro detectado en ${askWallPrice.toFixed(2)} con ${maxAskAmount.toFixed(1)} vol.`, severity: 'high' });
      }

      const prevWalls = previousWallsRef.current;
      const now = Date.now();
      
      if (prevWalls.bidWall && !currentBidWall) {
        const currentPrice = responseBids[0] ? parseFloat(responseBids[0][0]) : 0;
        if (currentPrice > prevWalls.bidWall.price + (currentPrice * 0.0005)) {
           activeAlertsRef.current.push({ id: `spoof_${now}`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Detectado (Compras)', message: `Muro falso retirado abruptamente en ${prevWalls.bidWall.price.toFixed(2)}.`, severity: 'critical', expires: now + 3000 });
        }
      }

      if (prevWalls.askWall && !currentAskWall) {
        const currentPrice = responseAsks[0] ? parseFloat(responseAsks[0][0]) : 0;
        if (currentPrice > 0 && currentPrice < prevWalls.askWall.price - (currentPrice * 0.0005)) {
           activeAlertsRef.current.push({ id: `spoof_${now}`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Detectado (Ventas)', message: `Muro falso retirado abruptamente en ${prevWalls.askWall.price.toFixed(2)}.`, severity: 'critical', expires: now + 3000 });
        }
      }

      previousWallsRef.current = { bidWall: currentBidWall, askWall: currentAskWall };
      activeAlertsRef.current = activeAlertsRef.current.filter(alert => alert.expires > now);
      setInsights([...currentInsights, ...activeAlertsRef.current]);
    };

    if (symbol === 'SPCXUSDT') {
      // Mock Data Generator for SPCXUSDT
      setIsConnected(true);
      let basePrice = 145.75;
      mockInterval = setInterval(() => {
        // Randomly move base price slightly
        basePrice = basePrice + (Math.random() - 0.5) * 0.1;
        
        const mockBids = [];
        const mockAsks = [];
        
        // Randomly simulate a whale wall occasionally
        const whaleIndex = Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 5 : -1;
        
        for (let i = 0; i < 20; i++) {
          const bidPrice = basePrice - (i * 0.05) - 0.01;
          const bidAmount = i === whaleIndex ? Math.random() * 50 + 20 : Math.random() * 5 + 0.5;
          mockBids.push([bidPrice.toFixed(4), bidAmount.toFixed(3)]);
          
          const askPrice = basePrice + (i * 0.05) + 0.01;
          const askAmount = i === (whaleIndex === -1 && Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 5 : -1) ? Math.random() * 50 + 20 : Math.random() * 5 + 0.5;
          mockAsks.push([askPrice.toFixed(4), askAmount.toFixed(3)]);
        }
        processData(mockBids, mockAsks);
      }, 100);
      
    } else {
      // Real Binance WebSocket
      ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth20@100ms`);

      ws.onopen = () => {
        console.log(`Conectado al stream de datos reales de Binance para ${symbol}`);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        if (response.b && response.a) {
          processData(response.b, response.a);
        }
      };

      ws.onerror = (error) => {
        console.error('Error en WebSocket de Binance:', error);
      };
    }

    return () => {
      if (ws) ws.close();
      if (mockInterval) clearInterval(mockInterval);
    };
  }, [symbol]);

  return { data, stats, insights, isConnected };
}
