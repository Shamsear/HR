/* app/layout.js */
import "./globals.css";
import { HRProvider } from "./context";
import PWARegistry from "./PWARegistry";
import MobileNav from "./MobileNav";
import AuthGuard from "./AuthGuard";

export const metadata = {
  title: "Antigravity HR Portal - Qatar Vacation & EOS Tracker",
  description: "Advanced HR Dashboard managing vacations, document expirations, salary hikes, and End of Service gratuity settlements.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AGY HR" />
      </head>
      <body>
        <HRProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
          <MobileNav />
          <PWARegistry />
        </HRProvider>
      </body>
    </html>
  );
}
