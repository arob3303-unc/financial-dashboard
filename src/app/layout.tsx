import './globals.css';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

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
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="auth-button">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="auth-button signup-button">Sign Up</button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
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
