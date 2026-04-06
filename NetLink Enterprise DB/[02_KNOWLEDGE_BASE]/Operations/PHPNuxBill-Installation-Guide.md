# دليل تثبيت وإعداد نظام PHPNuxBill على Proxmox LXC
## NetLink - CCR2004 Project

---

## 1. إنشاء حاوية LXC في Proxmox

### المواصفات المُختارة:
| الإعداد | القيمة |
|---|---|
| الاسم (Hostname) | `php-NetLink` |
| نظام التشغيل (OS Template) | `debian-12-standard_12.7-1_amd64.tar.zst` |
| المعالج (CPU Cores) | `2` |
| الذاكرة (RAM) | `2048 MB` |
| مساحة التخزين (Storage) | `data1: 50 GB` |
| النوع | Unprivileged Container |
| IP Address | `192.168.99.204/24` |
| Gateway | `192.168.99.1` |
| DNS | `8.8.4.4` |
| nesting | `1` (مطلوب لتشغيل Docker أو خدمات متداخلة) |
| "Start after created" | ✅ مفعّل |

> **ملاحظة:** تم اختيار Debian 12 بدلاً من Ubuntu 24.10 لأنه إصدار LTS مستقر للخوادم الإنتاجية (Production).

---

## 2. الدخول إلى حاوية LXC وتحديث النظام

بعد إنشاء الحاوية، افتح **Console** من واجهة Proxmox وسجّل الدخول بـ `root`، ثم نفّذ:

```bash
apt update && apt upgrade -y && apt install wget curl unzip nano -y
```

---

## 3. تثبيت Apache + MariaDB + PHP

```bash
apt install apache2 mariadb-server mariadb-client php libapache2-mod-php php-mysql php-mbstring php-xml php-gd php-curl php-zip php-pear -y
```

---

## 4. إنشاء قاعدة البيانات

```bash
mysql -e "CREATE DATABASE phpnuxbill;"
mysql -e "CREATE USER 'nuxbilluser'@'localhost' IDENTIFIED BY 'StrongPassword123';"
mysql -e "GRANT ALL PRIVILEGES ON phpnuxbill.* TO 'nuxbilluser'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
```

---

## 5. تنزيل وتثبيت PHPNuxBill عبر Git

```bash
apt install git -y
cd /var/www/html
rm -rf *

# تنزيل أحدث نسخة من النظام
git clone https://github.com/hotspotbilling/phpnuxbill.git .

# تثبيت مدير الملفات Tiny File Manager
mkdir -p /var/www/html/filemanager
wget https://raw.githubusercontent.com/prasathmani/tinyfilemanager/master/tinyfilemanager.php -O /var/www/html/filemanager/index.php

# تفعيل الـ Rewrite لمسارات الـ URL
a2enmod rewrite

# ضبط الصلاحيات
chown -R www-data:www-data /var/www/html/
chmod -R 755 /var/www/html/

# إعداد Cron Job لفصل المشتركين المنتهية اشتراكاتهم (كل دقيقة)
(crontab -l 2>/dev/null; echo "* * * * * php /var/www/html/cron.php") | crontab -

# إعادة تشغيل Apache
systemctl restart apache2
```

---

## 6. إكمال التثبيت عبر المتصفح

1. افتح: `http://192.168.99.204`
2. ستظهر شاشة **PHPNuxBill Installer**، تحقق أن جميع الفحوصات **PASSED**.
3. اضغط **Continue to Install PHPNuxBill**.
4. أدخل بيانات قاعدة البيانات:
   - **Database Host:** `localhost`
   - **Database Name:** `phpnuxbill`
   - **Database Username:** `nuxbilluser`
   - **Database Password:** `StrongPassword123`
5. أكمل خطوات التثبيت حتى تصل لشاشة النجاح.

---

## 7. الخطوات الأمنية بعد التثبيت

```bash
cd /var/www/html

# تغيير اسم المجلد من pages_example إلى pages (مطلوب لعمل الصفحات)
mv pages_example pages

# حذف مجلد التثبيت لأسباب أمنية
rm -rf install
```

---

