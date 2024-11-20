import { CartContextProvider } from '@/components/CartContext';
import '../styles/globals.css';
import Header from "@/components/Header";
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from 'next-auth/react';
import Footer from '@/components/Footer';
import { DefaultSeo } from 'next-seo';
import Head from 'next/head';

export default function App({ 
  Component, pageProps : {session, ...pageProps } 
}) {
  return (
    <SessionProvider session={session}>
      <CartContextProvider>
        <Head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

        <DefaultSeo
          title="هتاري - متجر الهواتف المحمولة | Hetari E-Store"
          description="هتاري - متجرك الأول للهواتف المحمولة وإكسسوارات التقنية. تسوق الآن بأفضل الأسعار مع خدمة توصيل سريعة"
          canonical="https://hetari-e-store.vercel.app"
          openGraph={{
            type: 'website',
            locale: 'ar_SA',
            url: 'https://hetari-e-store.vercel.app',
            siteName: 'هتاري - Hetari',
          }}
          additionalMetaTags={[
            {
              name: 'keywords',
              content: 'هتاري, متجر هتاري, hetari, هواتف محمولة, اكسسوارات جوالات, جوالات, متجر الكتروني'
            },
          ]}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              "name": "هتاري - Hetari",
              "url": "https://hetari-e-store.vercel.app",
              "description": "متجر هتاري للهواتف المحمولة والإكسسوارات"
            })
          }}
        />

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
