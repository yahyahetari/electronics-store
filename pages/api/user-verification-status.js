// pages/api/user-verification-status.js
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const client = await clientPromise;
    const usersCollection = client.db().collection("users");
    
    // البحث عن المستخدم في قاعدة البيانات
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // إرجاع حالة التحقق
    res.status(200).json({ 
      isVerified: user.isVerified || false,
      email: user.email 
    });

  } catch (error) {
    console.error('خطأ في التحقق من حالة المستخدم:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}