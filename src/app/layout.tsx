import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movida ERP",
  description: "Sistema de Gestión Total - Movida TCI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased text-slate-900">
        {children}
      </body>
    </html>
  );
}
