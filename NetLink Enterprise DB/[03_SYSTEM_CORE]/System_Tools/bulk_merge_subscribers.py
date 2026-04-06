# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import os
import json
import pandas as pd
from difflib import SequenceMatcher

# تهيئة المسارات
base_dir = 'NetLink-Enterprise-Manager'
sub_dir = os.path.join(base_dir, 'Dashboard_Subscribers')
excel_file = 'users.xlsx'

# هيكلية الحقول النهائية الموحدة (Final Schema)
new_schema_keys = [
    "id", "firstname", "lastname", "username", "ct_password", "password",
    "phone", "عليه دين", "قام بتسديد", "الرصيد المتبقي له", "قيمة الفاتورة",
    "تاريخ بداية العقد مع الشركة", "تاريخ ناهية الاشتراك", "expiration", "last_online",
    "حالة الحساب", "الوكيل المسؤل", "نوع الاشتراك", "مدة التزام العقد",
    "سرعة الخط", "profile_name", "mac_litebeam", "ip_litebeam", "ip_router",
    "جهاز الايت بيم من صاحبة", "اجهزة تعود الى الشركة", "عنوان المشترك", "address",
    "city", "street", "group_name", "company", "gps_lat", "gps_lng",
    "balance", "email", "static_ip", "enabled", "notes", "contract_id",
    "national_id", "created_at", "parent_name", "ملاحظات اخرى", "اسم دخول اللايت بيم", "باسورد اللايت بيم"
]

def clean_str(s):
    if pd.isna(s) or s is None: return ""
    return str(s).strip()

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

# تحميل بيانات SAS4 إذا كانت موجودة (لأخر مرة قبل المسح)
if os.path.exists(excel_file):
    df = pd.read_excel(excel_file)
    sas_users = df.to_dict(orient='records')
else:
    sas_users = []

matches_count = 0
not_found = []

# معالجة كل ملف مشترك
for filename in os.listdir(sub_dir):
    if not filename.endswith('.json'): continue
    filepath = os.path.join(sub_dir, filename)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        old_data = json.load(f)
    
    # تحويل الحقول القديمة للمسميات الجديدة قبل المطابقة
    if "ماك الايت بيم" in old_data:
        old_data["mac_litebeam"] = old_data.pop("ماك الايت بيم")
    if "ip-laitpem" in old_data:
        old_data["ip_litebeam"] = old_data.pop("ip-laitpem")
    
    # محاولة المطابقة مع SAS4
    matched_sas = None
    username_json = clean_str(old_data.get('username')) or clean_str(old_data.get('اسم دخول المشترك'))
    
    if username_json:
        for u in sas_users:
            if clean_str(u.get('username')) == username_json:
                matched_sas = u
                break
                
    if not matched_sas:
        full_name_json = clean_str(old_data.get('اســم العميل')) or f"{clean_str(old_data.get('firstname'))} {clean_str(old_data.get('lastname'))}"
        for u in sas_users:
            full_name_sas = f"{clean_str(u.get('firstname'))} {clean_str(u.get('lastname'))}".strip()
            if full_name_sas == full_name_json or (full_name_json and similar(full_name_sas, full_name_json) > 0.85):
                matched_sas = u
                break

    # بناء البيانات الجديدة بالترتيب الموحد
    new_data = {}
    for key in new_schema_keys:
        # البحث عن القيمة في البيانات القديمة بأي مسمى ممكن
        val = old_data.get(key, "")
        if not val:
            # محاولة المسميات العربية القديمة
            alt_map = {
                "firstname": "firstname",
                "lastname": "lastname",
                "username": "اسم دخول المشترك",
                "password": "كلمة سر دخول المشترك",
                "phone": "بيانـــات العـــميل"
            }
            if key in alt_map:
                val = old_data.get(alt_map[key], "")
        new_data[key] = val

    if matched_sas:
        matches_count += 1
        # تحديث الحقول من SAS4 (المصدر التقني الأحدث)
        new_data["id"] = clean_str(matched_sas.get('id'))
        new_data["firstname"] = clean_str(matched_sas.get('firstname'))
        new_data["lastname"] = clean_str(matched_sas.get('lastname'))
        new_data["phone"] = clean_str(matched_sas.get('phone'))
        new_data["username"] = clean_str(matched_sas.get('username'))
        new_data["expiration"] = clean_str(matched_sas.get('expiration'))
        new_data["تاريخ ناهية الاشتراك"] = clean_str(matched_sas.get('expiration'))
        new_data["profile_name"] = clean_str(matched_sas.get('profile_name'))
        new_data["سرعة الخط"] = clean_str(matched_sas.get('profile_name'))
        new_data["last_online"] = clean_str(matched_sas.get('last_online'))
        new_data["created_at"] = clean_str(matched_sas.get('created_at'))
        new_data["group_name"] = clean_str(matched_sas.get('group_name'))
        new_data["mac"] = clean_str(matched_sas.get('mac'))
        new_data["city"] = clean_str(matched_sas.get('city'))
        new_data["balance"] = str(matched_sas.get('balance', "0.00"))
        new_data["parent_name"] = clean_str(matched_sas.get('parent_name'))
        new_data["ct_password"] = clean_str(matched_sas.get('ct_password'))
        new_data["password"] = clean_str(matched_sas.get('ct_password'))
    else:
        not_found.append(filename)

    # حفظ الملف المحدث بالتنسيق النهائي
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, ensure_ascii=False, indent=4)

print(f"FINAL SUCCESS: Refined {matches_count + len(not_found)} files with English technical keys.")
print(f"Matched: {matches_count}, Dormant: {len(not_found)}")
