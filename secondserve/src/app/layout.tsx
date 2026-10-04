import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';

// Geist for the interface, Geist Mono for live numbers and labels, and Instrument Serif italic
// for the single accent phrase in each headline.
const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const serif = Instrument_Serif({ variable: '--font-serif', subsets: ['latin'], weight: '400', style: ['italic'] });

export const metadata: Metadata = {
  title: 'SecondServe: good food deserves a second serving',
  description: 'Extra food from local businesses, matched to food banks and volunteer drivers before closing time.',
};

export const viewport: Viewport = {
  themeColor: '#0b0c12',
  colorScheme: 'dark',
};

// Runs before the page paints: use the visitor's saved motion choice, otherwise their device setting.
// A fixed string with no user input, so it is safe to inline.
const MOTION_SCRIPT = `try{var m=localStorage.getItem('secondserve.motion');if(m!=='full'&&m!=='calm'){m=matchMedia('(prefers-reduced-motion: reduce)').matches?'calm':'full'}document.documentElement.dataset.motion=m}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
