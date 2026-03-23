# TMC Web Portal 2026: The Strategic Master Blueprint (v2.0)
**Project Title:** Hybrid 3D-Interactive Web Portal
**Lead Architect:** Alaa (CEO)
**Technical Executor:** Timo (AI Assistant)
**Status:** Strategic Design Locked (Complex Tasks Mode)
**Date:** March 23, 2026

---

## 1. Executive Vision (الرؤية التنفيذية)
دمج الإبهار البصري لمحرك الفيزياء التفاعلي (Inspired by Google Anti-Gravity) مع دقة واحترافية عرض البيانات المعتمدة على Odoo ERP. الموقع يعمل كصفحة واحدة (Scroll-jacking) تروي قصة TMC عبر طبقات (Layers) متداخلة.

---

## 2. Technical Architecture (البنية الهندسية)

### A. Physics Layers (طبقات الفيزياء)
1. **Background Layer (The Gravity Layer):**
   - استنساخ تأثير **Google Anti-Gravity**: جسيمات وأيقونات تقنية (SVG/PNG) تتساقط وتتفاعل مع الجاذبية وحركة الماوس في خلفية الموقع كاملة.
   - هذه الطبقة تعمل باستمرار (Continuous Render) لإعطاء حياة للواجهة.
2. **Interactive Layer (The Smart Grid):**
   - حصري لقسم المنتجات.
   - عند وصول الزائر لهذا القسم، تترتب المنتجات المسحوبة من Odoo في **مسارات عمودية (Vertical Tracks)** منظمة.
   - يتم تعطيل الجاذبية العشوائية للبطاقات وإجبارها على البقاء ضمن إحداثيات (X) ثابتة لكل تصنيف (Category).

### B. Navigation Strategy (Scroll-jacking)
- **Hero Section:** "Your Keys For Business" + 3D particles.
- **About Us:** طبقة نصية شفافة (Glassmorphism) تصعد لتغطي الخلفية الفيزيائية.
- **Product Hub:** تفعيل نظام "الأعمدة المنظمة" (Odoo Data Injection).
- **Contact/CRM:** نموذج مربوط بـ Odoo CRM (`crm.lead`).

---

## 3. Data-Driven Execution (الربط البرمجي مع أودو)

### A. Mapping Logic (التنظيم الفضائي)
يتم توزيع المنتجات بناءً على بيانات Odoo الفعلية (تم سحب عينة):
- **Category 8 (Networking):** المسار الفضائي X = -2.
- **Category 17 (Servers):** المسار الفضائي X = 0.
- **Category 9 (Wireless):** المسار الفضائي X = 2.
- *القاعدة:* كل منتج جديد يُسحب من Odoo يوضع تلقائياً في مساره المخصص بناءً على `categ_id`.

### B. Dynamic Product Card (Modal)
- جلب `list_price` و `attribute_line_ids` (المواصفات التقنية).
- عرض الـ Attributes في جداول منسقة داخل الـ Modal.
- إضافة زر "اطلب الآن" برابط مباشر للفاتورة أو الواتساب.

---

## 4. Implementation Checklist (المهام التنفيذية للوكيل)

- [ ] **Task 1: The Foundation.** بناء هيكل SPA (Scroll-jacking) باستخدام Vite + Vanilla JS.
- [ ] **Task 2: Background Physics.** دمج محرك `Matter.js` أو `Cannon.js` لمحاكاة جاذبية جوجل في الخلفية.
- [ ] **Task 3: Data Bridge.** كتابة API Fetcher لجلب المنتجات من `https://erp.tmcsmart.com` (XML-RPC/JSON-RPC).
- [ ] **Task 4: The Smart Grid.** برمجة لوجيك "تجميد البطاقات" ضمن مساراتها العمودية في قسم المنتجات.
- [ ] **Task 5: UI/UX Overlay.** تصميم شريط التنقل العلوي (Navbar) والـ Modals بألوان TMC (70/30).

---
**Reference Folder:** TMC_Documentation (Google Drive)
**Reference URL:** https://antigravity.google/
**Production ERP:** https://erp.tmcsmart.com
