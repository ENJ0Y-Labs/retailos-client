/** RetailOS reporting uses West Africa Time, independent of the device timezone. */
export const STORE_TIME_ZONE = "Africa/Lagos";

export function formatNigeriaDateTime(value) {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: STORE_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatNigeriaDate(value) {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: STORE_TIME_ZONE,
    dateStyle: "medium",
  }).format(new Date(value));
}
