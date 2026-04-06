# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import json
import os

# تهيئة المسارات
base_dir = 'NetLink-Enterprise-Manager'
suppliers_dir = os.path.join(base_dir, 'Dashboard_Suppliers')

if not os.path.exists(suppliers_dir):
    os.makedirs(suppliers_dir)

# البيانات المستخرجة من الصورة
suppliers_data = [
    {"كود": "100", "اسم المورد": "ماجد أبو عطية", "مدين": "1,500.00", "مسدد": "900.00", "الرصيد": "(600.00)", "ملاحظات": ""},
    {"كود": "101", "اسم المورد": "هيثم البرمكي", "مدين": "1,750.00", "مسدد": "225.00", "الرصيد": "(1,525.00)", "ملاحظات": ""},
    {"كود": "102", "اسم المورد": "يامن النورسي", "مدين": "865.00", "مسدد": "173.00", "الرصيد": "(692.00)", "ملاحظات": ""},
    {"كود": "103", "اسم المورد": "سوبر ماركت إسطنبول", "مدين": "2,500.00", "مسدد": "-", "الرصيد": "(2,500.00)", "ملاحظات": ""},
    {"كود": "104", "اسم المورد": "سوبر ماركت الربيع", "مدين": "500.00", "مسدد": "-", "الرصيد": "(500.00)", "ملاحظات": ""},
    {"كود": "105", "اسم المورد": "شركة تربل كور", "مدين": "6,090.00", "مسدد": "6,090.00", "الرصيد": "-", "ملاحظات": ""},
    {"كود": "106", "اسم المورد": "شركة الغسان", "مدين": "6,533.68", "مسدد": "6,303.10", "الرصيد": "(230.58)", "ملاحظات": ""},
    {"كود": "107", "اسم المورد": "شركة عالم الفضاء", "مدين": "4,870.00", "مسدد": "4,870.00", "الرصيد": "-", "ملاحظات": ""},
    {"كود": "108", "اسم المورد": "ALJABAREEN", "مدين": "302,631.00", "مسدد": "302,631.00", "الرصيد": "-", "ملاحظات": ""}
]

master_list = []

for sup in suppliers_data:
    filename = f"{sup['كود']}_{sup['اسم المورد']}.json"
    filepath = os.path.join(suppliers_dir, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(sup, f, ensure_ascii=False, indent=4)
        
    master_list.append({
        'كود': sup['كود'],
        'الاسم': sup['اسم المورد'],
        'الرصيد': sup['الرصيد'],
        'الملف': f"Dashboard_Suppliers/{filename}"
    })

# إنشاء ملف مدير الموردين الرئيسي
with open(os.path.join(base_dir, 'مدير_الموردين_الرئيسي.md'), 'w', encoding='utf-8') as f:
    f.write("# مدير الموردين الرئيسي - شركة NetLink\n\n")
    f.write("جدول شامل للوصول السريع لبيانات الموردين وتعديلها.\n\n")
    f.write("| كود المورد | اسم المورد | الرصيد الحالي | رابط ملف التحرير |\n")
    f.write("| :--- | :--- | :--- | :--- |\n")
    for sup in master_list:
        abs_path = os.path.abspath(os.path.join(base_dir, sup['الملف'])).replace('\\', '/')
        f.write(f"| {sup['كود']} | {sup['الاسم']} | {sup['الرصيد']} | [فتح ملف التعديل](file:///{abs_path}) |\n")

print(f"SUCCESS: Generated {len(suppliers_data)} supplier files and index.")
