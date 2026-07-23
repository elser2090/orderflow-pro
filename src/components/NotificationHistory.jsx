import React from 'react';
import './NotificationHistory.css';

export default function NotificationHistory({ history }) {
  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>Historial de Eventos</h3>
        <span className="history-count">{history.length}</span>
      </div>
      
      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-empty">
            <p>No se han registrado eventos recientes.</p>
          </div>
        ) : (
          history.map((event, idx) => (
            <div 
              key={`${event.id}-${event.timestamp}`} 
              className={`history-item history-${event.severity} type-${(event.type || 'info').toLowerCase()} ${event.title.includes('Compra') ? 'side-buy' : event.title.includes('Venta') ? 'side-sell' : ''}`}
            >
              <div className="history-time">{event.time}</div>
              <div className="history-icon">{event.icon}</div>
              <div className="history-content">
                <strong>{event.title}</strong>
                <span>{event.message}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
