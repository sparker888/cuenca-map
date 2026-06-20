// Outbound link builders — WhatsApp click-to-chat (zero-API) and directions.
// Pure functions, safe in both build-time and client code.

const enc = encodeURIComponent;

/** Click-to-chat with a specific business number (digits only, no +/spaces). */
export const waMessage = (number: string, text: string) =>
  `https://wa.me/${String(number).replace(/[^\d]/g, "")}?text=${enc(text)}`;

/** Open WhatsApp with a prefilled share message (user picks the recipient). */
export const waShare = (text: string) => `https://wa.me/?text=${enc(text)}`;

// --- Directions ---
// geo: opens the device's DEFAULT maps app (Google on Android, Apple on iOS).
// It's a no-op in desktop browsers, so Apple/Google links must always accompany it.
export const geoUrl = (lat: number, lng: number, name?: string) =>
  `geo:${lat},${lng}${name ? `?q=${lat},${lng}(${enc(name)})` : ""}`;

export const appleMapsUrl = (lat: number, lng: number, name?: string) =>
  `https://maps.apple.com/?ll=${lat},${lng}${name ? `&q=${enc(name)}` : ""}`;

export const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
