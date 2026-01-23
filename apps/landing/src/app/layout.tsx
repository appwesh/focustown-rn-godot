import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://focustown.com"),
  title: "FocusTown - Study with Friends",
  description: "Focusing feels better with friends. Study live with homies around the world.",
  icons: {
    icon: "/focusfavicon.png",
    apple: "/focusfavicon.png",
  },
  openGraph: {
    title: "FocusTown - Study with Friends",
    description: "Focusing feels better with friends. Study live with homies around the world.",
    images: [
      {
        url: "/capybaraLandscape.png",
        width: 1200,
        height: 630,
        alt: "FocusTown - Capybara studying in cozy room",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FocusTown - Study with Friends",
    description: "Focusing feels better with friends. Study live with homies around the world.",
    images: ["/capybaraLandscape.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
