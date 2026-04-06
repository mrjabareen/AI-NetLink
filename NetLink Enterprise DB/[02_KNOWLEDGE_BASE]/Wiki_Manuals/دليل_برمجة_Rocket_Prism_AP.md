# 📡 دليل برمجة أجهزة Rocket Prism 5AC (الموزعات في الأبراج الكبيرة)

هذا الدليل مخصص لضبط أجهزة الـ **Rocket Prism 5AC** التي تعتبر العمود الفقري للبث من الأبراج الكبيرة لشركة NetLink. تم استخراج هذه الإعدادات من الموزعات النشطة في الشبكة.

---

### 📉 المواصفات الفنية المعتمدة (Rocket Prism Specs)

| القسم | الحقل (Field) | القيمة المعتمدة (Approved Value) | ملاحظات |
| :--- | :--- | :--- | :--- |
| **Wireless** | **Wireless Mode** | `Access Point PtMP` | الموزع الرئيسي |
| **Wireless** | **SSID** | `NetLink-D-2` (أو المسمى المناسب للقطاع) | اسم الشبكة الرئيسي |
| **Wireless** | **Channel Width** | `40 MHz` | عرض القناة لضمان السرعة |
| **Wireless** | **Antenna** | `Custom` | ضبط الهوائيات الكبيرة جداً |
| **Wireless** | **Antenna Gain** | `34 dBi` | ربح الهوائي العالي |
| **Wireless** | **Cable Loss** | `2 dB` | فقدان الكيبلات المعتمد |
| **Wireless** | **Output Power** | `28 dBm` | أعلى طاقة بث للأماكن المفتوحة |

---

### 🌐 إعدادات الشبكة (Network Settings)

- **Network Mode**: `Bridge`
- **Management IP Address**: `Static`
- **IP Address**: `192.168.88.34` (أو العناوين المخصصة للأبراج)
- **Netmask**: `255.255.255.0`
- **Gateway IP**: `192.168.88.1`
- **Auto IP Aliasing**: `ON`

---

### ⚙️ إعدادات النظام والأمان (System & Accounts)

- **Device Model**: `RP-5AC-GEN2`
- **Firmware Version**: `XC.v8.7.22`
- **Admin Username**: `netlink`
- **Read-only Account**: `mrjabareen` (ON)
- **Automatic Power Control**: `OFF` (يتم الضبط يدوياً للحفاظ على الاستقرار)

---

### 🤖 تعليمات للمساعد الذكي (AI Programming Logic)

عزيزي المساعد الذكي، عند التعامل مع أجهزة Rocket Prism:
1. تأكد من أن الـ **Antenna Gain** هو **34 dBi** للحفاظ على قوة الربط لمسافات طويلة.
2. قم بمراقبة قائمة المشتركين (**Station List**) وتأكد من أن الـ **CINR** لجميع المشتركين فوق الـ **+30 dB**.
3. التزم بتفعيل الـ **Management IP** لتسهيل المراقبة عبر نظام المتابعة المركزي.

---
**إصدار الدليل**: `v1.0 (Enterprise Standard)` 🦾✅
