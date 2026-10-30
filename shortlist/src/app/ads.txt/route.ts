import { adsTxt, publisherId } from "@/lib/ads";

// ads.txt: tells ad buyers that Google may sell this site's ad space.
// Generated from NEXT_PUBLIC_ADSENSE_CLIENT (or ADS_PUBLISHER_ID).
export function GET() {
  const pub = process.env.ADS_PUBLISHER_ID || publisherId();
  return new Response(adsTxt(pub), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
