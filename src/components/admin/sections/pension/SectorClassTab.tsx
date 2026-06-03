import React from 'react';
import { SectorClassificationMapping } from '../../../../types/pension-rules';
import { SectorId } from '../../../../types';
import { saveSectorClassificationMapping } from '../../../../lib/pensionDb';

interface SectorClassTabProps {
  sectorMappings: SectorClassificationMapping[];
  setSectorMappings: React.Dispatch<React.SetStateAction<SectorClassificationMapping[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

export default function SectorClassTab({
  sectorMappings,
  setSectorMappings,
  showToast
}: SectorClassTabProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-6 font-sans">
      <div>
        <h3 className="text-md font-bold text-gray-900">خرائط تصنيف القطاعات (قوي / ضعيف)</h3>
        <p className="text-xs text-slate-500 mt-1">تستخدم بعض الجهات التمويلية كالبنك الأهلي تصنيفًا ثنائيًا للقطاعات الوظيفية لتطبيق معادلات تقاعد مختلفة بناءً على تصنيف القطاع.</p>
      </div>

      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed font-semibold">
        ℹ️ تنويه الأهلي (Alahli):
        <ul className="list-disc list-inside mt-1 space-y-1 font-normal text-blue-700 text-[11px]">
          <li><strong>القطاعات القوية (Strong):</strong> حكومي مدني، شبه حكومي، شركات كبرى، عسكري ضابط. (تقاعدها: 80% إذا تبقى له أكثر من 5 سنوات، و 70% إذا كان المتبقي 5 سنوات أو أقل).</li>
          <li><strong>القطاعات الضعيفة (Weak):</strong> غيرها من القطاعات كعسكري أفراد. (تقاعدها: 70% إذا تبقى له أكثر من 5 سنوات، و 60% إذا كان المتبقي 5 سنوات أو أقل).</li>
        </ul>
      </div>

      <div className="border border-slate-150 rounded-2xl overflow-x-auto shadow-xs">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-extrabold text-[#111827] border-b border-slate-150">
              <th className="px-6 py-3.5">القطاع المهني</th>
              <th className="px-6 py-3.5">مفتاح القطاع كود</th>
              <th className="px-6 py-3.5 text-center">التصنيف المعياري الحالي (للأهلي)</th>
              <th className="px-6 py-3.5 text-center">تحديث التصنيف الفوري</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-[#111827]">
            {[
              { id: 'gov_civil', label: 'حكومي مدني', defaultClass: 'strong' },
              { id: 'semi_gov', label: 'شبه حكومي', defaultClass: 'strong' },
              { id: 'companies', label: 'شركات كبرى (أرامكو/سابك)', defaultClass: 'strong' },
              { id: 'military_officer', label: 'عسكري (ضباط)', defaultClass: 'strong' },
              { id: 'military_individual', label: 'عسكري (أفراد)', defaultClass: 'weak' },
              { id: 'retired', label: 'متقاعد حالي', defaultClass: 'strong' }
            ].map((sec) => {
              const customMapping = sectorMappings.find(m => m.bankId === 'alahli' && m.sectorId === sec.id);
              const currentClass = customMapping ? customMapping.bankSectorId : sec.defaultClass;
              const isStrong = currentClass === 'strong';

              return (
                <tr key={sec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold">{sec.label}</td>
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-500">{sec.id}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isStrong
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {isStrong ? 'قوي (Strong)' : 'ضعيف (Weak)'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={async () => {
                        const updatedClass = isStrong ? 'weak' : 'strong';
                        const nextMapping: SectorClassificationMapping = {
                          id: customMapping?.id || `map_alahli_${sec.id}_${Date.now()}`,
                          bankId: 'alahli',
                          sectorId: sec.id as SectorId,
                          bankSectorId: updatedClass
                        };
                        // Save locally
                        setSectorMappings(prev => {
                          const filtered = prev.filter(m => !(m.bankId === 'alahli' && m.sectorId === sec.id));
                          return [...filtered, nextMapping];
                        });
                        // Save DB
                        try {
                          await saveSectorClassificationMapping(nextMapping);
                          showToast(`تم تعديل قطاع ${sec.label} بنجاح إلى ${isStrong ? 'ضعيف' : 'قوي'}!`, 'success');
                        } catch (err) {
                          console.error(err);
                          showToast('خطأ أثناء حفظ التصنيف لقاعدة البيانات', 'refuse');
                        }
                      }}
                      className="text-[10px] font-extrabold text-[#0057B8] hover:underline cursor-pointer"
                    >
                      🔄 تبديل التصنيف
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
