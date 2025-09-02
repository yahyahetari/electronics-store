import { compare } from 'bcryptjs';
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const client = await clientPromise;
    const usersCollection = client.db().collection("users");
    
    // البحث عن المستخدم
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    // التحقق من كلمة المرور
    const isPasswordValid = await compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    // إرجاع حالة التحقق
    res.status(200).json({ 
      isVerified: user.isVerified || false,
      email: user.email,
      name: user.name
    });
    
  } catch (error) {
    console.error('Error checking user verification:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
}