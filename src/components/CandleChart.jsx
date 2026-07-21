import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import './CandleChart.css';

const TIMEFRAMES = [
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '1D', value: '1d' }
];

export default function CandleChart({ symbol }) {
  const chartContainerRef = useRef();
  const chartInstance = useRef(null);
  const candlestickSeries = useRef(null);
  
  const [interval, setInterval] = useState('15m');
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    // 1. Crear el Gráfico
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#848E9C',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    // 2. Crear la Serie de Velas
    const series = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    });

    chartInstance.current = chart;
    candlestickSeries.current = series;

    // Redimensionar el gráfico dinámicamente
    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    
    setIsChartReady(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Manejar datos y websocket
  useEffect(() => {
    if (!isChartReady || !symbol) return;

    let wsKline = null;
    let isFetchingHistory = true;

    // Primero obtener historial de velas a través de API REST de Futuros
    fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=200`)
      .then(res => res.json())
      .then(data => {
        const historicalData = data.map(d => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));
        candlestickSeries.current.setData(historicalData);
        isFetchingHistory = false;

        // Conectar a WebSocket de Futuros para actualizaciones en vivo
        wsKline = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`);
        wsKline.onmessage = (event) => {
          const message = JSON.parse(event.data);
          const kline = message.k;
          
          candlestickSeries.current.update({
            time: kline.t / 1000,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          });
        };
      })
      .catch(err => console.error("Error fetching klines:", err));

    return () => {
      if (wsKline) wsKline.close();
    };
  }, [symbol, interval, isChartReady]);

  return (
    <div className="candle-chart-panel">
      <div className="candle-chart-header">
        <div className="candle-title">
          <h3>Gráfico de Precio ({symbol})</h3>
        </div>
        <div className="timeframe-selector">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              className={`tf-btn ${interval === tf.value ? 'active' : ''}`}
              onClick={() => setInterval(tf.value)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="candle-container" ref={chartContainerRef} />
    </div>
  );
}
