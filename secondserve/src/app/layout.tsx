import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans } from 'next/font/google';
import './globals.css';

// Fraunces' SOFT and WONK axes give the headlines a warmer, hand-set feel.
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], axes: ['SOFT', 'WONK', 'opsz'] });
const instrument = Instrument_Sans({ variable: '--font-instrument', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SecondServe: good food deserves a second serving',
  description: 'Extra food from local businesses, matched to food banks and volunteer drivers before closing time.',
};

// Runs before the page paints: use the visitor's saved motion choice, otherwise their device setting.
// A fixed string with no user input, so it is safe to inline.
const MOTION_SCRIPT = `try{var m=localStorage.getItem('secondserve.motion');if(m!=='full'&&m!=='calm'){m=matchMedia('(prefers-reduced-motion: reduce)').matches?'calm':'full'}document.documentElement.dataset.motion=m}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrument.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
