import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { Bungee, DM_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const display = Bungee({ weight: "400", variable: "--font-display", subsets: ["latin"] });
const mono = DM_Mono({ weight: ["400", "500"], variable: "--font-mono", subsets: ["latin"] });
export const metadata: Metadata = { title: "Entry Window — Giveaways", description: "A local giveaway entry rack.", metadataBase: new URL(SITE_URL) };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${display.variable} ${mono.variable}`}>
  {/* THESIS: A giveaway list should feel like a transparent ticket office, not a generic CRUD table. OWN-WORLD: cobalt paper, tangerine ticket stock, black perforations, and a blunt display face with mono filing labels. STORY: visitors print an entry, search the rack, and see the honest limit that no draw engine is attached. FIRST VIEWPORT: the new-entry ticket sits beside the purpose statement; PRINT ENTRY is the primary action. FORM: raffle ticket window / candidate 7 / seed c85c8a8a. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance */}
  <Analytics /><SpeedInsights />{children}
</body></html>; }
