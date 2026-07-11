import { useState, useEffect, useRef } from 'react';

export function useOrderBook(symbol = 'BTCUSDT') {
  const [data, setData] = useState({ bids: [], asks: [] });
  const [stats, setStats] = useState({ buyPressure: 50, sellPressure: 50 });
  const [insights, setInsights] = useState([]);
  
  // Ref para guardar los muros del frame anterior para detectar spoofing
  const previousWallsRef = useRef({ bidWall: null, askWall: null });
  // Ref para guardar alertas temporales (como spoofing) para que duren unos segundos en pantalla
  const activeAlertsRef = useRef([]);

  useEffect(() => {
    // Conexión real al WebSocket de Binance Futures para el Order Book (Top 20 cada 100ms)
    const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth20@100ms`);

    ws.onopen = () => {
      console.log(`Conectado al stream de datos reales de Binance para ${symbol}`);
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      
      // El stream @depth20 devuelve 'b' (bids) y 'a' (asks)
      if (response.b && response.a) {
        
        let tBid = 0;
        let maxBidAmount = 0;
        let bidWallPrice = 0;
        
        const newBids = response.b.map(b => {
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
        
        const reversedAsks = [...response.a].reverse();
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

        // Estadísticas Base
        const totalVolume = tBid + tAsk;
        const buyPressureNum = totalVolume > 0 ? (tBid / totalVolume) * 100 : 50;
        const sellPressureNum = totalVolume > 0 ? (tAsk / totalVolume) * 100 : 50;

        setStats({
          buyPressure: buyPressureNum.toFixed(2),
          sellPressure: sellPressureNum.toFixed(2)
        });

        // ---------------------
        // ALGORITMOS DE INSIGHTS
        // ---------------------
        const currentInsights = [];
        const avgBidAmount = tBid / 20;
        const avgAskAmount = tAsk / 20;

        // 1. Desequilibrio de Mercado (Imbalance)
        if (buyPressureNum > 65) {
          currentInsights.push({ id: 'imbalance', type: 'BUY_IMBALANCE', icon: '⚖️', title: 'Desequilibrio de Compras', message: `Fuerte presión compradora (${buyPressureNum.toFixed(1)}%). Posible subida.`, severity: 'medium' });
        } else if (sellPressureNum > 65) {
          currentInsights.push({ id: 'imbalance', type: 'SELL_IMBALANCE', icon: '⚖️', title: 'Desequilibrio de Ventas', message: `Fuerte presión vendedora (${sellPressureNum.toFixed(1)}%). Posible caída.`, severity: 'medium' });
        }

        // 2. Detección de Muros (Buy/Sell Walls)
        let currentBidWall = null;
        let currentAskWall = null;

        // Si el volumen máximo es al menos 3.5 veces mayor al volumen promedio por nivel, es un muro.
        if (maxBidAmount > avgBidAmount * 3.5 && maxBidAmount > 5) {
          currentBidWall = { price: bidWallPrice, amount: maxBidAmount };
          currentInsights.push({ id: 'bid_wall', type: 'BUY_WALL', icon: '🛡️', title: 'Fuerte Barrera de Compra', message: `Muro detectado en ${bidWallPrice.toFixed(2)} con ${maxBidAmount.toFixed(1)} vol.`, severity: 'high' });
        }

        if (maxAskAmount > avgAskAmount * 3.5 && maxAskAmount > 5) {
          currentAskWall = { price: askWallPrice, amount: maxAskAmount };
          currentInsights.push({ id: 'ask_wall', type: 'SELL_WALL', icon: '🧱', title: 'Fuerte Barrera de Venta', message: `Muro detectado en ${askWallPrice.toFixed(2)} con ${maxAskAmount.toFixed(1)} vol.`, severity: 'high' });
        }

        // 3. Detección de Spoofing (Órdenes Fantasma)
        const prevWalls = previousWallsRef.current;
        const now = Date.now();
        
        if (prevWalls.bidWall && !currentBidWall) {
          const currentPrice = response.b[0] ? parseFloat(response.b[0][0]) : 0;
          // Si el muro desapareció y el precio actual está lejos de ese muro (no fue ejecutado)
          if (currentPrice > prevWalls.bidWall.price + (currentPrice * 0.0005)) {
             activeAlertsRef.current.push({ id: `spoof_${now}`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Detectado (Compras)', message: `Muro falso retirado abruptamente en ${prevWalls.bidWall.price.toFixed(2)}.`, severity: 'critical', expires: now + 3000 });
          }
        }

        if (prevWalls.askWall && !currentAskWall) {
          const currentPrice = response.a[0] ? parseFloat(response.a[0][0]) : 0;
          if (currentPrice > 0 && currentPrice < prevWalls.askWall.price - (currentPrice * 0.0005)) {
             activeAlertsRef.current.push({ id: `spoof_${now}`, type: 'SPOOFING', icon: '👻', title: 'Spoofing Detectado (Ventas)', message: `Muro falso retirado abruptamente en ${prevWalls.askWall.price.toFixed(2)}.`, severity: 'critical', expires: now + 3000 });
          }
        }

        previousWallsRef.current = { bidWall: currentBidWall, askWall: currentAskWall };
        
        // Limpiar alertas expiradas
        activeAlertsRef.current = activeAlertsRef.current.filter(alert => alert.expires > now);

        // Combinar insights actuales con alertas persistentes
        setInsights([...currentInsights, ...activeAlertsRef.current]);
      }
    };

    ws.onerror = (error) => {
      console.error('Error en WebSocket de Binance:', error);
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return { data, stats, insights };
}
