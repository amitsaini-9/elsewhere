import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://elsewhere.sainiamit.com"),
  title: "Elsewhere — A little closer to outside.",
  description:
    "A spare hour. A change of scene. Elsewhere is a coming-soon app for little outdoor escapes that fit your day.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Elsewhere — Life is better a little elsewhere.",
    description:
      "Find a little outside in your everyday. Explore the coming-soon product.",
    images: [{ url: "/media/hero.webp", width: 1376, height: 768 }],
  },
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
