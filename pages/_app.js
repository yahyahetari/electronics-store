import { CartContextProvider } from '@/components/CartContext';
import '../styles/globals.css';
import Header from "@/components/Header";
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from 'next-auth/react';
import Footer from '@/components/Footer';


export default function App({ 
  Component, pageProps : {session, ...pageProps } 
}) {
  return (
    <SessionProvider session={session}>
      <CartContextProvider>
        <div className="flex flex-col min-h-screen">
            
          <Header />
          <main className="flex-grow pt-20"> 
            <Toaster position="top-center" reverseOrder={false} />
              <Component {...pageProps} />
          </main>
          <Footer />
        </div>
      </CartContextProvider>
    </SessionProvider>
  );
}
