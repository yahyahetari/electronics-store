import NextAuth from 'next-auth'
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"
import { compare } from 'bcryptjs'

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // التحقق من وجود البيانات المطلوبة
          if (!credentials?.email || !credentials?.password) {
            console.log('Missing email or password');
            return null;
          }

          const client = await clientPromise;
          const usersCollection = client.db().collection("users");
          
          const user = await usersCollection.findOne({ 
            email: credentials.email.toLowerCase() 
          });
          
          console.log('User found:', user ? 'Yes' : 'No');
          
          if (!user) {
            console.log('User not found for email:', credentials.email);
            return null;
          }
          
          // التحقق من كلمة المرور
          const isPasswordValid = await compare(credentials.password, user.password);
          console.log('Password valid:', isPasswordValid);
          
          if (!isPasswordValid) {
            console.log('Invalid password for user:', credentials.email);
            return null;
          }
          
          // التحقق من حالة التحقق
          if (!user.isVerified) {
            console.log('User not verified:', credentials.email);
            throw new Error("يرجى التحقق من بريدك الإلكتروني قبل تسجيل الدخول");
          }
          
          console.log('User authenticated successfully:', user.email);
          
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
            image: user.image || '/user.jpg'
          };
        } catch (error) {
          console.error('Auth error:', error);
          if (error.message.includes('التحقق من بريدك الإلكتروني')) {
            throw error; // إعادة رمي خطأ التحقق
          }
          return null;
        }
      }
    })
  ],
  
  // إزالة MongoDB adapter عند استخدام credentials
  // adapter: MongoDBAdapter(clientPromise), // احذف هذا السطر
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.isVerified = user.isVerified;
        token.picture = user.image;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.isVerified = token.isVerified;
        session.user.image = token.picture;
        
        // تحديث الصورة من قاعدة البيانات
        try {
          const client = await clientPromise;
          const usersCollection = client.db().collection("users");
          const dbUser = await usersCollection.findOne({ email: session.user.email });
          if (dbUser?.image) {
            session.user.image = dbUser.image;
          }
        } catch (error) {
          console.error('Error updating session image:', error);
        }
      }
      return session;
    },
    
    async signIn({ user, account, profile, email, credentials }) {
      // السماح بتسجيل الدخول إذا كان المستخدم محقق
      return user?.isVerified === true;
    }
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  pages: {
    signIn: '/auth', // صفحة تسجيل الدخول المخصصة
    error: '/auth', // صفحة الأخطاء
  },
  
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);