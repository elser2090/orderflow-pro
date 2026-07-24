import React, { useState, useMemo } from 'react';
import './EventLog.css';

const FILTERS = [
  { key: 'ALL', label: 'Todos', icon: '📋' },
  { key: 'WHALE', label: 'Ballenas', icon: '🐳' },
  { key: 'LIQUIDATION', label: 'Liquidaciones', icon: '💀' },
  { key: 'SPOOFING', label: 'Spoofing', icon: '👻' },
];

export default function EventLog({ history }) {
  const [filter, setFilter] = useState('ALL');
  
  const filteredHistory = useMemo(() => {
    if (filter === 'ALL') return history;
    return history.filter(e => e.type === filter);
  }, [history, filter]);

  const counts = useMemo(() => ({
    ALL: history.length,
    WHALE: history.filter(e => e.type === 'WHALE').length,
    LIQUIDATION: history.filter(e => e.type === 'LIQUIDATION').length,
    SPOOFING: history.filter(e => e.type === 'SPOOFING').length,
  }), [history]);

  return (
    <div className="event-log-panel">
      <div className="el-header">
        <h3>Eventos Resaltantes</h3>
        <span className="el-total">{history.length}</span>
      </div>

      <div className="el-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`el-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            <span className="el-filter-icon">{f.icon}</span>
            <span className="el-filter-label">{f.label}</span>
            {counts[f.key] > 0 && (
              <span className="el-filter-count">{counts[f.key]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="el-list">
        {filteredHistory.length === 0 ? (
          <div className="el-empty">
            <span className="el-empty-icon">🔭</span>
            <p>No se han detectado eventos {filter !== 'ALL' ? `de tipo ${FILTERS.find(f => f.key === filter)?.label}` : ''} aún.</p>
            <p className="el-empty-sub">Los eventos aparecerán en tiempo real cuando se detecten movimientos institucionales.</p>
          </div>
        ) : (
          filteredHistory.map((event) => (
            <div
              key={`${event.id}-${event.timestamp}`}
              className={`el-item el-type-${(event.type || 'info').toLowerCase()} ${event.title?.includes('Compra') ? 'el-side-buy' : event.title?.includes('Venta') || event.title?.includes('LONG') ? 'el-side-sell' : ''}`}
            >
              <div className="el-item-left">
                <span className="el-item-icon">{event.icon}</span>
                <div className="el-item-content">
                  <strong className="el-item-title">{event.title}</strong>
                  <span className="el-item-message">{event.message}</span>
                </div>
              </div>
              <div className="el-item-time">{event.time}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
