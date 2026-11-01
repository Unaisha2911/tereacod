/** Route-level loading shell for admin detail navigations (RSC). */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading record">
      <div className="skeleton-sheen h-9 w-56 rounded-lg" />
      <div className="skeleton-sheen h-40 rounded-2xl border border-line bg-elevated/40" />
      <div className="skeleton-sheen h-64 rounded-2xl border border-line bg-elevated/40" />
    </div>
  );
}
