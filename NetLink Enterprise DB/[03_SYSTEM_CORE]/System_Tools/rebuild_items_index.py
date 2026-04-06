# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import os
import json

base_dir = 'NetLink-Enterprise-Manager'
items_root = os.path.join(base_dir, 'Dashboard_Items')
index_file = os.path.join(base_dir, 'مدير_الأصناف_الرئيسي.md')

categories = ['Hardware', 'Packages']
cat_titles = {'Hardware': 'الأجهزة والمعدات الملموسة', 'Packages': 'باقات إنترنت SAS والاشتراكات'}

all_items = {}

for cat in categories:
    all_items[cat] = []
    cat_dir = os.path.join(items_root, cat)
    if not os.path.exists(cat_dir): continue
    
    for filename in os.listdir(cat_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(cat_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    all_items[cat].append({
                        'id': data.get('م', 0),
                        'name': data.get('اسم الصنف', 'بدون اسم'),
                        'balance': data.get('الرصيد', 0),
                        'price': data.get('البيع', 0),
                        'path': f"Dashboard_Items/{cat}/{filename}"
                    })
                except:
                    continue
    all_items[cat].sort(key=lambda x: x['id'])

with open(index_file, 'w', encoding='utf-8') as f:
    f.write("# مدير الأصناف والمخزون - شركة NetLink\n\n")
    f.write("النظام مرتب حالياً في قسمين (الأجهزة) و (الباقات).\n\n")
    
    for cat in categories:
        f.write(f"## {cat_titles[cat]}\n")
        f.write("| م | اسم الصنف / الباقة | الرصيد الحالي | سعر البيع | رابط ملف التحرير |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")
        for item in all_items[cat]:
            abs_path = os.path.abspath(os.path.join(base_dir, item['path'])).replace('\\', '/')
            f.write(f"| {item['id']} | {item['name']} | {item['balance']} | {item['price']} ₪ | [فتح ملف التعديل](file:///{abs_path}) |\n")
        f.write("\n")

print(f"SUCCESS: Rebuilt separated index with {sum(len(v) for v in all_items.values())} entries.")
