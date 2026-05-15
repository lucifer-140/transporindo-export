function SkeletonLine({ width = '100%', height = 14 }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 4 }} />;
}

function SkeletonBlock({ width = '100%', height = 40 }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 6 }} />;
}

export function BookingFormSkeleton() {
  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <SkeletonBlock width={80} height={32} />
        <SkeletonLine width={200} height={22} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
        {[1,2,3].map(i => (
          <div key={i} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SkeletonLine width={140} height={13} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[1,2,3,4].map(j => (
                <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SkeletonLine width={80} height={11} />
                  <SkeletonBlock height={36} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <SkeletonBlock width={100} height={36} />
          <SkeletonBlock width={130} height={36} />
        </div>
      </div>
    </div>
  );
}

export function BookingDetailSkeleton() {
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <SkeletonBlock width={80} height={32} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonLine width={160} height={20} />
          <SkeletonLine width={100} height={13} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <SkeletonBlock width={90} height={32} />
          <SkeletonBlock width={90} height={32} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[1,2,3,4].map(i => <SkeletonBlock key={i} width={100} height={34} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SkeletonLine width={120} height={13} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <SkeletonLine width={70} height={11} />
                <SkeletonLine width="80%" height={15} />
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkeletonLine width={100} height={13} />
          {[1,2].map(i => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <SkeletonLine width={120} height={14} />
              <SkeletonLine width={80} height={14} />
              <SkeletonLine width={60} height={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
