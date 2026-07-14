/* app/layout.js */
import "./globals.css";
import { HRProvider } from "./context";
import PWARegistry from "./PWARegistry";
import MobileNav from "./MobileNav";
import AuthGuard from "./AuthGuard";
import AppFrame from "./AppFrame";

export const metadata = {
  title: "HR Portal - Qatar Vacation & EOS Tracker",
  description: "Advanced HR Dashboard managing vacations, document expirations, salary hikes, and End of Service gratuity settlements.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark-mode');}}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AGY HR" />
      </head>
      <body>
        <HRProvider>
          <AuthGuard>
            <AppFrame>
              {children}
            </AppFrame>
          </AuthGuard>
          <MobileNav />
          <PWARegistry />
        </HRProvider>
      </body>
    </html>
  );
}
