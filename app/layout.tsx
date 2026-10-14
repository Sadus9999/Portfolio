import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Demigod Portfolio CMS",
  description: "Portfolio gallery administration",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}
