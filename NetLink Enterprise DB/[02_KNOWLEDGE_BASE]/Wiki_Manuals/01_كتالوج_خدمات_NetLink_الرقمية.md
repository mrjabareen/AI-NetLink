# 📂 كتالوج خدمات NetLink الرقمية (v1.0)

هذا الكتالوج هو المرجع الأساسي لكافة الخدمات الرقمية التي تعمل على سيرفر **Proxmox** الخاص بشركة NetLink. تم تنظيمه بناءً على أحدث بيانات الإكسل والتقارير الميدانية.

---

### 🖥️ البنية التحتية الأساسية (Core Infrastructure)

| الخدمة | عنوان IP الداخلي | المنفذ | النطاق الخارجي (Domain) | النوع | ملاحظات |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Proxmox Host** | `192.168.99.99` | `8006` | [server.netlinkps.com](https://server.netlinkps.com) | Host | (v8.4.6 PVE) |
| **Backup Server** | `192.168.99.28` | `8007` | [pbs.netlinkps.com](https://pbs.netlinkps.com) | VM | Proxmox Backup |
| **Nginx Proxy Manager**| `192.168.99.35` | `81` | [cloud.netlinkps.com](https://cloud.netlinkps.com) | LXC | مدير البروكسي |
| **Silver Bridge** | `192.168.99.1` | `443` | [mikrotik.netlinkps.com](https://mikrotik.netlinkps.com) | RB1100AHx4 | (v7.16.1) |
| **NetLink-Manager** | `192.168.99.2` | `443` | (وصول داخلي) | RB1100AHx4 | (v6.49.13 Dude) |
| **White Monster CCR2004**| `192.168.99.200`| `443` | [ai.netlinkps.com](https://ai.netlinkps.com) | CCR2004-16G | (v7.16) |

---

### 💳 أنظمة الفوترة والإدارة (Billing & Finance)

| الخدمة | عنوان IP | المنفذ | النطاق الخارجي | بيانات قاعدة البيانات |
| :--- | :--- | :--- | :--- | :--- |
| **PHPNuxBill** | `192.168.99.204`| `80` | [net.netlinkps.com](https://net.netlinkps.com) | DB: `phpnuxbill` / User: `nuxbilluser` |
| **SAS4 Radius** | `192.168.99.10` | `80` | [sas.netlinkps.com](https://sas.netlinkps.com) | Secret: `123456` |

---

### 🎬 مجموعة الميديا والترفيه (Media Stack)

| الخدمة | عنوان IP الداخلي | المنفذ | النطاق الخارجي (Domain) | النوع |
| :--- | :--- | :--- | :--- | :--- |
| **Jellyfin** | `192.168.99.6` | `8096` | [movies.netlinkps.com](https://movies.netlinkps.com) | LXC |
| **Plex** | `192.168.99.4` | `32400` | (وصول داخلي) | VM |
| **Jellyseerr** | `192.168.99.17` | `5055` | [requests.netlinkps.com](https://requests.netlinkps.com) | LXC |
| **Radarr** | `192.168.99.15` | `7878` | [radarr.netlinkps.com](https://radarr.netlinkps.com) | LXC |
| **Sonarr** | `192.168.99.185` | `8989` | [sonarr.netlinkps.com](https://sonarr.netlinkps.com) | Docker |
| **qBittorrent** | `192.168.99.14` | `8080` | [bittorrent.netlinkps.com](https://bittorrent.netlinkps.com) | LXC |
| **Immich** | `192.168.99.32` | `2283` | [photos.netlinkps.com](https://photos.netlinkps.com) | VM |
| **Prowlarr** | `192.168.99.18` | `9696` | (داخلي فقط) | LXC |

---

### 🤖 خدمات الذكاء الاصطناعي والأتمتة (AI & Automation)

| الخدمة | عنوان IP الداخلي | المنفذ | النطاق الخارجي (Domain) | النوع |
| :--- | :--- | :--- | :--- | :--- |
| **AI Console** | `192.168.99.29` | `3000` | [ai.netlinkps.com](https://ai.netlinkps.com) | Portainer |
| **LiteLLM** | `192.168.99.185` | `4000` | (بوابة الـ API) | Portainer |
| **n8n** | `192.168.99.30` | `5678` | [n8n.netlinkps.com](https://n8n.netlinkps.com) | LXC |

---

### 🛠️ أدوات الإدارة والشبكة (Management Tools)

| الخدمة | عنوان IP الداخلي | المنفذ | النطاق الخارجي (Domain) | النوع |
| :--- | :--- | :--- | :--- | :--- |
| **UISP Network** | `192.168.99.7` | `80` | [uisp.netlinkps.com](https://uisp.netlinkps.com) | LXC |
| **Heimdall** | `192.168.99.9` | `9983` | [home.netlinkps.com](https://home.netlinkps.com) | LXC |
| **Portainer** | `192.168.99.185` | `9443` | (إدارة الحاويات) | Docker Hub |
| **FileBrowser** | `192.168.99.23` | `8082` | [files.netlinkps.com](https://files.netlinkps.com) | LXC |
| **YOURLS** | `192.168.99.31` | `80` | [link.netlinkps.com](https://link.netlinkps.com) | LXC |
| **SearXNG** | `192.168.99.33` | `8080` | [search.netlinkps.com](https://search.netlinkps.com) | LXC |

---

### 🤖 تعليمات للمساعد الذكي (AI Integration)

عزيزي المساعد الذكي، عند القراءة من هذه القائمة:
1. استخدم عناوين الـ **IP** والمنافذ المذكورة هنا للوصول لأي خدمة تقنية.
2. تذكر أن **Nginx Proxy Manager (192.168.99.5)** هو المتحكم الرئيسي في كافة الدومينات الحالية.
3. التزم بتوجيه المستخدم دائماً للنطاق الخارجي (Domain) بدلاً من الـ IP المباشر لتحسين التجربة.

---
**إصدار الكتالوج**: `v1.0 (Enterprise Central)` 🦾✅
