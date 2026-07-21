import { useState, useEffect, useRef } from 'react';

export function useOrderBook(symbol = 'BTCUSDT') {
  // Estados para UI
  const [data, setData] = useState({ bids: [], asks: [] });
  const [stats, setStats] = useState({ buyPressure: 50, sellPressure: 50 });
  const [insights, setInsights] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  
  // Estados profesionales
  const [supportPrice, setSupportPrice] = useState(null);
  const [resistancePrice, setResistancePrice] = useState(null);
  const [momentum, setMomentum] = useState(50);
  
  // Estados analíticos avanzados
  const [cvdHistory, setCvdHistory] = useState([]);
  const [tapeSpeed, setTapeSpeed] = useState(0);
  const [nearDepth, setNearDepth] = useState({ bids05: 0, asks05: 0, bids10: 0, asks10: 0 });
  const [recentTrades, setRecentTrades] = useState([]);

  // NUEVOS ESTADOS: Liquidaciones, Volume Profile, Whale Bubbles
  const [liquidations, setLiquidations] = useState([]);
  const [volumeProfile, setVolumeProfile] = useState({});
  const [whaleTrades, setWhaleTrades] = useState([]);

  // Referencias para optimización
  const previousWallsRef = useRef({ bidWall: null, askWall: null });
  const activeAlertsRef = useRef([]);
  const latestDataRef = useRef(null);
  
  // Referencias internas
  const recentTradesRef = useRef([]);
  const momentumWindowRef = useRef([]);
  const runningCvdRef = useRef(0);
  const cvdHistoryRef = useRef([]);
  const tradeTimestampsRef = useRef([]);
  const recentTradesFeedRef = useRef([]);
  
  // Nuevas Referencias Internas
  const liquidationsFeedRef = useRef([]);
  const volumeProfileRef = useRef({});
  const whaleTradesRef = useRef([]);

  useEffect(() => {
    let wsDepth = null;
    let wsTrade = null;
    let wsLiq = null;
    let uiUpdateInterval = null;

    // Reset state on symbol change
    setData({ bids: [], asks: [] });
    setStats({ buyPressure: 50, sellPressure: 50 });
    setInsights([]);
    setHistory([]);
    setCurrentPrice(0);
    setIsConnected(false);
    setConnectionError(false);
    setSupportPrice(null);
    setResistancePrice(null);
    setMomentum(50);
    setCvdHistory([]);
    setTapeSpeed(0);
    setNearDepth({ bids05: 0, asks05: 0, bids10: 0, asks10: 0 });
    setRecentTrades([]);
    setLiquidations([]);
    setVolumeProfile({});
    setWhaleTrades([]);
    
    activeAlertsRef.current = [];
    previousWallsRef.current = { bidWall: null, askWall: null };
    latestDataRef.current = null;
    recentTradesRef.current = [];
    momentumWindowRef.current = [];
    runningCvdRef.current = 0;
    cvdHistoryRef.current = Array(50).fill(0);
    tradeTimestampsRef.current = [];
    recentTradesFeedRef.current = [];
    liquidationsFeedRef.current = [];
    volumeProfileRef.current = {};
    whaleTradesRef.current = [];

    // Bucle de actualización visual optimizado
    uiUpdateInterval = setInterval(() => {
      if (latestDataRef.current) {
        const d = latestDataRef.current;
        setData(d.newData);
        setStats(d.newStats);
        setInsights(d.newInsights);
        setCurrentPrice(d.newPrice);
        setSupportPrice(d.newSupport);
        setResistancePrice(d.newResistance);
        setMomentum(d.newMomentum);
        setNearDepth(d.newNearDepth);
        setCvdHistory(d.newCvdHistory);
        setTapeSpeed(d.newTapeSpeed);
        setRecentTrades(d.newRecentTrades);
        setLiquidations(d.newLiquidations);
        setVolumeProfile(d.newVolumeProfile);
        setWhaleTrades(d.newWhaleTrades);
      }
    }, 250);

    const addHistoryEvent = (event) => {
      setHistory(prev => {
        const isDuplicate = prev.some(e => e.id === event.id && (Date.now() - e.timestamp < 5000));
        if (isDuplicate) return prev;
        return [{ ...event, timestamp: Date.now() }, ...prev].slice(0, 50);
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
        if (amount > maxBidAmount) { maxBidAmount = amount; bidWallPriceStr = price.toFixed(4); }
        return { price: price.toFixed(4), amount: amount.toFixed(3), total: tBid.toFixed(3) };
      });

      let tAsk = 0;
      let maxAskAmount = 0;
      let askWallPriceStr = "";
      
      const reversedAsks = [...responseAsks].reverse();
      const newAsks = reversedAsks.map(a => {
        const price = parseFloat(a[0]);
        const amount = parseFloat(a[1]);
        if (amount > maxAskAmount) { maxAskAmount = amount; askWallPriceStr = price.toFixed(4); }
        return { price: price.toFixed(4), amount: amount.toFixed(3), total: '0' };
      });

      for(let i = newAsks.length - 1; i >= 0; i--) {
          tAsk += parseFloat(newAsks[i].amount);
          newAsks[i].total = tAsk.toFixed(3);
      }

      const bestBid = parseFloat(responseBids[0][0]);
      const bestAsk = parseFloat(responseAsks[0][0]);
      const livePrice = (bestBid + bestAsk) / 2;

      const totalVolume = tBid + tAsk;
      const buyPressureNum = totalVolume > 0 ? (tBid / totalVolume) * 100 : 50;
      const sellPressureNum = totalVolume > 0 ? (tAsk / totalVolume) * 100 : 50;

      let bids05 = 0, bids10 = 0;
      responseBids.forEach(b => {
        const p = parseFloat(b[0]), a = parseFloat(b[1]);
        if (p >= livePrice * 0.995) bids05 += a;
        if (p >= livePrice * 0.990) bids10 += a;
      });

      let asks05 = 0, asks10 = 0;
      responseAsks.forEach(a => {
        const p = parseFloat(a[0]), am = parseFloat(a[1]);
        if (p <= livePrice * 1.005) asks05 += am;
        if (p <= livePrice * 1.010) asks10 += am;
      });

      const currentInsights = [];
      const avgBidAmount = tBid / 20;
      const avgAskAmount = tAsk / 20;
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString();

      let currentBidWall = null;
      let currentAskWall = null;

      if (maxBidAmount > avgBidAmount * 3.5 && maxBidAmount > 5) {
        currentBidWall = { price: parseFloat(bidWallPriceStr), amount: maxBidAmount };
      }

      if (maxAskAmount > avgAskAmount * 3.5 && maxAskAmount > 5) {
        currentAskWall = { price: parseFloat(askWallPriceStr), amount: maxAskAmount };
      }

      const prevWalls = previousWallsRef.current;
      if (prevWalls.bidWall && !currentBidWall && livePrice > prevWalls.bidWall.price + (livePrice * 0.0005)) {
         addHistoryEvent({ id: `spoof_bid`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Compras', message: `Muro cancelado en ${prevWalls.bidWall.price.toFixed(2)}`, severity: 'critical', time: timeStr });
      }

      if (prevWalls.askWall && !currentAskWall && livePrice > 0 && livePrice < prevWalls.askWall.price - (livePrice * 0.0005)) {
         addHistoryEvent({ id: `spoof_ask`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Ventas', message: `Muro cancelado en ${prevWalls.askWall.price.toFixed(2)}`, severity: 'critical', time: timeStr });
      }

      previousWallsRef.current = { bidWall: currentBidWall, askWall: currentAskWall };
      
      const momWin = momentumWindowRef.current;
      let newMomentum = 50;
      if (momWin.length > 0) {
        const buyVol = momWin.filter(t => t.isBuyerMaker === false).reduce((acc, t) => acc + t.qty, 0);
        const sellVol = momWin.filter(t => t.isBuyerMaker === true).reduce((acc, t) => acc + t.qty, 0);
        const total = buyVol + sellVol;
        if (total > 0) newMomentum = (buyVol / total) * 100;
      }

      const oneSecAgo = now - 1000;
      tradeTimestampsRef.current = tradeTimestampsRef.current.filter(ts => ts > oneSecAgo);
      
      cvdHistoryRef.current.push(runningCvdRef.current);
      if (cvdHistoryRef.current.length > 50) cvdHistoryRef.current.shift();

      latestDataRef.current = {
        newData: { bids: newBids, asks: newAsks },
        newStats: { buyPressure: buyPressureNum.toFixed(2), sellPressure: sellPressureNum.toFixed(2) },
        newInsights: [...currentInsights, ...activeAlertsRef.current.filter(a => a.expires > now)],
        newPrice: livePrice,
        newSupport: currentBidWall ? bidWallPriceStr : null,
        newResistance: currentAskWall ? askWallPriceStr : null,
        newMomentum: newMomentum,
        newNearDepth: { bids05, asks05, bids10, asks10 },
        newCvdHistory: [...cvdHistoryRef.current],
        newTapeSpeed: tradeTimestampsRef.current.length,
        newRecentTrades: [...recentTradesFeedRef.current],
        newLiquidations: [...liquidationsFeedRef.current],
        newVolumeProfile: { ...volumeProfileRef.current },
        newWhaleTrades: [...whaleTradesRef.current]
      };
    };

    const processTrade = (trade) => {
      const price = parseFloat(trade.p);
      const qty = parseFloat(trade.q);
      const isBuyerMaker = trade.m;
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString();

      tradeTimestampsRef.current.push(now);

      const tradeVolumeUsdt = qty * price;
      if (isBuyerMaker) {
        runningCvdRef.current -= tradeVolumeUsdt;
      } else {
        runningCvdRef.current += tradeVolumeUsdt;
      }

      // Volume Profile Accumulation
      // Bucket size based on price magnitude
      const bucketSize = price > 1000 ? 10 : price > 100 ? 1 : 0.01;
      const priceBucket = (Math.round(price / bucketSize) * bucketSize).toString();
      volumeProfileRef.current[priceBucket] = (volumeProfileRef.current[priceBucket] || 0) + tradeVolumeUsdt;

      const newTradeItem = {
        id: trade.a || Math.random(),
        price: price.toFixed(price < 100 ? 4 : 2),
        qty: qty.toFixed(qty < 1 ? 4 : 2),
        side: isBuyerMaker ? 'sell' : 'buy',
        time: timeStr.split(' ')[0],
        usd: tradeVolumeUsdt.toFixed(0)
      };
      
      recentTradesFeedRef.current.unshift(newTradeItem);
      if (recentTradesFeedRef.current.length > 25) recentTradesFeedRef.current.pop();

      momentumWindowRef.current.push({ qty, isBuyerMaker, time: now });
      momentumWindowRef.current = momentumWindowRef.current.filter(t => now - t.time < 5000);

      recentTradesRef.current.push(qty);
      if (recentTradesRef.current.length > 100) recentTradesRef.current.shift();
      
      if (recentTradesRef.current.length > 20) {
        const avgTradeQty = recentTradesRef.current.reduce((a, b) => a + b, 0) / recentTradesRef.current.length;
        
        if (qty > avgTradeQty * 5 && tradeVolumeUsdt > 10000) {
          const type = isBuyerMaker ? "Venta" : "Compra";
          const alert = {
            id: `whale_${trade.f}`,
            type: 'WHALE',
            icon: isBuyerMaker ? "🔴" : "🟢",
            title: `Ballena de ${type}`,
            message: `Ejecución: ${qty.toFixed(2)} a ${price.toFixed(2)} ($${tradeVolumeUsdt.toLocaleString()})`,
            severity: 'critical',
            time: timeStr
          };
          addHistoryEvent(alert);

          // Add to Whale Bubbles
          whaleTradesRef.current.push({
            id: trade.f,
            time: now,
            price: price,
            volumeUsdt: tradeVolumeUsdt,
            side: isBuyerMaker ? 'sell' : 'buy'
          });
          // Keep last 30 bubbles
          if (whaleTradesRef.current.length > 30) whaleTradesRef.current.shift();
        }
      }
    };

    // WebSocket Spot Depth
    wsDepth = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`);
    wsDepth.onopen = () => {
      setIsConnected(true);
      setConnectionError(false);
    };
    wsDepth.onerror = () => setConnectionError(true);
    wsDepth.onclose = () => setConnectionError(true);
    wsDepth.onmessage = (event) => {
      const response = JSON.parse(event.data);
      const b = response.b || response.bids;
      const a = response.a || response.asks;
      if (b && a && b.length > 0 && a.length > 0) {
        processData(b, a);
      }
    };

    // Connection Error Timeout
    const connectionTimeout = setTimeout(() => {
      if (!latestDataRef.current && wsDepth && wsDepth.readyState !== WebSocket.OPEN) {
        setConnectionError(true);
      }
    }, 4000);

    // WebSocket Spot Trades
    wsTrade = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@aggTrade`);
    wsTrade.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.e === 'aggTrade') processTrade(response);
    };

    // WebSocket Futures Liquidations (@forceOrder)
    wsLiq = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@forceOrder`);
    wsLiq.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.e === 'forceOrder') {
        const order = response.o;
        const liqVolume = parseFloat(order.q) * parseFloat(order.p);
        // order.S = 'SELL' means Long got liquidated, 'BUY' means Short got liquidated.
        const liqSide = order.S === 'SELL' ? 'long' : 'short'; 
        
        const liqEvent = {
          id: `liq_${Date.now()}_${Math.random()}`,
          price: parseFloat(order.p).toFixed(2),
          volume: liqVolume,
          side: liqSide,
          time: new Date().toLocaleTimeString().split(' ')[0]
        };
        
        liquidationsFeedRef.current.unshift(liqEvent);
        if (liquidationsFeedRef.current.length > 15) liquidationsFeedRef.current.pop();
        
        // Throw a dramatic alert for huge liquidations > $50,000
        if (liqVolume > 50000) {
           addHistoryEvent({ 
             id: liqEvent.id, 
             type: 'LIQUIDATION', 
             icon: '💀', 
             title: `${liqSide.toUpperCase()} LIQUIDADO`, 
             message: `$${liqVolume.toLocaleString()} a ${liqEvent.price}`, 
             severity: 'critical', 
             time: liqEvent.time 
           });
        }
      }
    };

    return () => {
      clearTimeout(connectionTimeout);
      if (wsDepth) wsDepth.close();
      if (wsTrade) wsTrade.close();
      if (wsLiq) wsLiq.close();
      if (uiUpdateInterval) clearInterval(uiUpdateInterval);
    };
  }, [symbol]);

  return { 
    data, stats, insights, history, currentPrice, isConnected, connectionError,
    supportPrice, resistancePrice, momentum,
    cvdHistory, tapeSpeed, nearDepth, recentTrades,
    liquidations, volumeProfile, whaleTrades
  };
}
