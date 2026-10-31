// Pure helpers for paid entitlements, shared by the webhooks and the client.

export type EntitlementId = "ad_free" | "pro";

export interface EntitlementRow {
  user_id: string;
  entitlement: EntitlementId;
  source: string;
  active: boolean;
  expires_at: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  updated_at: string;
}

/** Is a stored entitlement in force right now? */
export function isActive(row: { active: boolean; expires_at: string | null }, now = Date.now()): boolean {
  if (!row.active) return false;
  return !row.expires_at || new Date(row.expires_at).getTime() > now;
}

/** Which plan a Stripe price belongs to. Unknown prices are treated as Pro (the original single plan). */
export function planForPrice(priceId: string | undefined | null, env: { adFreePrice?: string; proPrice?: string }): "ad_free" | "pro" {
  if (priceId && env.adFreePrice && priceId === env.adFreePrice) return "ad_free";
  return "pro";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[] | null;
  entitlement_id?: string | null;
  expiration_at_ms?: number | null;
  store?: string;
}

const STORE: Record<string, string> = { APP_STORE: "app_store", MAC_APP_STORE: "app_store", PLAY_STORE: "play_store", AMAZON: "amazon", STRIPE: "rc_stripe", PROMOTIONAL: "promotional" };

/**
 * Turn a RevenueCat webhook event into entitlement rows. Only events for a
 * signed-in Shortlist user (a UUID app user id, set by Purchases.logIn) can be
 * linked to an account; anonymous purchases still work on that device.
 */
export function rowsFromRevenueCat(ev: RevenueCatEvent, now = Date.now()): EntitlementRow[] {
  const ids = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? [])].filter((x): x is string => !!x && UUID.test(x));
  const userId = ids[0];
  if (!userId) return [];
  const ents = (ev.entitlement_ids ?? (ev.entitlement_id ? [ev.entitlement_id] : [])).filter((e): e is EntitlementId => e === "ad_free" || e === "pro");
  if (!ents.length) return [];
  const type = ev.type ?? "";
  // Cancellation only stops renewal: access lasts until expiry. Expiration ends it.
  const ends = type === "EXPIRATION";
  const grants = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "CANCELLATION", "BILLING_ISSUE", "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT"].includes(type);
  if (!ends && !grants) return [];
  const expires = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;
  return ents.map((e) => ({
    user_id: userId,
    entitlement: e,
    source: STORE[ev.store ?? ""] ?? (ev.store ?? "store").toLowerCase(),
    active: !ends && (!ev.expiration_at_ms || ev.expiration_at_ms > now),
    expires_at: expires,
    updated_at: new Date(now).toISOString(),
  }));
}
