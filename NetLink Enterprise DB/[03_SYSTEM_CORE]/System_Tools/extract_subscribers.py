import pandas as pd
import json
# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import os
import re
from datetime import datetime

# تهيئة المسارات
excel_file = 'مشتركين شركة NetLink.xlsx'
base_dir = 'NetLink-Subscribers-System'
files_dir = os.path.join(base_dir, 'Subscribers_Files')

if not os.path.exists(files_dir):
    os.makedirs(files_dir)

def sanitize_filename(filename):
    return re.sub(r'[\\/*?:"<>|]', "", str(filename)).strip()

# التعديلات المطلوبة من المدير للمسميات والربط
column_mapping = {
    1: 'اســم العميل',
    2: 'بيانـــات العـــميل',
    4: 'عليه دين',
    5: 'قام بتسديد',
    6: 'الرصيد المتبقي له',
    7: 'رمز المشترك',
    8: 'مدة التزام العقد',
    9: 'تاريخ بداية العقد مع الشركة',
    3: 'نوع الاشتراك',
    10: 'سرعة الخط',
    11: 'قيمة الفاتورة',
    12: 'ip-laitpem',
    13: 'الوكيل المسؤل',
    14: 'حالة الحساب',
    16: 'ماك الايت بيم',  # تم تعديله من "سيريل لايت بيم"
    17: 'جهاز الايت بيم من صاحبة',
    15: 'اجهزة تعود الى الشركة', # كانت "يدفع"
    18: 'عنوان المشترك',
    20: 'اسم دخول المشترك',
    21: 'كلمة سر دخول المشترك',
    22: 'تاريخ ناهية الاشتراك',
    19: 'ملاحظات اخرى'
}

def json_serial(obj):
    if isinstance(obj, (datetime, pd.Timestamp)):
        return obj.strftime('%Y-%m-%d')
    return str(obj)

try:
    df = pd.read_excel(excel_file, header=None)
    data_rows = df.iloc[5:]
    
    master_list = []
    
    for _, row in data_rows.iterrows():
        if pd.isna(row[1]):
            continue
            
        subscriber_data = {}
        subscriber_data['رقم'] = str(row[0]).split('.')[0] if not pd.isna(row[0]) else ""
        
        # استخراج الملاحظات مبكراً لمعالجتها
        raw_note = str(row[19]) if not pd.isna(row[19]) else ""
        
        # حقول بيانات دخول اللايت بيم الجديدة
        subscriber_data['اسم دخول اللايت بيم'] = ""
        subscriber_data['باسورد اللايت بيم'] = ""
        
        # تحليل بيانات الدخول من الملاحظة
        # الصيغة: netlink\\\Sniper.2591993
        if 'netlink' in raw_note.lower() and '\\' in raw_note:
            parts = raw_note.split('\\')
            # تصفية الأجزاء الفارغة الناتجة عن تكرار الـ \
            clean_parts = [p for p in parts if p.strip()]
            if len(clean_parts) >= 2:
                subscriber_data['اسم دخول اللايت بيم'] = clean_parts[0].strip()
                subscriber_data['باسورد اللايت بيم'] = clean_parts[1].strip()
                # إذا كانت الملاحظة تحتوي فقط على هذه البيانات، نقوم بتفريغ "ملاحظات اخرى"
                subscriber_data['ملاحظات اخرى'] = ""
            else:
                subscriber_data['ملاحظات اخرى'] = raw_note
        else:
            subscriber_data['ملاحظات اخرى'] = raw_note
        
        # تعبئة بقية الحقول حسب الخارطة
        for col_index, field_name in column_mapping.items():
            if field_name == 'ملاحظات اخرى': # تم معالجتها بالأعلى
                continue
                
            val = row[col_index]
            
            # معالجة الخانات الفارغة
            if pd.isna(val) or str(val).strip().lower() == 'nan':
                subscriber_data[field_name] = ""
            elif isinstance(val, (datetime, pd.Timestamp)):
                subscriber_data[field_name] = val.strftime('%Y-%m-%d')
            else:
                subscriber_data[field_name] = val
        
        sub_id = subscriber_data['رقم']
        sub_name = sanitize_filename(subscriber_data['اســم العميل'])
        filename = f"{sub_id.zfill(2)}_{sub_name}.json"
        filepath = os.path.join(files_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(subscriber_data, f, ensure_ascii=False, indent=4, default=json_serial)
            
        master_list.append({
            'رقم': sub_id,
            'الاسم': subscriber_data['اســم العميل'],
            'اليوزر': subscriber_data.get('اسم دخول المشترك', ""),
            'الملف': f"Subscribers_Files/{filename}"
        })
        
    # تحديث فهرس المدير
    with open(os.path.join(base_dir, 'مدير_المشتركين_الرئيسي.md'), 'w', encoding='utf-8') as f:
        f.write("# مدير المشتركين الرئيسي (النسخة المحدثة النهائية) - شركة NetLink\n\n")
        f.write("تم تحديث كافة المسميات، وفصل بيانات دخول اللايت بيم، وتعديل خانة الأجهزة.\n\n")
        f.write("| رقم | اسم العميل | اليوزر | رابط ملف التعديل |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        for sub in master_list:
            abs_path = os.path.abspath(os.path.join(base_dir, sub['الملف'])).replace('\\', '/')
            f.write(f"| {sub['رقم']} | {sub['الاسم']} | {sub['اليوزر']} | [فتح ملف التعديل](file:///{abs_path}) |\n")
            
    print(f"SUCCESS: Generated {len(master_list)} refined subscriber files.")

except Exception as e:
    import traceback
    print(f"ERROR: {e}")
    traceback.print_exc()
