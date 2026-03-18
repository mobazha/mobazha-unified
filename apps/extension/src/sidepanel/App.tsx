import { WEB_APP_ORIGIN } from '../shared/init';

export function SidePanelApp() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '24px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '24px' }}>Mobazha</h1>
      <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
        Side Panel — Full shopping experience coming in Ext-1.
      </p>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>
        This panel will host the complete marketplace with search, browsing, cart, and checkout.
      </p>
      <button
        onClick={() => chrome.tabs.create({ url: WEB_APP_ORIGIN })}
        style={{
          marginTop: '16px',
          padding: '10px 24px',
          background: '#0f172a',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Open Full Website
      </button>
    </div>
  );
}
