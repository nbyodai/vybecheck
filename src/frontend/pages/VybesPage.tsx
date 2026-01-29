export function VybesPage() {
  // Placeholder for monetization features
  const vybeBalance = 100; // Mock balance
  
  const vybePacks = [
    { id: 1, name: 'Starter Pack', vybes: 20, price: 5, popular: false },
    { id: 2, name: 'Pro Pack', vybes: 50, price: 10, popular: true },
    { id: 3, name: 'Ultimate Pack', vybes: 120, price: 20, popular: false },
  ];

  return (
    <div className="page-content">
      {/* Balance Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        padding: '24px',
        borderRadius: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
        color: 'white'
      }}>
        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Your Balance</div>
        <div style={{ fontSize: '36px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✨</span>
          <span>{vybeBalance}</span>
          <span style={{ fontSize: '20px', opacity: 0.8 }}>Vybes</span>
        </div>
      </div>

      {/* Vybe Packs */}
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>Buy Vybe Packs</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {vybePacks.map(pack => (
          <div
            key={pack.id}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              border: pack.popular ? '2px solid #6366F1' : 'none',
              position: 'relative'
            }}
          >
            {pack.popular && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '20px',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                POPULAR
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', marginBottom: '4px' }}>
                  {pack.name}
                </div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>
                  ✨ {pack.vybes} Vybes
                </div>
              </div>
              <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                ${pack.price}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* What are Vybes? */}
      <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>
          What are Vybes?
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
          Vybes are used to unlock premium features like viewing detailed match results, 
          accessing exclusive visualizations, and more. Purchase Vybe packs to enhance your experience!
        </p>
      </div>
    </div>
  );
}
