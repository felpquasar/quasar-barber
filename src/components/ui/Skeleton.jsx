const Skeleton = ({ width = "100%", height = 16, radius = 4, style = {} }) => (
  <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
);

export const SkeletonCard = () => (
  <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "1.25rem" }}>
    <Skeleton height={26} width="55%" style={{ marginBottom: 8 }} />
    <Skeleton height={11} width="35%" />
  </div>
);

export const SkeletonDashboard = () => (
  <div>
    <Skeleton height={28} width={200} style={{ marginBottom: "1.5rem" }} />
    <div style={{ background: "#111", border: "1px solid #1a1a12", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1rem" }}>
      <Skeleton height={11} width={130} style={{ marginBottom: 12 }} />
      <Skeleton height={42} width="45%" style={{ marginBottom: 12 }} />
      <Skeleton height={11} width={180} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: "1.5rem" }}>
      {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </div>
    <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
      <Skeleton height={11} width={160} style={{ marginBottom: "1rem" }} />
      <Skeleton height={160} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.5rem" }}>
      {[0, 1].map(i => (
        <div key={i} style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "1.25rem" }}>
          <Skeleton height={11} width={100} style={{ marginBottom: 14 }} />
          {[100, 82, 66, 50, 36].map((w, j) => (
            <Skeleton key={j} height={10} width={`${w}%`} style={{ marginBottom: 10 }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
