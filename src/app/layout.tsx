import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Intel — your daily information assistant",
  description: "Automatically finds, filters, verifies, summarizes and delivers the most important news, IT opportunities and scholarships for your interests.",
  applicationName: "Personal Intel",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* apply cached appearance before first paint (no theme flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('piu.appearance')||'{}');var d=document.documentElement;if(s.accent)d.style.setProperty('--accent',s.accent);var t=s.theme;var sysDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||((!t||t==='system')&&sysDark))d.classList.add('dark');d.setAttribute('data-text',s.textSize||'md');if(s.highContrast)d.classList.add('high-contrast');if(s.animations===false)d.classList.add('anim-none');}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
