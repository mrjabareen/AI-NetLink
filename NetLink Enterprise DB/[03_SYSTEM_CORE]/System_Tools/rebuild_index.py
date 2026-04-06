# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import os

base_dir = 'NetLink-Enterprise-Manager'
subscribers_dir = os.path.join(base_dir, 'Dashboard_Subscribers')

if not os.path.exists(subscribers_dir):
    print(f"ERROR: Directory {subscribers_dir} not found.")
    exit(1)

master_list = []
# جلب كافة الملفات وترتيبها برمجياً
for filename in sorted(os.listdir(subscribers_dir)):
    if filename.endswith('.json'):
        parts = filename.split('_')
        sub_id = parts[0]
        sub_name = parts[1].replace('.json', '')
        master_list.append({
            'رقم': sub_id,
            'الاسم': sub_name,
            'المسار': f'Dashboard_Subscribers/{filename}'
        })

index_path = os.path.join(base_dir, 'مدير_المشتركين_الرئيسي.md')

with open(index_path, 'w', encoding='utf-8') as f:
    f.write("# مدير المشتركين الرئيسي - النسخة المدمجة\n\n")
    f.write("هذا الجدول يتبع النظام المؤسساتي الجديد لشركة NetLink.\n\n")
    f.write("| رقم | اسم المشترك | رابط ملف التعديل |\n")
    f.write("| :--- | :--- | :--- |\n")
    for sub in master_list:
        abs_path = os.path.abspath(os.path.join(base_dir, sub['المسار'])).replace('\\', '/')
        f.write(f"| {sub['رقم']} | {sub['الاسم']} | [إضغط لفتح ملف {sub['الاسم']}](file:///{abs_path}) |\n")

print(f"SUCCESS: Rebuilt index for {len(master_list)} subscribers.")
