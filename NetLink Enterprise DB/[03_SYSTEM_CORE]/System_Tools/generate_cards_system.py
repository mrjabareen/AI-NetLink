import pandas as pd
# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import os
import json

# تهيئة المسارات
base_dir = 'NetLink-Enterprise-Manager'
cards_dir = os.path.join(base_dir, 'Dashboard_Cards')
excel_dir = 'بطاقات netlink'

if not os.path.exists(cards_dir):
    os.makedirs(cards_dir)

# بيانات التقرير من نظام SAS (الصورة) لتدقيق الملكية والاستهلاك
sas_report = [
    {"series": "2024-33", "owner": "majed424", "used": 10, "qty": 10, "value": 50},
    {"series": "2024-34", "owner": "majed424", "used": 7, "qty": 10, "value": 75},
    {"series": "2024-50", "owner": "Ameerteam", "used": 2, "qty": 10, "value": 50},
    {"series": "2024-51", "owner": "Ameerteam", "used": 2, "qty": 10, "value": 100},
    {"series": "2024-70", "owner": "admin", "used": 3, "qty": 500, "value": 25},
    {"series": "2024-71", "owner": "admin", "used": 4, "qty": 500, "value": 75},
    {"series": "2024-72", "owner": "admin", "used": 5, "qty": 500, "value": 100},
    {"series": "2024-73", "owner": "admin", "used": 8, "qty": 500, "value": 50},
    {"series": "2024-74", "owner": "General", "used": 5, "qty": 5, "value": 110},
    {"series": "2024-75", "owner": "General", "used": 5, "qty": 5, "value": 75},
    {"series": "2024-76", "owner": "majed424", "used": 3, "qty": 10, "value": 25},
    {"series": "2024-77", "owner": "Ameerteam", "used": 5, "qty": 10, "value": 25},
    {"series": "2026-6", "owner": "admin", "used": 7, "qty": 7, "value": 4}
]

master_index = []

for batch in sas_report:
    manager_dir = os.path.join(cards_dir, batch['owner'])
    if not os.path.exists(manager_dir):
        os.makedirs(manager_dir)
        
    excel_file = os.path.join(excel_dir, f"{batch['series']}.xlsx")
    
    if os.path.exists(excel_file):
        df = pd.read_excel(excel_file)
        
        # تحويل البيانات إلى قائمة ديكشنري
        cards_list = df.to_dict(orient='records')
        
        # حفظ الملف في مجلد المدير
        json_filename = f"{batch['series']}_{batch['value']}ILS.json"
        json_path = os.path.join(manager_dir, json_filename)
        
        output_data = {
            "Series": batch['series'],
            "Manager": batch['owner'],
            "Total_Qty": batch['qty'],
            "Used_Qty": batch['used'],
            "Available_Qty": batch['qty'] - batch['used'],
            "Card_Value": batch['value'],
            "Cards": cards_list
        }
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=4)
            
        master_index.append({
            "Owner": batch['owner'],
            "Series": batch['series'],
            "Value": batch['value'],
            "Stats": f"{batch['used']}/{batch['qty']}",
            "Balance": batch['qty'] - batch['used'],
            "Link": f"Dashboard_Cards/{batch['owner']}/{json_filename}"
        })

# توليد ملف الفهرس الرئيسي مدير_الكروت_الرئيسي.md
with open(os.path.join(base_dir, 'مدير_الكروت_الرئيسي.md'), 'w', encoding='utf-8') as f:
    f.write("# مدير توزيع كروت الشحن - شركة NetLink\n\n")
    f.write("> [!IMPORTANT]\n")
    f.write("> تم استخراج هذه البيانات بدقة عالية من تقارير SAS وملفات الإرسالية.\n\n")
    
    # توزيع حسب المدير
    for manager in ['admin', 'majed424', 'Ameerteam', 'General']:
        f.write(f"## قسم المدير: {manager}\n")
        f.write("| السلسلة (Series) | فئة الكرت | الاستهلاك (Used/Total) | المتبقي | رابط الملف |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")
        
        manager_batches = [b for b in master_index if b['Owner'] == manager]
        for b in manager_batches:
            abs_path = os.path.abspath(os.path.join(base_dir, b['Link'])).replace('\\', '/')
            f.write(f"| {b['Series']} | {b['Value']} ₪ | {b['Stats']} | **{b['Balance']}** | [فتح الكروت](file:///{abs_path}) |\n")
        f.write("\n")

print(f"SUCCESS: Generated {len(master_index)} card batch files for 4 departments.")
