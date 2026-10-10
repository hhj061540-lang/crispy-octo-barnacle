import React from 'react';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: '3rem', color: '#e74c3c' }}>404</h1>
      <h2>Page Not Found</h2>
      <p>The dashboard view you requested could not be located.</p>
      <a href="/" style={{ color: '#007acc', textDecoration: 'underline', fontWeight: 'bold' }}>
        Return to Control Center
      </a>
    </div>
  );
}
