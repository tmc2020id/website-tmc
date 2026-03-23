# TMC Website 3D — Phase 4 Live Integration Blueprint

**Project:** TMC Interactive 3D Website  
**Phase:** Phase 4 — Live Odoo Integration & Deployment Preparation  
**Date:** 2026-03-23  
**Status:** Approved Execution Blueprint  
**Owner:** TMC / Alaa  

---

## 1) Phase Objective

The goal of this phase is to replace the current Mock Data with a secure and structured live integration with **Odoo 19**, while preserving the current frontend behavior and preparing the project for organized deployment.

This phase is not only about “connecting data”. It includes:
- freezing the data contract,
- choosing the correct architecture,
- implementing a secure backend integration layer,
- connecting the frontend to live data,
- adding a loading experience,
- and preparing runtime/deployment files.

---

## 2) Approved Technical Decisions

### 2.1 Data Source
- Primary source: **Odoo 19**
- Primary model: **`product.template`**
- Displayed items are primarily **Products**, not Services
- Services may exist, but they represent a very small portion (less than 5%) and are not the center of this phase

### 2.2 API Standard
- Mandatory standard: **Odoo 19 JSON-2 API**
- Do **not** use XML-RPC
- Do **not** build on older JSON-RPC patterns if they conflict with the approved Odoo 19 direction

### 2.3 Integration Architecture
Direct frontend-to-Odoo communication is **not allowed**.

### Approved architecture:
Frontend → `/api/products` → Backend Service → Odoo 19 JSON-2 API

### 2.4 Layer Responsibilities

#### Frontend
- Requests data only from local/internal API routes
- Must not contain Odoo credentials or sensitive connection details
- Must remain compatible with the current 3D UI behavior

#### Nginx
- Reverse proxy layer
- Routes API traffic to the backend service
- Supports production deployment structure
- Helps reduce or avoid CORS issues

#### Backend Service
- Main integration layer
- Responsible for:
  - authenticating with Odoo
  - querying data
  - applying filtering rules
  - mapping fields
  - transforming output into frontend-friendly JSON
  - handling failures safely
  - enabling future caching if needed

---

## 3) Why Backend Service Is Required

Although Nginx exists in the infrastructure, it is **not sufficient alone** as the business logic layer.

Nginx is suitable for:
- reverse proxying,
- route forwarding,
- separating static/frontend and API traffic.

But it is **not the correct place** for:
- data transformation,
- business filtering,
- authentication logic,
- controlled Odoo communication,
- future caching and fallback behavior.

Therefore, the approved solution is:
- **Nginx as gateway/reverse proxy**
- **Backend Service as integration processor**

---

## 4) Execution Order (Approved)

## Step 1 — Discovery & Contract Freeze

Before writing integration code, the final data contract must be frozen.

### Required tasks
- Confirm the source model: `product.template`
- Confirm the required fields
- Confirm filtering criteria
- Confirm the final JSON shape consumed by the frontend

### Required fields (initially approved)
- `id`
- `display_name`
- `list_price`
- `description_sale`
- `image_1920`

### Optional/additional fields if needed
- `default_code`
- `categ_id`
- `website_published` or equivalent
- slug / handle for future routing
- any custom flag used for 3D website selection

### Filtering rule
A dedicated and explicit filter must be used to determine which items appear on the 3D website.

### Approved recommendation
Use a dedicated selector such as:
- Tag
- Website category
- Custom field / custom flag

**Recommended example:** `Website_3D`

### Important restriction
Do not rely only on generic filters such as:
- `sale_ok = true`
- product type alone

Because this may expose unintended products.

### Output of this step
- Frozen Data Contract
- One example JSON response matching frontend expectations

### Validation
- The agent must provide a sample output structure
- It must match the fields used in the current cards/modal/UI

---

## Step 2 — Build Backend Integration Service

Build a dedicated service that acts as the secure bridge between the frontend and Odoo.

### Required tasks
- Create an internal endpoint such as:
  - `GET /api/products`
- Connect this service to **Odoo 19 JSON-2 API**
- Apply approved filtering logic
- Return clean and minimal JSON to the frontend

### Requirements
- No Odoo credentials in frontend code
- Config must be stored in environment variables
- Errors must be handled clearly and safely
- The response should remain predictable and structured

### Output of this step
- Running backend integration service
- Working live endpoint returning real Odoo data

### Validation
- Endpoint tested independently
- Response verified for:
  - correctness
  - cleanliness
  - no unnecessary sensitive data
  - compatibility with the frozen contract