## 8. ربط الدومين عبر Nginx Proxy Manager

### في Hostinger (DNS Zone):
أنشئ سجل **A Record** يشير إلى الـ IP العام الخاص بخادمك:
- **Name:** `net` (ليصبح `net.netlinkps.com`)
- **Value:** عنوان الـ IP العام الخاص بشبكتك

### في Nginx Proxy Manager:
- **Domain Names:** `net.netlinkps.com`
- **Forward Hostname / IP:** `192.168.99.204`
- **Forward Port:** `80`
- فعّل: **Block Common Exploits** و **Websockets Support**
- من تبويب **SSL**: اختر **Request a new SSL Certificate** وفعّل **Force SSL**

---

## 9. تصحيح مشكلة HTTPS مع Reverse Proxy

بسبب استخدام Nginx Proxy Manager كـ Reverse Proxy، يقوم PHP باكتشاف الاتصال على أنه HTTP بدلاً من HTTPS، مما يسبب فشل تحميل ملفات CSS.

### الحل: تعديل ملف `config.php`

افتح ملف `/var/www/html/config.php` وعدّله ليصبح كالتالي:

```php
<?php

// إصلاح مشكلة HTTPS مع Nginx Reverse Proxy - تثبيت الرابط الأساسي يدوياً
define("APP_URL", "https://net.netlinkps.com");

// Live, Dev, Demo
$_app_stage = "Live";

// Database PHPNuxBill
$db_host        = "localhost";
$db_user        = "nuxbilluser";
$db_pass        = "StrongPassword123";
$db_name        = "phpnuxbill";

// Database Radius
$radius_host    = "localhost";
$radius_user    = "nuxbilluser";
$radius_pass    = "StrongPassword123";
$radius_name    = "phpnuxbill";

if($_app_stage!="Live"){
    error_reporting(E_ERROR);
    ini_set("display_errors", 1);
    ini_set("display_startup_errors", 1);
}else{
    error_reporting(E_ERROR);
    ini_set("display_errors", 0);
    ini_set("display_startup_errors", 0);
}
```

---

## 10. بيانات الدخول

### لوحة إدارة PHPNuxBill:
- **الرابط:** `https://net.netlinkps.com/admin`
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `admin`
- ⚠️ قم بتغيير كلمة المرور فور الدخول الأول!

### مدير الملفات (Tiny File Manager):
- **الرابط:** `http://192.168.99.204/filemanager`
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `admin@123`

---

## 11. ربط نظام PHPNuxBill بالمايكروتيك

### على المايكروتيك (Winbox):

**تفعيل الـ API:**
- `IP` ➡ `Services` ➡ تأكد أن `api` مفعّل على المنفذ `8728`.
- (اختياري للأمان) حدد IP السيرفر `192.168.99.204` في خانة **Available From**.

**إنشاء مستخدم API:**
- `System` ➡ `Users` ➡ اضغط `+`
  - **Name:** `nuxbill`
  - **Group:** `full`
  - **Password:** كلمة مرور قوية

**تفعيل الـ Radius:**
- `Radius` ➡ اضغط `+`
  - **Services:** ✅ `hotspot` و ✅ `ppp`
  - **Address:** `192.168.99.204`
  - **Secret:** كلمة سر مشتركة (مثلاً `RadiusSecret123`)

### في لوحة تحكم PHPNuxBill:
- **Network** ➡ **Routers** ➡ اضغط `+`
  - **Router Name:** `CCR2004`
  - **IP Address:** IP جهاز المايكروتيك
  - **Username:** `nuxbill`
  - **Password:** كلمة مرور حساب API
  - **Secret:** `RadiusSecret123`

---

## 12. حل مشكلة "متصل بدون إنترنت" لمشتركي PPPoE

المشكلة تحدث لأن المايكروتيك لا يعلم أنه يجب السماح لآيبيهات مشتركي Radius بالخروج للإنترنت عبر حكم الـ NAT.

