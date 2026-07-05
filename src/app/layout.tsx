import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'The Black Bull AI Oracle 🐂 | Solana Trenches',
  description:
    'Check your $ANSEM holdings, claim your simulated airdrop allocation, and chat with the most savage bull in the Solana trenches.',
  keywords: 'ANSEM, Solana, Memecoin, AI, Chatbot, Crypto, Airdrop, The Black Bull',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-black text-gray-100 selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