---

## Step 3 — Connect Frontend to Live API

Replace mock data usage with live API consumption.

### Required tasks
- Update the frontend data service to call:
  - `/api/products`
- Preserve current UI behavior
- Keep 3D scene interaction intact
- Support:
  - loading state
  - empty state
  - error state

### Output of this step
- 3D interface renders real Odoo products

### Validation
- Real products appear in the 3D interface
- No regression in:
  - drag/rotate interaction
  - click behavior
  - modal behavior
  - image rendering
  - price rendering
  - descriptions/text

---

## Step 4 — Add Preloader / Loading Experience

Add a professional loading screen while data and 3D assets initialize.

### Required tasks
- Design a loader aligned with TMC identity
- Show during:
  - data fetching
  - image loading
  - 3D scene initialization
- Hide smoothly after readiness

### Output of this step
- Clean loading experience
- No blank or broken first impression

### Validation
- On first load, users should not see an empty or black screen
- Transition into the scene should feel smooth and intentional

---

## Step 5 — Proxy & Runtime Wiring

Wire the API path through Nginx to the backend integration service.

### Required tasks
- Configure Nginx to route:
  - `/api/*` → backend service
- Maintain clear separation between:
  - static frontend delivery
  - API service traffic

### Output of this step
- Stable internal routing
- Reduced/eliminated CORS issues
- Cleaner production architecture

### Validation
- Frontend requests to `/api/products` succeed
- No browser CORS errors
- No direct Odoo endpoint exposure in frontend code/network design

---

## Step 6 — Deployment Preparation

Prepare runtime/deployment files in an organized way.

### Required tasks
- Create `Dockerfile` for frontend
- Create `Dockerfile` or equivalent runtime config for backend service
- Create `nginx.conf`
- Create `docker-compose.yml`

### Output of this step
- Project ready for organized VPS deployment

### Validation
- Local/containerized build succeeds
- Services can run together
- Frontend can reach backend through the intended routing

---

## 5) Expected Output Shape

The frontend should receive an array of structured objects similar to the following:

```json
[
  {
    "id": 101,
    "name": "Smart Camera System",
    "price": 250,
    "description": "AI-enabled security camera solution",
    "image": "data:image/jpeg;base64,...",
    "category": "Security"
  }
]
```

### Notes
- Internal key names may vary if needed during transformation
- Final output must remain compatible with the current frontend rendering layer
- The goal is safe replacement of Mock Data without breaking the interface

---

## 6) Mandatory Deliverables

The agent must deliver the following by the end of this phase:

1. Working backend integration service
2. Frontend connected to live Odoo data
3. Preloader/loading experience implemented
4. Nginx proxy wiring completed
5. Docker/runtime deployment files prepared
6. Short technical handoff notes / run instructions

---

## 7) Final Validation Checklist

The following must be verified before this phase is considered complete:

- [ ] Odoo 19 **JSON-2 API** is used
- [ ] No credentials are exposed in the frontend
- [ ] A backend integration service has been created
- [ ] Frontend reads data from `/api/products`
- [ ] Displayed data is real Odoo data, not mock data
- [ ] Filtering is limited to the intended 3D website items
- [ ] No browser CORS errors exist
- [ ] Existing 3D interaction remains functional
- [ ] Loading/preloader behavior is implemented correctly
- [ ] Docker and Nginx files are prepared
- [ ] Execution notes/documentation are included

---

## 8) Execution Boundaries

### Allowed
- Refactor the data layer as needed
- Add backend service layer
- Add loader states
- Prepare deployment/runtime files

### Not Allowed
- Do not switch to direct frontend-to-Odoo integration
- Do not expose credentials or database-related details in frontend code
- Do not pull all products without approved filtering
- Do not change the current frontend behavior unnecessarily
- Do not improvise architecture outside the approved flow

---

## 9) Definition of Done

This phase is considered complete only when:
- the frontend is using real Odoo product data,
- the integration is secure,
- the architecture matches the approved design,
- the user experience remains stable,
- and deployment preparation is finished and testable.

---

## 10) Quick Execution Summary

### Approved sequence
1. Freeze Data Contract
2. Build Backend Service
3. Connect Frontend to Live API
4. Add Preloader
5. Configure Nginx Proxy
6. Prepare Docker / Deployment Files

### Core architecture
Frontend → `/api/products` → Backend Service → Odoo 19 JSON-2 API

### Core rule
Security and structure come before speed. No direct frontend exposure to Odoo.

---

**End of Blueprint**
