export type BannerPreset = { id: string; name: string; url: string; category: "colors" | "music" };

export const COLOR_BANNERS: BannerPreset[] = [
  { id: "champagne-frost-pearl", name: "Champagne Frost Pearl", url: "/banners/color-champagne.jpg", category: "colors" },
  { id: "silver", name: "Silver", url: "/banners/color-silver.jpg", category: "colors" },
  { id: "gold", name: "Gold", url: "/banners/color-gold.jpg", category: "colors" },
  { id: "pearl", name: "Pearl White", url: "/banners/color-pearl.jpg", category: "colors" },
  { id: "frost", name: "Frost", url: "/banners/color-frost.jpg", category: "colors" },
  { id: "midnight", name: "Midnight", url: "/banners/color-midnight.jpg", category: "colors" },
  { id: "rose", name: "Rose Quartz", url: "/banners/color-rose.jpg", category: "colors" },
  { id: "emerald", name: "Emerald", url: "/banners/color-emerald.jpg", category: "colors" },
  { id: "lavender", name: "Lavender", url: "/banners/color-lavender.jpg", category: "colors" },
  { id: "amethyst", name: "Amethyst", url: "/banners/color-amethyst.jpg", category: "colors" },
  { id: "obsidian", name: "Obsidian", url: "/banners/color-obsidian.jpg", category: "colors" },
  { id: "copper", name: "Copper", url: "/banners/color-copper.jpg", category: "colors" },
  { id: "rainbow", name: "Rainbow", url: "/banners/color-rainbow.jpg", category: "colors" },
  { id: "ocean", name: "Ocean", url: "/banners/color-ocean.jpg", category: "colors" },
  { id: "sunset", name: "Sunset", url: "/banners/color-sunset.jpg", category: "colors" },
];

export const MUSIC_BANNERS: BannerPreset[] = [
  { id: "music-champagne-mix", name: "Champagne · Guitar Violin Sax", url: "/banners/music-champagne-mix.jpg", category: "music" },
  { id: "music-gold-mix", name: "Gold · Guitar Violin Brass", url: "/banners/music-gold-mix.jpg", category: "music" },
  { id: "music-navy-studio", name: "Navy · Piano Mic Drums", url: "/banners/music-navy-studio.jpg", category: "music" },
  { id: "music-rosewood-strings", name: "Rosewood · Violin Flute Cello", url: "/banners/music-rosewood-strings.jpg", category: "music" },
  { id: "music-black-gold-rock", name: "Black Gold · Guitar Sax Trumpet", url: "/banners/music-black-gold-rock.jpg", category: "music" },
  { id: "music-pearl-orchestra", name: "Pearl · Harp Accordion Horn", url: "/banners/music-pearl-orchestra.jpg", category: "music" },
  { id: "music-emerald-brass", name: "Emerald · Cello Trombone", url: "/banners/music-emerald-brass.jpg", category: "music" },
];

export const ALL_BANNER_PRESETS: BannerPreset[] = [...COLOR_BANNERS, ...MUSIC_BANNERS];
