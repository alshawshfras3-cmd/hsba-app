import React from 'react';

export default function AdminAuth() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4" dir="rtl">
      <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-4">
        <h2 className="text-sm font-black text-slate-800">هذه الصفحة معطلة لغايات الأمان الفني.</h2>
        <p className="text-xs text-slate-500 font-medium">الرجاء تسجيل الدخول عبر المسار الرسمي للوحة التحكم.</p>
      </div>
    </div>
  );
}