**الحل في المايكروتيك:**
- `IP` ➡ `Firewall` ➡ تبويب `NAT` ➡ اضغط `+`
  - **Chain:** `srcnat`
  - **Src. Address:** رينج آيبيهات مشتركي PPPoE (مثلاً: `10.5.50.0/24`)
  - **Out. Interface:** الكرت المتصل بالإنترنت (مثلاً `ether1-WAN`)
  - من تبويب **Action:** اختر `masquerade`
  - اضغط **OK**

---

## 13. تثبيت وربط خادم FreeRADIUS (لإدارة الجلسات والاستهلاك الحي)

نظام PHPNuxBill يحتاج إلى خادم FreeRADIUS ليعمل كنظام محاسبة (Accounting) متكامل لظهور "الدوائر الخضراء" وتتبع الاستهلاك الحي للمشتركين.

**خطوات التثبيت على نفس حاوية NuxBill:**

1. **تثبيت الحزم الأساسية:**
   ```bash
   apt update && apt install freeradius freeradius-mysql freeradius-utils -y
   ```

2. **تفعيل وحدة SQL:**
   ```bash
   ln -s /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/
   ```

3. **إعداد الاتصال بقاعدة بيانات NuxBill:**
   تعديل ملف `/etc/freeradius/3.0/mods-available/sql` ليطابق بيانات القاعدة:
   - `login = "nuxbilluser"`
   - `password = "StrongPassword123"`
   - `radius_db = "phpnuxbill"`

4. **تفعيل أوامر SQL في المواقع الافتراضية:**
   إزالة علامة `#` من أمام سطر `sql` و `-sql` في ملف `/etc/freeradius/3.0/sites-enabled/default`، مع الحذر من تفعيل خطأ `sqlippool`.

5. **إضافة صلاحية المايكروتيك (Client):**
   إضافة المايكروتيك إلى ملف `/etc/freeradius/3.0/clients.conf`:
   ```text
   client mikrotik_manager {
       ipaddr = 0.0.0.0/0
       secret = 123456
   }
   ```

6. **إعادة التشغيل والتفعيل:**
   ```bash
   systemctl enable freeradius
   systemctl restart freeradius
   ```

---

## 14. حلول لأخطاء شائعة بعد التثبيت

### أ) خطأ الكرون (رسالة حمراء في لوحة التحكم)
**المشكلة:** ظهور رسالة تفيد بأن Cron غير معد، والسبب أن الكرون يجب أن يعمل من داخل مسار المشروع ليقرأ ملف `init.php`.
**الحل:** تشغيل الكرون بالمسار الصحيح:
```bash
echo "* * * * * cd /var/www/html/system && /usr/bin/php cron.php > /dev/null 2>&1" | crontab -
```

### ب) خطأ No valid table found في صفحة استهلاك البيانات
**المشكلة:** فشل إضافة "استهلاك البيانات" في العثور على جداول الراديوس بسبب دالة `isTableExist`.
**الحل:** تخطي الدالة وتوجيه الإضافة مباشرة لجدول `radacct`:
```bash
sed -i "s/if (isTableExist(\$table)) {/if (true) { \$table = 'radacct'; /g" /var/www/html/system/plugin/data_usage_admin.php
sed -i "s/if (isTableExist(\$table)) {/if (true) { \$table = 'radacct'; /g" /var/www/html/system/plugin/data_usage_user.php
```

### ج) اختفاء دوائر المتصلين (الخضراء والحمراء)
**السبب:** الاعتماد على الـ API بدلاً من الراديوس، أو عدم تفعيل Accounting في المايكروتيك.
**الحل:** 
1. تثبيت FreeRADIUS كما في الخطوة 13.
2. في المايكروتيك، اذهب إلى `PPP` ➡ `Secrets` ➡ `PPP Authentication & Accounting`، وتأكد من تفعيل `Accounting` و `Use Radius`.
3. الدوائر تكتشف الجلسات *الجديدة* التي بدأت بعد تشغيل الراديوس (افصل المشتركين المتصلين ليشبكوا من جديد وتسجل بدايات قيدهم في قاعدة البيانات).

---

*تم إعداد وتحديث هذا الدليل بتاريخ: 2026-03-27*
*مشروع: NetLink - CCR2004*

