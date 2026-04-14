import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sutra - Simple. Fast. Connected | Screen Sharing Platform",
  description: "Seamless, secure real-time screen sharing. Connect instantly with viewers using a simple 4-digit code. No downloads required. Perfect for presentations, support, and collaboration.",
  keywords: ["screen sharing", "real-time streaming", "WebRTC", "screen capture", "collaboration", "presentation", "remote support"],
  authors: [{ name: "Sutra Team" }],
  creator: "Sutra",
  publisher: "Sutra",
  robots: "index, follow",
  category: "Technology",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=5.0",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sutra-app.com",
    siteName: "Sutra",
    title: "Sutra - Real-Time Screen Sharing Platform",
    description: "Share your screen instantly and securely with Sutra. No downloads required. Connect in seconds.",
    images: [
      {
        url: "https://sutra-app.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sutra Screen Sharing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sutra - Real-Time Screen Sharing",
    description: "Share your screen instantly and securely with Sutra.",
    images: ["https://sutra-app.com/twitter-image.png"],
    creator: "@sutra_app",
  },
  alternates: {
    canonical: "https://sutra-app.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light overflow-hidden" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sutra" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
      </head>
      <body className="antialiased overflow-hidden h-screen">
        <script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js" type="module"></script>
        {children}
      </body>
    </html>
  );
}
