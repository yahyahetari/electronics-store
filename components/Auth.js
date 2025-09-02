import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Loader from "./Loader";
import VerificationForm from "./VerificationForm";

export default function Auth({ onClose }) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [formData, setFormData] = useState({
    signup_full_name: '',
    signup_email: '',
    signup_password: '',
    login_email: '',
    login_password: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // تقليل الوقت

    return () => clearTimeout(timer);
  }, []);

  // التحقق من حالة الجلسة
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isVerified) {
      onClose();
    }
  }, [session, status, onClose]);

  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
    setError('');
    setShowVerification(false); // إخفاء نموذج التحقق عند تغيير التبويب
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (activeTab === 'signup') {
        // التحقق من البيانات المطلوبة
        if (!formData.signup_full_name || !formData.signup_email || !formData.signup_password) {
          setError('جميع الحقول مطلوبة');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.signup_full_name.trim(),
            email: formData.signup_email.toLowerCase().trim(),
            password: formData.signup_password
          })
        });

        const data = await response.json();

        if (response.ok) {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          setVerificationCode(code);
          
          const emailResponse = await fetch('/api/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: formData.signup_email.toLowerCase().trim(), 
              code 
            })
          });
          
          if (emailResponse.ok) {
            setShowVerification(true);
          } else {
            setError('فشل في إرسال رمز التحقق');
          }
        } else {
          setError(data.error || 'فشل في إنشاء الحساب');
        }
      } else {
        // التحقق من البيانات المطلوبة للدخول
        if (!formData.login_email || !formData.login_password) {
          setError('البريد الإلكتروني وكلمة المرور مطلوبان');
          setLoading(false);
          return;
        }

        // التحقق من وجود المستخدم أولاً
        const checkUserResponse = await fetch('/api/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.login_email.toLowerCase().trim() 
          })
        });

        if (!checkUserResponse.ok) {
          setError('المستخدم غير موجود');
          setLoading(false);
          return;
        }

        // إرسال رمز التحقق
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setVerificationCode(code);
        
        const emailResponse = await fetch('/api/send-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.login_email.toLowerCase().trim(), 
            code 
          })
        });
        
        if (emailResponse.ok) {
          setShowVerification(true);
        } else {
          setError('فشل في إرسال رمز التحقق');
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('حدث خطأ، الرجاء المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (enteredCode) => {
    if (enteredCode !== verificationCode) {
      setError('الرمز غير صحيح');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (activeTab === 'signup') {
        // تحديث حالة التحقق في قاعدة البيانات
        const verifyResponse = await fetch('/api/verify-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.signup_email.toLowerCase().trim() 
          })
        });

        if (!verifyResponse.ok) {
          setError('فشل في التحقق من المستخدم');
          setLoading(false);
          return;
        }

        // تسجيل الدخول بعد التحقق
        const result = await signIn("credentials", {
          redirect: false,
          email: formData.signup_email.toLowerCase().trim(),
          password: formData.signup_password
        });

        if (result?.error) {
          setError('فشل في تسجيل الدخول: ' + result.error);
        } else if (result?.ok) {
          setIsVerified(true);
          // سيتم إغلاق النموذج تلقائياً عبر useEffect
        }
      } else {
        // تسجيل دخول مباشر
        const result = await signIn("credentials", {
          redirect: false,
          email: formData.login_email.toLowerCase().trim(),
          password: formData.login_password
        });

        if (result?.error) {
          setError('بيانات الدخول غير صحيحة');
        } else if (result?.ok) {
          setIsVerified(true);
          // سيتم إغلاق النموذج تلقائياً عبر useEffect
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('حدث خطأ أثناء التحقق');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !showVerification) {
    return (
      <div className="flex items-center justify-center bg-white p-8">
        <Loader />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center bg-white p-8">
        <Loader />
      </div>
    );
  }

  if (status === 'authenticated' && session?.user?.isVerified) {
    onClose();
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-img bg-cover h-screen bg-glass overflow-y-hidden">
      <div className="w-full max-w-[600px] mx-auto my-5">
        <div className="bg-[#f1f1f1] p-10 rounded-2xl shadow-[0_4px_10px_4px_rgba(19,35,47,3)]">
          {showVerification ? (
            <VerificationForm 
              onVerify={handleVerify} 
              correctCode={verificationCode}
              loading={loading}
            />
          ) : (
            <div className="form">
              <ul className="flex justify-between list-none p-0 mb-5">
                <li className="flex-1 mx-1">
                  <a
                    href="#signup"
                    onClick={(e) => handleTabClick(e, 'signup')}
                    className={`block py-2.5 px-2.5 text-center text-xl cursor-pointer transition-all duration-500 ease-in-out rounded-2xl ${activeTab === 'signup'
                        ? 'bg-[#000000] text-white'
                        : 'bg-[rgba(0,0,0,0.74)] text-[#a0b3b0] hover:bg-h-glass hover:text-white'
                      }`}
                  >
                    حساب جديد
                  </a>
                </li>
                <li className="flex-1 mx-1">
                  <a
                    href="#login"
                    onClick={(e) => handleTabClick(e, 'login')}
                    className={`block py-2.5 px-2.5 text-center text-xl cursor-pointer transition-all duration-500 ease-in-out rounded-2xl ${activeTab === 'login'
                        ? 'bg-[#000000] text-white'
                        : 'bg-[rgba(0,0,0,0.74)] text-[#a0b3b0] hover:bg-h-glass hover:text-white'
                      }`}
                  >
                    تسجيل الدخول
                  </a>
                </li>
              </ul>

              {error && <p className="text-red-500 text-xl text-center mb-4">{error}</p>}

              <div className="w-full">
                <div id="signup" style={{ display: activeTab === 'signup' ? 'block' : 'none' }}>
                  <h1 className="text-center text-black font-light text-3xl mb-2.5">مرحباً</h1>
                  <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="mb-4">
                      <div className="w-full relative">
                        <input
                          type="text"
                          required
                          name="signup_full_name"
                          value={formData.signup_full_name}
                          onChange={handleInputChange}
                          className="text-lg w-full py-2.5 px-4 bg-transparent border-2 border-[#777] text-white rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#000]"
                          placeholder="الاسم الكامل"
                          autoComplete="new-full-name"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="mb-2 relative">
                      <input
                        type="email"
                        required
                        name="signup_email"
                        value={formData.signup_email}
                        onChange={handleInputChange}
                        className="text-lg w-full py-2.5 px-4 bg-transparent border-2 border-[#777] text-white rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#000]"
                        placeholder="البريد الإلكتروني"
                        autoComplete="new-email"
                        disabled={loading}
                      />
                    </div>
                    <div className="mb-8 relative">
                      <input
                        type={showSignupPassword ? "text" : "password"}
                        required
                        name="signup_password"
                        value={formData.signup_password}
                        onChange={handleInputChange}
                        dir="rtl"
                        className="text-lg w-full py-2.5 px-4 pr-5 bg-transparent border-2 border-[#777] text-black rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#000] text-right"
                        placeholder="كلمة المرور"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                        disabled={loading}
                      >
                        {showSignupPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-2.5 px-0 text-xl font-normal bg-[#000000] text-white rounded-2xl cursor-pointer transition-all duration-500 ease-in-out hover:bg-[#333333] disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'جاري التسجيل...' : 'تسجيل'}
                    </button>
                  </form>
                </div>
                
                <div id="login" style={{ display: activeTab === 'login' ? 'block' : 'none' }}>
                  <h1 className="text-center text-black font-light text-3xl mb-2.5">مرحباً بعودتك</h1>
                  <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="mb-10 relative">
                      <input
                        type="email"
                        required
                        name="login_email"
                        value={formData.login_email}
                        onChange={handleInputChange}
                        className="text-lg w-full py-2.5 px-4 bg-transparent border-2 border-[#777] text-white rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#000]"
                        placeholder="البريد الإلكتروني"
                        autoComplete="username"
                        disabled={loading}
                      />
                    </div>
                    <div className="mb-10 relative">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        name="login_password"
                        value={formData.login_password}
                        onChange={handleInputChange}
                        dir="rtl"
                        className="text-lg w-full py-2.5 px-4 pr-5 bg-transparent border-2 border-[#777] text-black rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#000] text-right"
                        placeholder="كلمة المرور"
                        autoComplete="current-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                        disabled={loading}
                      >
                        {showLoginPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-2.5 px-0 text-xl font-normal bg-[#000000] text-white rounded-2xl cursor-pointer transition-all duration-500 ease-in-out hover:bg-[#333333] disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}