/** Shimmer placeholder mirroring LeadCard rows while leads load. */
export function LeadListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="lead-grid" role="status" aria-label="Loading leads">
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <div className="lead-card" key={i} aria-hidden>
          <div className="lead-top">
            <span className="skel skel-line" style={{ width: "38%", height: 19 }} />
            <span className="skel skel-line" style={{ width: 64, height: 14 }} />
          </div>
          <p className="lead-meta skel skel-line" style={{ width: "78%" }} />
          <p className="lead-reason skel skel-line" style={{ width: "52%" }} />
        </div>
      ))}
    </div>
  );
}
