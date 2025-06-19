import './globals.css';
import { Inter } from 'next/font/google';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Navbar from './Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Financial Dashboard',
  description: 'Manage your stocks and options',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <header className="navbar">
            <div className="navbar-content">
              <div className='navbar-left'>
                <div className='settings-icon'><Navbar /></div>
              </div>
              <div className="navbar-middle">Extro</div>
              <div className="navbar-right">
                <SignedOut>
                  <SignInButton />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </div>
          </header>
            {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
