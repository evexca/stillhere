/**
 * Advertisement placeholder component.
 * Replace the content with actual AdSense code when ready.
 * Can be globally disabled via ADS_ENABLED=false.
 */
export function AdPlaceholder() {
  return (
    <div className="ad-placeholder" role="complementary" aria-label="Advertisement">
      <span className="ad-placeholder__label">Advertisement</span>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
        Ad space — replace with AdSense code
      </p>
      {/* TODO: Replace with actual ad code:
        <ins className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot="XXXXXXXXXX"
          data-ad-format="auto"
          data-full-width-responsive="true" />
      */}
    </div>
  );
}
