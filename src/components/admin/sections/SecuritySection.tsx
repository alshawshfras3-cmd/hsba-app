import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck, CheckCircle2, Copy, Terminal, KeyRound } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export function SecuritySection() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    }
    loadUser();
  }, []);

  const sqlCommand = `-- إضافة مستخدم مشرف جديد للوحة التحكم بأمان كامل:
INSERT INTO public.admins (user_id) 
VALUES ('YOUR_USER_UUID_HERE');`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm font-sans space-y-8 text-right" dir="rtl">
      
      {/* Header Info */}
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <span>مركز الأمان ومراقبة الصلاحيات الأمنية (Supabase Auth)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          تم تحديث وتامين النظام بالكامل. يتم فرض الصلاحيات أمنياً من جهة الخادم باستخدام سياسات مستوى الصفوف (Row Level Security) والتحقق اللامركزي.
        </p>
      </div>

      {/* Grid status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-950">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black">حماية الصلاحيات المطبقة حالياً</h3>
          </div>
          <ul className="space-y-2 text-xs text-emerald-800 font-medium">
            <li className="flex items-center gap-1.5">
              <span className="text-[10px]">🟢</span> 
              <span>تم تشفير وفصل الجلسات عبر خادم Supabase (لا يتم استخدام sessionStorage).</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[10px]">🟢</span> 
              <span>لا يمكن لأي مستخدم عادي تعديل هوامش الربح أو إعدادات النظام مالم يدرج رقم حسابه الفريد بجدول <code>admins</code>.</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[10px]">🟢</span> 
              <span>تم حظر وحماية وظيفة حذف المستخدمين <code>delete_user_by_admin</code> من الاستدعاء العام.</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold">حسابك الحالي النشط كمسؤول</h3>
          </div>
          <div className="text-xs text-slate-600 space-y-1.5 font-sans">
            <div>
              <span className="font-bold text-slate-400">البريد الإلكتروني: </span>
              <span className="font-mono bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-800 font-bold">
                {currentUser?.email || 'جاري التحميل...'}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-400">المعرّف الكوني (UUID): </span>
              <span className="font-mono bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-800 break-all inline-block mt-1">
                {currentUser?.id || 'جاري التحميل...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Setup Guideline */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-500" />
          <span>التحكم بالمديرين وإسناد الصلاحيات (عبر SQL Console)</span>
        </h3>
        
        <p className="text-xs text-slate-500 leading-relaxed">
          لإضافة أو تعيين حساب كمسؤول/مدير في لوحة التحكم، قم بتسجيل حسابه أولاً كعضو عادي في التطبيق، ثم قم بنسخ معرّفه (UUID) المتواجد بجدول <code>app_users</code> أو <code>auth.users</code> وتشغيل هذه التوصية في واجهة Supabase SQL Editor:
        </p>

        <div className="relative">
          <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-xl font-mono overflow-x-auto text-left" dir="ltr">
            {sqlCommand}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الكود</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
