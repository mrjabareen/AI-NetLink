const fs = require('fs');
const path = 'c:/Users/aljabareen/Desktop/AI NetLink/AI NetLink Interface/ai-net-link/src/components/NetworkRadiusTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update form UI (The input field)
const targetForm = /<div className="col-span-2">\s*<label className="text-xs font-bold text-slate-500 mb-1 flex items-center">\s*\{isRTL \? 'اسم الخدمة \(Profile Name\)' : 'Profile Name'\}\s*<InfoTooltip text=\{isRTL \? 'الاسم الذي سيظهر في الميكروتيك ولوحة التحكم' : 'The internal name shown in MikroTik and NetLink'\} \/>\s*<\/label>\s*<input type="text" value=\{profileForm\.name\} onChange=\{\(e\) => setProfileForm\(\{\.\.\.profileForm, name: e\.target\.value\}\)\} className="w-full mt-1 bg-white dark:bg-\[#18181B\] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 focus:border-teal-500 text-slate-800 dark:text-slate-100" \/>\s*<\/div>/;

const replacementForm = `                                     <div className="col-span-2 md:col-span-1">
                                         <label className="text-xs font-bold text-slate-500 mb-1 flex items-center">
                                             {isRTL ? 'اسم الخدمة (Display Name)' : 'Display Name'}
                                             <InfoTooltip text={isRTL ? 'الاسم الذي سيظهر في لوحة التحكم وللمشتركين' : 'The friendly name shown in the dashboard'} />
                                         </label>
                                         <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 focus:border-teal-500 text-slate-800 dark:text-slate-100" />
                                     </div>
                                     <div className="col-span-2 md:col-span-1">
                                         <label className="text-xs font-bold text-indigo-500 mb-1 flex items-center">
                                             {isRTL ? 'اسم البروفايل في المايكروتيك' : 'MikroTik Name'}
                                             <InfoTooltip text={isRTL ? 'يجب أن يطابق الاسم الموجود في الـ Profiles في المايكروتيك' : 'MUST match the Profile name on your MikroTik router'} />
                                         </label>
                                         <input type="text" value={profileForm.mikrotikName || ''} onChange={(e) => setProfileForm({...profileForm, mikrotikName: e.target.value})} placeholder="e.g. Fiber-50M" className="w-full mt-1 bg-white dark:bg-[#18181B] border border-indigo-200 dark:border-indigo-900/50 rounded-xl px-4 py-2 focus:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-mono text-sm" />
                                     </div>`;

if (targetForm.test(content)) {
    content = content.replace(targetForm, replacementForm);
    console.log("Form UI updated");
} else {
    console.log("Form UI target NOT found");
}

// 2. Update Table UI
const targetTable = /<td className="p-4">\s*<div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">\s*\{p\.name\}\s*<span className="text-\[10px\] bg-slate-200 dark:bg-slate-700 px-2 py-0\.5 rounded text-slate-500 dark:text-slate-400 uppercase">\{p\.type\}<\/span>\s*<\/div>\s*<\/td>/;

const replacementTable = `<td className="p-4">
                                                         <div className="font-bold text-slate-800 dark:text-slate-200 flex flex-col">
                                                             <div className="flex items-center gap-2">
                                                                {p.name}
                                                                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 uppercase">{p.type}</span>
                                                             </div>
                                                             {p.mikrotikName && (
                                                                <div className="text-[10px] text-indigo-500 font-mono mt-0.5">
                                                                    MW ID: {p.mikrotikName}
                                                                </div>
                                                             )}
                                                         </div>
                                                     </td>`;

if (targetTable.test(content)) {
    content = content.replace(targetTable, replacementTable);
    console.log("Table UI updated");
} else {
    console.log("Table UI target NOT found");
}

fs.writeFileSync(path, content, 'utf8');
