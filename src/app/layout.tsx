import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Izabela & Adelin | Nunta Noastră',
  description: 'Împărtășiți cu noi momentele frumoase de la nunta noastră.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
