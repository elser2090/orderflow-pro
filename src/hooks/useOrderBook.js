import { useState, useEffect, useRef } from 'react';

export function useOrderBook(symbol = 'BTCUSDT') {
  // Estados para UI
  const [data, setData] = useState({ bids: [], asks: [] });
  const [stats, setStats] = useState({ buyPressure: 50, sellPressure: 50 });
  const [insights, setInsights] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  // Nuevos estados profesionales
  const [supportPrice, setSupportPrice] = useState(null);
  const [resistancePrice, setResistancePrice] = useState(null);
  const [momentum, setMomentum] = useState(50);
  
  // Estados de la suite analítica avanzada
  const [cvdHistory, setCvdHistory] = useState([]);
  const [tapeSpeed, setTapeSpeed] = useState(0);
  const [nearDepth, setNearDepth] = useState({
    bids05: 0, asks05: 0,
    bids10: 0, asks10: 0
  });
  const [recentTrades, setRecentTrades] = useState([]);

  // Referencias para optimización y cálculo interno
  const previousWallsRef = useRef({ bidWall: null, askWall: null });
  const activeAlertsRef = useRef([]);
  const latestDataRef = useRef(null);
  
  // Referencias para Whale Detection y CVD
  const recentTradesRef = useRef([]);
  const momentumWindowRef = useRef([]);
  const runningCvdRef = useRef(0);
  const cvdHistoryRef = useRef([]);
  const tradeTimestampsRef = useRef([]);
  const recentTradesFeedRef = useRef([]);

  useEffect(() => {
    let wsDepth = null;
    let wsTrade = null;
    let uiUpdateInterval = null;

    // Reset state on symbol change
    setData({ bids: [], asks: [] });
    setStats({ buyPressure: 50, sellPressure: 50 });
    setInsights([]);
    setHistory([]);
    setCurrentPrice(0);
    setIsConnected(false);
    setSupportPrice(null);
    setResistancePrice(null);
    setMomentum(50);
    setCvdHistory([]);
    setTapeSpeed(0);
    setNearDepth({ bids05: 0, asks05: 0, bids10: 0, asks10: 0 });
    setRecentTrades([]);
    
    activeAlertsRef.current = [];
    previousWallsRef.current = { bidWall: null, askWall: null };
    latestDataRef.current = null;
    recentTradesRef.current = [];
    momentumWindowRef.current = [];
    runningCvdRef.current = 0;
    cvdHistoryRef.current = Array(50).fill(0);
    tradeTimestampsRef.current = [];
    recentTradesFeedRef.current = [];

    // Bucle de actualización visual optimizado (4 veces por segundo)
    uiUpdateInterval = setInterval(() => {
      if (latestDataRef.current) {
        const { 
          newData, newStats, newInsights, newPrice, 
          newSupport, newResistance, newMomentum,
          newNearDepth, newCvdHistory, newTapeSpeed, newRecentTrades
        } = latestDataRef.current;
        
        setData(newData);
        setStats(newStats);
        setInsights(newInsights);
        setCurrentPrice(newPrice);
        setSupportPrice(newSupport);
        setResistancePrice(newResistance);
        setMomentum(newMomentum);
        setNearDepth(newNearDepth);
        setCvdHistory(newCvdHistory);
        setTapeSpeed(newTapeSpeed);
        setRecentTrades(newRecentTrades);
      }
    }, 250);

    const addHistoryEvent = (event) => {
      setHistory(prev => {
        // Evitar spam del mismo evento en 5 segundos
        const isDuplicate = prev.some(e => e.id === event.id && (Date.now() - e.timestamp < 5000));
        if (isDuplicate) return prev;
        const newHistory = [{ ...event, timestamp: Date.now() }, ...prev];
        return newHistory.slice(0, 50); // Max 50
      });
    };

    const processData = (responseBids, responseAsks) => {
      let tBid = 0;
      let maxBidAmount = 0;
      let bidWallPriceStr = "";
      
      const newBids = responseBids.map(b => {
        const price = parseFloat(b[0]);
        const amount = parseFloat(b[1]);
        tBid += amount;
        
        if (amount > maxBidAmount) {
          maxBidAmount = amount;
          bidWallPriceStr = price.toFixed(4);
        }
        
        return { 
          price: price.toFixed(4), 
          amount: amount.toFixed(3), 
          total: tBid.toFixed(3) 
        };
      });

      let tAsk = 0;
      let maxAskAmount = 0;
      let askWallPriceStr = "";
      
      const reversedAsks = [...responseAsks].reverse();
      const newAsks = reversedAsks.map(a => {
        const price = parseFloat(a[0]);
        const amount = parseFloat(a[1]);
        
        if (amount > maxAskAmount) {
          maxAskAmount = amount;
          askWallPriceStr = price.toFixed(4);
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

      // Ratios de Profundidad Cercana (0.5% y 1.0%)
      let bids05 = 0, bids10 = 0;
      responseBids.forEach(b => {
        const price = parseFloat(b[0]);
        const amount = parseFloat(b[1]);
        if (price >= livePrice * 0.995) bids05 += amount;
        if (price >= livePrice * 0.990) bids10 += amount;
      });

      let asks05 = 0, asks10 = 0;
      responseAsks.forEach(a => {
        const price = parseFloat(a[0]);
        const amount = parseFloat(a[1]);
        if (price <= livePrice * 1.005) asks05 += amount;
        if (price <= livePrice * 1.010) asks10 += amount;
      });

      const newNearDepth = { bids05, asks05, bids10, asks10 };

      // ALGORITMOS DE INSIGHTS
      const currentInsights = [];
      const avgBidAmount = tBid / 20;
      const avgAskAmount = tAsk / 20;
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString();

      if (buyPressureNum > 65) {
        currentInsights.push({ id: 'imbalance', type: 'BUY_IMBALANCE', icon: '⚖️', title: 'Desequilibrio Compras', message: `Presión (${buyPressureNum.toFixed(1)}%)`, severity: 'medium' });
      } else if (sellPressureNum > 65) {
        currentInsights.push({ id: 'imbalance', type: 'SELL_IMBALANCE', icon: '⚖️', title: 'Desequilibrio Ventas', message: `Presión (${sellPressureNum.toFixed(1)}%)`, severity: 'medium' });
      }

      let currentBidWall = null;
      let currentAskWall = null;

      if (maxBidAmount > avgBidAmount * 3.5 && maxBidAmount > 5) {
        currentBidWall = { price: parseFloat(bidWallPriceStr), amount: maxBidAmount };
        currentInsights.push({ id: 'bid_wall', type: 'BUY_WALL', icon: '🛡️', title: 'Soporte Fuerte', message: `En ${bidWallPriceStr} vol: ${maxBidAmount.toFixed(1)}`, severity: 'high' });
      }

      if (maxAskAmount > avgAskAmount * 3.5 && maxAskAmount > 5) {
        currentAskWall = { price: parseFloat(askWallPriceStr), amount: maxAskAmount };
        currentInsights.push({ id: 'ask_wall', type: 'SELL_WALL', icon: '🧱', title: 'Resistencia Fuerte', message: `En ${askWallPriceStr} vol: ${maxAskAmount.toFixed(1)}`, severity: 'high' });
      }

      // Detección de Spoofing (Órdenes Fantasma)
      const prevWalls = previousWallsRef.current;
      
      if (prevWalls.bidWall && !currentBidWall) {
        if (livePrice > prevWalls.bidWall.price + (livePrice * 0.0005)) {
           const alert = { id: `spoof_bid`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Compras', message: `Muro cancelado en ${prevWalls.bidWall.price.toFixed(2)}`, severity: 'critical', time: timeStr };
           addHistoryEvent(alert);
        }
      }

      if (prevWalls.askWall && !currentAskWall) {
        if (livePrice > 0 && livePrice < prevWalls.askWall.price - (livePrice * 0.0005)) {
           const alert = { id: `spoof_ask`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Ventas', message: `Muro cancelado en ${prevWalls.askWall.price.toFixed(2)}`, severity: 'critical', time: timeStr };
           addHistoryEvent(alert);
        }
      }

      previousWallsRef.current = { bidWall: currentBidWall, askWall: currentAskWall };
      
      // Momentum calculation (0-100)
      const momWin = momentumWindowRef.current;
      let newMomentum = 50;
      if (momWin.length > 0) {
        const buyVol = momWin.filter(t => t.isBuyerMaker === false).reduce((acc, t) => acc + t.qty, 0);
        const sellVol = momWin.filter(t => t.isBuyerMaker === true).reduce((acc, t) => acc + t.qty, 0);
        const total = buyVol + sellVol;
        if (total > 0) {
          newMomentum = (buyVol / total) * 100;
        }
      }

      // Calculate SOT (Speed of Tape) in the last 1 second
      const oneSecAgo = now - 1000;
      tradeTimestampsRef.current = tradeTimestampsRef.current.filter(ts => ts > oneSecAgo);
      const newTapeSpeed = tradeTimestampsRef.current.length;

      // Update CVD history Sparkline
      cvdHistoryRef.current.push(runningCvdRef.current);
      if (cvdHistoryRef.current.length > 50) {
        cvdHistoryRef.current.shift();
      }
      
      const newInsightsList = [...currentInsights, ...activeAlertsRef.current.filter(a => a.expires > now)];

      latestDataRef.current = {
        newData: { bids: newBids, asks: newAsks },
        newStats,
        newInsights: newInsightsList,
        newPrice: livePrice,
        newSupport: currentBidWall ? bidWallPriceStr : null,
        newResistance: currentAskWall ? askWallPriceStr : null,
        newMomentum: newMomentum,
        newNearDepth,
        newCvdHistory: [...cvdHistoryRef.current],
        newTapeSpeed,
        newRecentTrades: [...recentTradesFeedRef.current]
      };
    };

    const processTrade = (trade) => {
      const price = parseFloat(trade.p);
      const qty = parseFloat(trade.q);
      const isBuyerMaker = trade.m; // true = SELL (hit bid), false = BUY (hit ask)
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString();

      // SOT metric
      tradeTimestampsRef.current.push(now);

      // CVD logic: buy adds, sell subtracts
      const tradeVolumeUsdt = qty * price;
      if (isBuyerMaker) {
        runningCvdRef.current -= tradeVolumeUsdt; // Market Sell
      } else {
        runningCvdRef.current += tradeVolumeUsdt; // Market Buy
      }

      // Live recent trades feed update
      const newTradeItem = {
        id: trade.a || Math.random(),
        price: price.toFixed(price < 100 ? 4 : 2),
        qty: qty.toFixed(qty < 1 ? 4 : 2),
        side: isBuyerMaker ? 'sell' : 'buy',
        time: timeStr.split(' ')[0], // only HH:MM:SS
        usd: tradeVolumeUsdt.toFixed(0)
      };
      
      recentTradesFeedRef.current.unshift(newTradeItem);
      if (recentTradesFeedRef.current.length > 25) {
        recentTradesFeedRef.current.pop();
      }

      // Update Momentum window
      momentumWindowRef.current.push({ qty, isBuyerMaker, time: now });
      momentumWindowRef.current = momentumWindowRef.current.filter(t => now - t.time < 5000);

      // Update average trade volume
      recentTradesRef.current.push(qty);
      if (recentTradesRef.current.length > 100) {
        recentTradesRef.current.shift();
      }
      
      if (recentTradesRef.current.length > 20) {
        const avgTradeQty = recentTradesRef.current.reduce((a, b) => a + b, 0) / recentTradesRef.current.length;
        
        // Whale Detection: > 500% of average AND > $10,000 USDT
        if (qty > avgTradeQty * 5 && tradeVolumeUsdt > 10000) {
          const type = isBuyerMaker ? "Venta" : "Compra";
          const icon = isBuyerMaker ? "🔴" : "🟢";
          const alert = {
            id: `whale_${trade.f}`,
            type: 'WHALE',
            icon: icon,
            title: `Ballena de ${type}`,
            message: `Ejecución: ${qty.toFixed(2)} a ${price.toFixed(2)} ($${tradeVolumeUsdt.toLocaleString()})`,
            severity: 'critical',
            time: timeStr
          };
          addHistoryEvent(alert);
        }
      }
    };

    // WebSocket para Profundidad (Order Book)
    wsDepth = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`);
    wsDepth.onopen = () => setIsConnected(true);
    wsDepth.onmessage = (event) => {
      const response = JSON.parse(event.data);
      const b = response.b || response.bids;
      const a = response.a || response.asks;
      if (b && a && b.length > 0 && a.length > 0) {
        processData(b, a);
      }
    };

    // WebSocket para Operaciones (AggTrades)
    wsTrade = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@aggTrade`);
    wsTrade.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.e === 'aggTrade') {
        processTrade(response);
      }
    };

    return () => {
      if (wsDepth) wsDepth.close();
      if (wsTrade) wsTrade.close();
      if (uiUpdateInterval) clearInterval(uiUpdateInterval);
    };
  }, [symbol]);

  return { 
    data, stats, insights, history, currentPrice, isConnected, 
    supportPrice, resistancePrice, momentum,
    cvdHistory, tapeSpeed, nearDepth, recentTrades
  };
}
