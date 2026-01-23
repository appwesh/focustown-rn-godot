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
    siteName: "FocusTown",
    title: "FocusTown - Study with Friends",
    description: "Focusing feels better with friends. Study live with homies around the world.",
    images: [
      {
        url: "/focusbanner.png",
        width: 1200,
        height: 630,
        alt: "FocusTown - Study with friends in a virtual library",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FocusTown - Study with Friends",
    description: "Focusing feels better with friends. Study live with homies around the world.",
    images: ["/focusbanner.png"],
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
