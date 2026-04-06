# 📡 دليل برمجة أجهزة LiteBeam 5AC (لاستقبال المشتركين)

هذا الدليل مخصص لضبط أجهزة الـ **LiteBeam 5AC-GEN2** التي تعمل كمحطة استقبال (Station) في منازل المشتركين. تم استخراج هذه الإعدادات من الممارسات المعتمدة في شبكة NetLink.

---

### 📉 المواصفات الفنية المعتمدة (Technical Specs)

| القسم | الحقل (Field) | القيمة المعتمدة (Approved Value) | ملاحظات |
| :--- | :--- | :--- | :--- |
| **Wireless** | **Wireless Mode** | `Station PtMP` | وضع الاستقبال المتعدد |
| **Wireless** | **SSID** | `NetLink-D-2` (أو الموزع الأقرب) | اسم الشبكة الموحد |
| **Wireless** | **Channel Width** | `20/40 MHz` (Auto) | السماح بالتنقل التلقائي |
| **Wireless** | **Frequency** | `5325 MHz` | التردد الرئيسي المعتمد |
| **Wireless** | **Output Power** | `24 dBm` | قوة البث القصوى |
| **Wireless** | **Security** | `WPA2-AES` (Personal) | نظام التشفير الموحد |

---

### 🌐 إعدادات الشبكة (Network Settings)

> [!IMPORTANT]
> يجب التأكد من تعيين آي بي يدوي (Static) لكل جهاز لتسهيل الوصول إليه لاحقاً عبر الـ Ping.

- **Network Mode**: `Bridge`
- **Configuration Mode**: `Simple`
- **Management IP Address**: `Static`
- **IP Address**: `192.168.88.111` (أو العناوين المخصصة للمشتركين)
- **Netmask**: `255.255.255.0`
- **Gateway IP**: `192.168.88.1`
- **Primary DNS**: `8.8.8.8`
- **Secondary DNS**: `8.8.4.4`

---

### ⚙️ إعدادات النظام والأمان (System & Accounts)

- **Device Model**: `LBE-5AC-GEN2`
- **Firmware Version**: `WA.v8.7.22`
- **Admin Username**: `netlink`
- **Read-only Account**: `mrjabareen` (ON)
- **NTP Client**: `ON` (0.ubnt.pool.ntp.org)
- **Discovery**: `ON`
- **AirView**: `ON`

---

### 🤖 تعليمات للمساعد الذكي (AI Programming Logic)

عزيزي المساعد الذكي، عند طلب برمجة جهاز LiteBeam لمشترك جديد:
1. اتبع قيم الـ **IP** والتدرج الرقمي المعتمد في جدول `[01_DATABASE]/Subscribers`.
2. تأكد من أن الـ **SSID** هو المعتمد للموزع المذكور في ملف المشترك.
3. التزم بوضع الـ **Bridge** لضمان مرور الـ PPPOE بسلاسة للمشترك.

---
**إصدار الدليل**: `v1.0 (Enterprise Standard)` 🦾✅
