import { CartContextProvider } from '@/components/CartContext';
import '../styles/globals.css';
import Header from "@/components/Header";
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from 'next-auth/react';
import Footer from '@/components/Footer';
import { DefaultSeo } from 'next-seo';
import SEO from '../next-seo.config';
import Head from 'next/head';

export default function App({
  Component, pageProps: { session, ...pageProps }
}) {
  return (
    <SessionProvider session={session}>
      <CartContextProvider>
        <Head>
          <meta charSet="utf-8" />
          <title>هتاري</title>
          <meta name="application-name" content="هتاري" />
          <meta property="og:site_name" content="هتاري" />
          <meta property="og:title" content="هتاري - متجر الهواتف المحمولة" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <DefaultSeo {...SEO} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "هتاري",
              "alternateName": "متجر هتاري",
              "url": "https://hetari-e-store.vercel.app",
              "logo": "https://hetari-e-store.vercel.app/logo.png",
              "description": "متجر هتاري للهواتف المحمولة والإكسسوارات - وجهتك الأولى للحصول على أحدث التقنيات",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "SA"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://hetari-e-store.vercel.app/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
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
