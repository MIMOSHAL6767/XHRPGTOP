export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-spinner" aria-hidden="true" />
      <span>加载中…</span>
    </div>
  );
}
