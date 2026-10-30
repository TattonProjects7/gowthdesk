import { adsTxt, publisherId } from "@/lib/ads";

// app-ads.txt: the same authorisation for the iOS and Android apps. AdMob reads
// it from the website listed on the App Store and Google Play pages.
export function GET() {
  const pub = process.env.ADS_PUBLISHER_ID || publisherId();
  return new Response(adsTxt(pub), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
