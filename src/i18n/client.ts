// Client-side i18n bootstrap. Imported once in Base.astro.
// Swaps every [data-i18n] element's text, persists the choice, and fires a
// "langchange" event so islands (the map, the cards) can re-render.
import { UI, getLang, type Lang } from "./ui";

function applyI18n() {
  const lang = getLang();
  const dict = UI[lang] || UI.en;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n!;
    if (dict[key] != null) el.textContent = dict[key];
  });
  // Content pairs: elements carrying both data-en and data-es (e.g. card deks).
  document.querySelectorAll<HTMLElement>("[data-en][data-es]").forEach((el) => {
    const v = lang === "es" ? el.dataset.es : el.dataset.en;
    if (v != null) el.textContent = v;
  });
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-lang-label]").forEach((el) => {
    el.textContent = lang === "en" ? "ES" : "EN";
  });
  window.dispatchEvent(new Event("langchange"));
}

function setLang(l: Lang) {
  try { localStorage.setItem("cuenca-lang", l); } catch (e) {}
  applyI18n();
}

declare global { interface Window { toggleLang: () => void; setLang: (l: Lang) => void; } }
window.setLang = setLang;
window.toggleLang = () => setLang(getLang() === "en" ? "es" : "en");

if (document.readyState !== "loading") applyI18n();
else window.addEventListener("DOMContentLoaded", applyI18n);
