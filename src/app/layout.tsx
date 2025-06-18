import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import Navbar from './Navbar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="navbar">
            <div className="navbar-content">
              <div className='navbar-left'>Balance: (SOON)</div>
              <div className="navbar-middle">Extro</div>
              <div className="navbar-right">
                <Navbar />
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
