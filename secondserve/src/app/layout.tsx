import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';

// One family, Swiss style: Archivo's weight and width axes give heavy wide headlines,
// condensed uppercase labels (like a departures board) and plain body text.
const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], axes: ['wdth'] });

export const metadata: Metadata = {
  title: 'SecondServe: good food deserves a second serving',
  description: 'Extra food from local businesses, matched to food banks and volunteer drivers before closing time.',
};

export const viewport: Viewport = {
  themeColor: '#121211',
  colorScheme: 'dark',
};

// Runs before the page paints: use the visitor's saved motion choice, otherwise their device setting.
// A fixed string with no user input, so it is safe to inline.
const MOTION_SCRIPT = `try{var m=localStorage.getItem('secondserve.motion');if(m!=='full'&&m!=='calm'){m=matchMedia('(prefers-reduced-motion: reduce)').matches?'calm':'full'}document.documentElement.dataset.motion=m}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
