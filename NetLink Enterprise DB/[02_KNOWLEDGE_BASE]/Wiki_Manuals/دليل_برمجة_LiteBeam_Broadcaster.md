# 📡 دليل برمجة أجهزة LiteBeam 5AC (للبث والجسر)

هذا الدليل مخصص لضبط أجهزة الـ **LiteBeam 5AC** التي تعمل كموزع إشارة (Access Point) أو جسر (Bridge) لإرسال الإشارة لمسافات بعيدة. تم استخراج هذه الإعدادات من الممارسات المعتمدة في شبكة NetLink.

---

### 📉 المواصفات الفنية المعتمدة (Broadcaster Specs)

| القسم | الحقل (Field) | القيمة المعتمدة (Approved Value) | ملاحظات |
| :--- | :--- | :--- | :--- |
| **Wireless** | **Wireless Mode** | `Access Point PtMP` | وضع البث المتعدد |
| **Wireless** | **PTP Mode** | `OFF` | إيقاف الربط الفردي |
| **Wireless** | **SSID** | `NetLink-D-2` (أو التسمية المخصصة للموزع) | اسم الشبكة الموحد |
| **Wireless** | **Channel Width** | `40 MHz` | عرض القناة الثابت للبث |
| **Wireless** | **Frequency** | `5250 MHz` (أو الترددات غير المزدحمة) | التردد المعتمد للبث |
| **Wireless** | **Output Power** | `24 dBm` | قوة البث المعتمدة |
| **Wireless** | **Frame Duration** | `Flexible` (Legacy) | لضمان التوافق مع كافة الإصدارات |

---

### 🌐 إعدادات الشبكة (Network Settings)

- **Network Mode**: `Bridge`
- **Configuration Mode**: `Simple`
- **Management IP Address**: `Static`
- **IP Address**: `192.168.88.20` (أو العناوين المخصصة للموزعين)
- **Netmask**: `255.255.255.0`
- **Gateway IP**: `192.168.88.1`
- **DNS**: `8.8.8.8` / `8.8.4.4`
- **Auto IP Aliasing**: `ON`

---

### ⚙️ إعدادات النظام والأمان (System & Accounts)

- **Firmware Version**: `WA.v8.7.22`
- **Admin Username**: `netlink`
- **Read-only Account**: `mrjabareen` (ON)
- **NTP Client**: `ON` (0.ubnt.pool.ntp.org)
- **Discovery**: `ON`

---

### 🤖 تعليمات للمساعد الذكي (AI Programming Logic)

عزيزي المساعد الذكي، عند طلب برمجة جهاز LiteBeam كموزع (Broadcaster):
1. تأكد من أن الـ **Wireless Mode** هو **Access Point PtMP**.
2. اختر **SSID** مميز للموزع بناءً على مكانه الجغرافي.
3. اضبط الـ **Frequency** بحيث لا يتداخل مع الموزعين القريبين.
4. التزم بوضع الـ **Bridge** لضمان تدفق البيانات بسلاسة من السيرفر الرئيسي.

---
**إصدار الدليل**: `v1.0 (Enterprise Standard)` 🦾✅
