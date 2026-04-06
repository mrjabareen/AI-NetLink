import json
# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import os

# تهيئة المسارات
base_dir = 'NetLink-Enterprise-Manager'
investors_dir = os.path.join(base_dir, 'Dashboard_Investors')

if not os.path.exists(investors_dir):
    os.makedirs(investors_dir)

# الثوابت العامة من الصورة
global_stats = {
    "كمية الأسهم الكاملة": 66667,
    "كمية الأسهم المتوفرة للبيع": 2364,
    "سعر السهم الواحد": 10.0
}

# بيانات المستثمرين المستخرجة من الصورة
investors_data = [
    {
        "اسم المستثمر": "محمد أبو علي",
        "رصيد الأسهم": 14000,
        "باقي اسهم": 12667,
        "سعر الأسهم": 140000.00,
        "صافي الربح": 747.55
    },
    {
        "اسم المستثمر": "معتصم أبو أحمد",
        "رصيد الأسهم": 10303,
        "باقي اسهم": 2364,
        "سعر الأسهم": 103030.00,
        "صافي الربح": 550.14
    }
]

master_list = []

for inv in investors_data:
    filename = f"{inv['اسم المستثمر']}.json"
    filepath = os.path.join(investors_dir, filename)
    
    # دمج الثوابت مع بيانات المستثمر في ملفه
    full_data = {**global_stats, **inv}
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(full_data, f, ensure_ascii=False, indent=4)
        
    master_list.append({
        'الاسم': inv['اسم المستثمر'],
        'الأسهم': inv['رصيد الأسهم'],
        'القيمة': inv['سعر الأسهم'],
        'الربح': inv['صافي الربح'],
        'الملف': f"Dashboard_Investors/{filename}"
    })

# إنشاء ملف مدير المستثمرين الرئيسي
with open(os.path.join(base_dir, 'مدير_المستثمرين_الرئيسي.md'), 'w', encoding='utf-8') as f:
    f.write("# مدير المستثمرين - شركة NetLink\n\n")
    f.write("### إحصائيات الأسهم العامة:\n")
    f.write(f"- **إجمالي أسهم الشركة:** {global_stats['كمية الأسهم الكاملة']} سهم\n")
    f.write(f"- **الأسهم المتاحة للبيع:** {global_stats['كمية الأسهم المتوفرة للبيع']} سهم\n")
    f.write(f"- **سعر السهم الحالي:** {global_stats['سعر السهم الواحد']} ₪\n\n")
    
    f.write("### كشف حساب المستثمرين:\n")
    f.write("| اسم المستثمر | رصيد الأسهم | القيمة الإجمالية | صافي الربح | رابط ملف التحرير |\n")
    f.write("| :--- | :--- | :--- | :--- | :--- |\n")
    for inv in master_list:
        abs_path = os.path.abspath(os.path.join(base_dir, inv['الملف'])).replace('\\', '/')
        f.write(f"| {inv['الاسم']} | {inv['الأسهم']} | {inv['القيمة']} ₪ | {inv['الربح']} ₪ | [فتح ملف التعديل](file:///{abs_path}) |\n")

print(f"SUCCESS: Generated {len(investors_data)} investor files and master index.")
