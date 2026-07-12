import { useState, useEffect, useRef } from 'react';

export function useOrderBook(symbol = 'BTCUSDT') {
  // Estados para UI
  const [data, setData] = useState({ bids: [], asks: [] });
  const [stats, setStats] = useState({ buyPressure: 50, sellPressure: 50 });
  const [insights, setInsights] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  // Referencias para optimización y lógica interna
  const previousWallsRef = useRef({ bidWall: null, askWall: null });
  const activeAlertsRef = useRef([]);
  const latestDataRef = useRef(null);

  useEffect(() => {
    let ws = null;
    let uiUpdateInterval = null;

    // Reset state on symbol change
    setData({ bids: [], asks: [] });
    setStats({ buyPressure: 50, sellPressure: 50 });
    setInsights([]);
    setHistory([]);
    setCurrentPrice(0);
    setIsConnected(false);
    activeAlertsRef.current = [];
    previousWallsRef.current = { bidWall: null, askWall: null };
    latestDataRef.current = null;

    // Bucle de actualización visual optimizado (4 veces por segundo)
    uiUpdateInterval = setInterval(() => {
      if (latestDataRef.current) {
        const { newData, newStats, newInsights, newPrice } = latestDataRef.current;
        setData(newData);
        setStats(newStats);
        setInsights(newInsights);
        setCurrentPrice(newPrice);
      }
    }, 250);

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

      // Calcular precio en vivo (punto medio del spread)
      const bestBid = parseFloat(responseBids[0][0]);
      const bestAsk = parseFloat(responseAsks[0][0]);
      const livePrice = (bestBid + bestAsk) / 2;

      // Estadísticas
      const totalVolume = tBid + tAsk;
      const buyPressureNum = totalVolume > 0 ? (tBid / totalVolume) * 100 : 50;
      const sellPressureNum = totalVolume > 0 ? (tAsk / totalVolume) * 100 : 50;

      const newStats = {
        buyPressure: buyPressureNum.toFixed(2),
        sellPressure: sellPressureNum.toFixed(2)
      };

      // ALGORITMOS DE INSIGHTS
      const currentInsights = [];
      const newHistoryEvents = [];
      const avgBidAmount = tBid / 20;
      const avgAskAmount = tAsk / 20;
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString();

      if (buyPressureNum > 65) {
        currentInsights.push({ id: 'imbalance', type: 'BUY_IMBALANCE', icon: '⚖️', title: 'Desequilibrio de Compras', message: `Presión (${buyPressureNum.toFixed(1)}%)`, severity: 'medium' });
      } else if (sellPressureNum > 65) {
        currentInsights.push({ id: 'imbalance', type: 'SELL_IMBALANCE', icon: '⚖️', title: 'Desequilibrio de Ventas', message: `Presión (${sellPressureNum.toFixed(1)}%)`, severity: 'medium' });
      }

      let currentBidWall = null;
      let currentAskWall = null;

      if (maxBidAmount > avgBidAmount * 3.5 && maxBidAmount > 5) {
        currentBidWall = { price: bidWallPrice, amount: maxBidAmount };
        currentInsights.push({ id: 'bid_wall', type: 'BUY_WALL', icon: '🛡️', title: 'Muro de Compra', message: `En ${bidWallPrice.toFixed(2)} vol: ${maxBidAmount.toFixed(1)}`, severity: 'high' });
      }

      if (maxAskAmount > avgAskAmount * 3.5 && maxAskAmount > 5) {
        currentAskWall = { price: askWallPrice, amount: maxAskAmount };
        currentInsights.push({ id: 'ask_wall', type: 'SELL_WALL', icon: '🧱', title: 'Muro de Venta', message: `En ${askWallPrice.toFixed(2)} vol: ${maxAskAmount.toFixed(1)}`, severity: 'high' });
      }

      // Detección de Spoofing (Órdenes Fantasma)
      const prevWalls = previousWallsRef.current;
      
      if (prevWalls.bidWall && !currentBidWall) {
        if (livePrice > prevWalls.bidWall.price + (livePrice * 0.0005)) {
           const alert = { id: `spoof_${now}`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Compras', message: `Muro falso cancelado en ${prevWalls.bidWall.price.toFixed(2)}`, severity: 'critical', expires: now + 3000 };
           activeAlertsRef.current.push(alert);
           newHistoryEvents.push({ ...alert, time: timeStr });
        }
      }

      if (prevWalls.askWall && !currentAskWall) {
        if (livePrice > 0 && livePrice < prevWalls.askWall.price - (livePrice * 0.0005)) {
           const alert = { id: `spoof_${now}`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Ventas', message: `Muro falso cancelado en ${prevWalls.askWall.price.toFixed(2)}`, severity: 'critical', expires: now + 3000 };
           activeAlertsRef.current.push(alert);
           newHistoryEvents.push({ ...alert, time: timeStr });
        }
      }

      // Agregar a historial si hay nuevos spoofings o si apareció un muro gigante nuevo (para no inundar, solo muros nuevos)
      if (currentBidWall && (!prevWalls.bidWall || prevWalls.bidWall.price !== currentBidWall.price)) {
         newHistoryEvents.push({ id: `wall_${now}`, type: 'BUY_WALL', icon: '🛡️', title: 'Nuevo Muro de Compra', message: `${maxBidAmount.toFixed(1)} USDT en ${bidWallPrice.toFixed(2)}`, severity: 'high', time: timeStr });
      }
      if (currentAskWall && (!prevWalls.askWall || prevWalls.askWall.price !== currentAskWall.price)) {
         newHistoryEvents.push({ id: `wall_${now}`, type: 'SELL_WALL', icon: '🧱', title: 'Nuevo Muro de Venta', message: `${maxAskAmount.toFixed(1)} USDT en ${askWallPrice.toFixed(2)}`, severity: 'high', time: timeStr });
      }

      if (newHistoryEvents.length > 0) {
        setHistory(prev => [...newHistoryEvents, ...prev].slice(0, 50)); // Mantener máximo 50 eventos
      }

      previousWallsRef.current = { bidWall: currentBidWall, askWall: currentAskWall };
      activeAlertsRef.current = activeAlertsRef.current.filter(alert => alert.expires > now);
      
      const newInsightsList = [...currentInsights, ...activeAlertsRef.current];

      // Guardar en la referencia para el próximo tic visual
      latestDataRef.current = {
        newData: { bids: newBids, asks: newAsks },
        newStats,
        newInsights: newInsightsList,
        newPrice: livePrice
      };
    };

    // Conexión Real a Binance WebSocket (SPOT)
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`);

    ws.onopen = () => {
      console.log(`Conectado al stream de datos reales de Binance para ${symbol}`);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      const b = response.b || response.bids;
      const a = response.a || response.asks;
      if (b && a && b.length > 0 && a.length > 0) {
        processData(b, a);
      }
    };

    ws.onerror = (error) => {
      console.error('Error en WebSocket de Binance:', error);
    };

    return () => {
      if (ws) ws.close();
      if (uiUpdateInterval) clearInterval(uiUpdateInterval);
    };
  }, [symbol]);

  return { data, stats, insights, history, currentPrice, isConnected };
}
