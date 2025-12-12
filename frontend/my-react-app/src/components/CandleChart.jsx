// src/components/CandleChart.jsx
import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from "chartjs-chart-financial";
import "chartjs-adapter-date-fns";

// register Chart.js pieces + financial controllers
Chart.register(...registerables, CandlestickController, CandlestickElement, OhlcController, OhlcElement);

/**
 * Props:
 *  - data: array of { time: <ms since epoch>, price: <number> }
 *  - ticker: string (label)
 *  - candleIntervalMs: number (aggregation window in ms, default 5000)
 */
export default function CandleChart({ data = [], ticker = "", candleIntervalMs = 5000 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // convert tick-level points to OHLC candles
  function buildCandles(points, intervalMs) {
    if (!points || !points.length) return [];

    // ensure points sorted by time ascending
    const sorted = [...points].sort((a, b) => a.time - b.time);

    const groups = new Map();
    for (const p of sorted) {
      const bucket = Math.floor(p.time / intervalMs) * intervalMs;
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket).push(p.price);
    }

    // produce OHLC objects: { x: timestamp, o, h, l, c }
    const candles = [];
    for (const [bucket, prices] of groups) {
      if (!prices || prices.length === 0) continue;
      const o = prices[0];
      const c = prices[prices.length - 1];
      let h = -Infinity;
      let l = Infinity;
      for (const v of prices) {
        if (v > h) h = v;
        if (v < l) l = v;
      }
      candles.push({ x: bucket, o: Number(o), h: Number(h), l: Number(l), c: Number(c) });
    }

    // sort candles by time
    candles.sort((a, b) => a.x - b.x);
    return candles;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // create chart once
    if (!chartRef.current) {
      const ctx = canvas.getContext("2d");

      chartRef.current = new Chart(ctx, {
        type: "candlestick",
        data: {
          datasets: [{
            label: ticker || "Price",
            data: [], // will set below
            color: {
              up: "#16a34a",
              down: "#dc2626",
              unchanged: "#9ca3af"
            }
          }]
        },
        options: {
          maintainAspectRatio: false,
          animation: { duration: 200 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const d = context.raw;
                  return `O: ${d.o}  H: ${d.h}  L: ${d.l}  C: ${d.c}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: "time",
              adapters: { date: {} },
              time: {
                unit: "second",
                tooltipFormat: "PPpp"
              },
              ticks: { color: "#9ca3af" }
            },
            y: {
              position: "right",
              ticks: { color: "#9ca3af" },
              beginAtZero: false
            }
          }
        }
      });
    }

    // update on data changes
    const candles = buildCandles(data, candleIntervalMs);
    if (chartRef.current) {
      chartRef.current.data.datasets[0].label = ticker || "Price";
      chartRef.current.data.datasets[0].data = candles;
      chartRef.current.update();
    }

    // cleanup if unmount
    return () => { /* keep chart instance alive for reuse; Chart will be destroyed by React unmount if needed */ };
  }, [data, ticker, candleIntervalMs]);

  return (
    <div style={{ width: "100%", height: 320 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
