// UI string dictionary (EN / ES) for the chrome — nav, headers, footers, map UI.
// Long-form review article bodies are not translated here; route-based i18n
// (/es/…) is the recommended production approach for full content translation.

export type Lang = "en" | "es";

export const UI: Record<Lang, Record<string, string>> = {
  en: {
    nav_map: "Map", nav_reviews: "Reviews", nav_design: "Design system", nav_about: "About", nav_list: "List your business",
    hero_eyebrow: "Ecuador - Andes Mountains",
    hero_title: "The places expats love in Cuenca",
    hero_dek: "An honest, hand-mapped guide to El Centro and beyond — landmarks, markets, parks, and the cafés worth a long morning.",
    chip_places: "20 places", chip_cats: "5 categories", chip_reviews: "Read the reviews →",
    map_caption: "Tap a gold pin to open the listing — featured spots link straight to our full review.",
    filter_all: "All",
    cat_landmark: "Landmarks & plazas", cat_market: "Markets", cat_museum: "Museums & culture", cat_outdoors: "Parks & views", cat_food: "Food & cafés",
    "cat_restaurants-cafes": "Restaurants & cafés", cat_dental: "Dental", "cat_real-estate": "Real estate", "cat_visa-legal": "Visa & legal", cat_tours: "Tours", cat_bars: "Bars",
    legend_reviewed: "Reviewed",
    panel_hours: "Hours", panel_directions: "Get directions", panel_website: "Website",
    panel_review: "Read our full review", panel_claim: "Own this business? Get a featured listing →",
    panel_specials: "Current specials",
    fav: "Local favorite",
    show_eyebrow: "From the guide", show_title: "Restaurants we've reviewed",
    show_dek: "We eat everywhere so you don't have to. These are the spots we keep going back to — written up in full, no sponsored fluff.",
    all_reviews: "All reviews", card_read: "Read review", card_soon: "Review coming soon", badge_soon: "Coming soon",
    foot_tagline: "A small, independent guide to living and eating well in Cuenca, Ecuador. Made by people who actually live here.",
    foot_explore: "Explore", foot_map: "The map", foot_own: "Own a business?",
    foot_own_body: "Get a featured listing and a full review.", foot_own_link: "Get in touch →",
    foot_legal: "© 2026 Cuenca Expat Map · Map data © OpenStreetMap, CARTO",
    rev_eyebrow: "Independent & unsponsored", rev_title: "Reviews",
    rev_dek: "We write up the places we actually go back to — in full, in our own words, with no one paying for the privilege. Start here.",
    rev_latest: "Latest reviews", editors_pick: "★ Editors' pick", read_full: "Read the full review",
    bc_back: "← All reviews", keep_reading: "Keep reading", more_guide: "More from the guide",
    about_eyebrow: "About · the maker", about_title: "Remote Solopreneur",
    about_bio: "I'm a one-person business run from a sunny apartment in Cuenca — and I make videos about the move abroad: visas, the real cost of living, and the slow, good day-to-day of expat life in the Ecuadorian Andes. This guide is the map I wish I'd had when I landed.",
    about_sub: "Subscribe on YouTube", about_news: "Get the newsletter",
    watch_eyebrow: "Watch", videos_title: "Videos & guides", new_badge: "New · In production",
    biz_eyebrow: "For business owners", cta_title: "Is your business missing?", cta_title2: "Add it to the map.",
    cta_body: "A pin on the map is always free. Featured listings — photos and a full, honest review — are how the service keeps the lights on, but there's no hard sell here. Tell us about your place and we'll take it from there.",
    form_name: "Your name", form_business: "Business name", form_email: "Email", form_message: "Anything we should know? (optional)", form_send: "Send", form_thanks: "Thanks — we'll be in touch soon.", form_error: "Something went wrong — please try again.",
    list_eyebrow: "For business owners", list_title: "List your business in Cuenca",
    list_dek: "A pin on the map is always free. Featured listings — photos, hours, live specials, and a full honest review — are limited per category. Here's what's open right now.",
    list_avail: "Availability by category", list_remaining: "open", list_full: "Full — join the waitlist",
    wl_title: "Join the waitlist", wl_dek: "Tell us about your place and which category you're in. We'll reach out as a featured slot opens up.",
    wl_cat: "Category", wl_send: "Join the waitlist", wl_thanks: "You're on the list — we'll be in touch soon.",
  },
  es: {
    nav_map: "Mapa", nav_reviews: "Reseñas", nav_design: "Sistema de diseño", nav_about: "Acerca de", nav_list: "Publica tu negocio",
    hero_eyebrow: "Ecuador - Cordillera de los Andes",
    hero_title: "Los lugares que enamoran a los expats en Cuenca",
    hero_dek: "Una guía honesta y trazada a mano de El Centro y sus alrededores: monumentos, mercados, parques y los cafés que merecen una mañana entera.",
    chip_places: "20 lugares", chip_cats: "5 categorías", chip_reviews: "Lee las reseñas →",
    map_caption: "Toca un pin dorado para abrir la ficha: los lugares destacados enlazan directo a nuestra reseña completa.",
    filter_all: "Todos",
    cat_landmark: "Monumentos y plazas", cat_market: "Mercados", cat_museum: "Museos y cultura", cat_outdoors: "Parques y miradores", cat_food: "Comida y cafés",
    "cat_restaurants-cafes": "Restaurantes y cafés", cat_dental: "Dental", "cat_real-estate": "Bienes raíces", "cat_visa-legal": "Visa y legal", cat_tours: "Tours", cat_bars: "Bares",
    legend_reviewed: "Reseñado",
    panel_hours: "Horario", panel_directions: "Cómo llegar", panel_website: "Sitio web",
    panel_review: "Leer nuestra reseña completa", panel_claim: "¿Es tu negocio? Consigue una ficha destacada →",
    panel_specials: "Especiales actuales",
    fav: "Favorito local",
    show_eyebrow: "De la guía", show_title: "Restaurantes que hemos reseñado",
    show_dek: "Comemos en todas partes para que tú no tengas que hacerlo. Estos son los lugares a los que volvemos, reseñados a fondo y sin relleno patrocinado.",
    all_reviews: "Todas las reseñas", card_read: "Leer reseña", card_soon: "Reseña próximamente", badge_soon: "Próximamente",
    foot_tagline: "Una pequeña guía independiente para vivir y comer bien en Cuenca, Ecuador. Hecha por gente que vive aquí.",
    foot_explore: "Explorar", foot_map: "El mapa", foot_own: "¿Tienes un negocio?",
    foot_own_body: "Consigue una ficha destacada y una reseña completa.", foot_own_link: "Escríbenos →",
    foot_legal: "© 2026 Cuenca Expat Map · Datos del mapa © OpenStreetMap, CARTO",
    rev_eyebrow: "Independiente y sin patrocinio", rev_title: "Reseñas",
    rev_dek: "Escribimos sobre los lugares a los que de verdad volvemos: a fondo, con nuestras palabras y sin que nadie pague por aparecer. Empieza aquí.",
    rev_latest: "Últimas reseñas", editors_pick: "★ Selección del editor", read_full: "Leer la reseña completa",
    bc_back: "← Todas las reseñas", keep_reading: "Seguir leyendo", more_guide: "Más de la guía",
    about_eyebrow: "Acerca de · el autor", about_title: "Remote Solopreneur",
    about_bio: "Soy un negocio de una sola persona gestionado desde un departamento soleado en Cuenca, y hago videos sobre mudarse al extranjero: visas, el costo de vida real y el día a día tranquilo de la vida expat en los Andes ecuatorianos. Esta guía es el mapa que ojalá hubiera tenido al llegar.",
    about_sub: "Suscríbete en YouTube", about_news: "Recibe el boletín",
    watch_eyebrow: "Ver", videos_title: "Videos y guías", new_badge: "Nuevo · En producción",
    biz_eyebrow: "Para negocios", cta_title: "¿Falta tu negocio?", cta_title2: "Súmalo al mapa.",
    cta_body: "Un pin en el mapa siempre es gratis. Las fichas destacadas — fotos y una reseña completa y honesta — son lo que mantiene vivo el servicio, pero aquí no hay presión. Cuéntanos sobre tu lugar y nos encargamos del resto.",
    form_name: "Tu nombre", form_business: "Nombre del negocio", form_email: "Correo", form_message: "¿Algo que debamos saber? (opcional)", form_send: "Enviar", form_thanks: "Gracias, te escribiremos pronto.", form_error: "Algo salió mal — inténtalo de nuevo.",
    list_eyebrow: "Para negocios", list_title: "Publica tu negocio en Cuenca",
    list_dek: "Un pin en el mapa siempre es gratis. Las fichas destacadas — fotos, horario, especiales en vivo y una reseña completa y honesta — son limitadas por categoría. Esto es lo que hay disponible ahora.",
    list_avail: "Disponibilidad por categoría", list_remaining: "disponibles", list_full: "Lleno — únete a la lista",
    wl_title: "Únete a la lista de espera", wl_dek: "Cuéntanos sobre tu lugar y en qué categoría estás. Te contactaremos cuando se abra un cupo destacado.",
    wl_cat: "Categoría", wl_send: "Unirme a la lista", wl_thanks: "Estás en la lista — te escribiremos pronto.",
  },
};

// English review-card category label → i18n key
export const CAT_KEY_BY_LABEL: Record<string, string> = {
  "Landmarks & plazas": "cat_landmark", "Markets": "cat_market", "Museums & culture": "cat_museum", "Parks & views": "cat_outdoors", "Food & cafés": "cat_food", "Restaurants & cafés": "cat_restaurants-cafes",
};

export function getLang(): Lang {
  if (typeof localStorage === "undefined") return "en";
  return (localStorage.getItem("cuenca-lang") as Lang) || "en";
}
export function t(key: string, lang: Lang = getLang()): string {
  return UI[lang]?.[key] ?? UI.en[key] ?? key;
}
