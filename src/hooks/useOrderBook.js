import { useState, useEffect } from 'react';

export function useOrderBook(symbol = 'BTCUSDT') {
  const [data, setData] = useState({ bids: [], asks: [] });
  const [stats, setStats] = useState({ buyPressure: 50, sellPressure: 50 });

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
        // Binance envía los bids ordenados de mayor a menor precio (el más cercano al spread primero)
        const newBids = response.b.map(b => {
          const price = parseFloat(b[0]);
          const amount = parseFloat(b[1]);
          tBid += amount;
          return { 
            price: price.toFixed(4), 
            amount: amount.toFixed(3), 
            total: tBid.toFixed(3) 
          };
        });

        let tAsk = 0;
        // Binance envía los asks ordenados de menor a mayor precio.
        // Los invertimos para que el precio más alto quede arriba en la UI y el más bajo (spread) abajo.
        const reversedAsks = [...response.a].reverse();
        
        const newAsks = reversedAsks.map(a => ({
          price: parseFloat(a[0]).toFixed(4),
          amount: parseFloat(a[1]).toFixed(3),
          total: '0'
        }));

        // Calculamos el volumen acumulado de los asks desde el spread (el final del array) hacia arriba
        for(let i = newAsks.length - 1; i >= 0; i--) {
            tAsk += parseFloat(newAsks[i].amount);
            newAsks[i].total = tAsk.toFixed(3);
        }

        setData({ bids: newBids, asks: newAsks });

        // Actualizamos estadísticas
        const totalVolume = tBid + tAsk;
        const buyPressure = totalVolume > 0 ? (tBid / totalVolume) * 100 : 50;
        const sellPressure = totalVolume > 0 ? (tAsk / totalVolume) * 100 : 50;

        setStats({
          buyPressure: buyPressure.toFixed(2),
          sellPressure: sellPressure.toFixed(2)
        });
      }
    };

    ws.onerror = (error) => {
      console.error('Error en WebSocket de Binance:', error);
    };

    return () => {
      ws.close(); // Limpiamos la conexión al desmontar o cambiar de símbolo
    };
  }, [symbol]);

  return { data, stats };
}
