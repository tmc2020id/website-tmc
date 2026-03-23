import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// إعداد المشهد الأساسي
const canvas = document.querySelector('#webgl-canvas') as HTMLCanvasElement;
const loading = document.querySelector('#loading') as HTMLDivElement;

const scene = new THREE.Scene();
// سيتم تعيين الخلفية لاحقاً لتكون شفافة أو متناسبة مع لون الموقع
scene.background = new THREE.Color('#f5f5f7'); 

// الكاميرا
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10); // تغيير موقع الكاميرا لتكون مواجهة للـ Z axis مباشرة
camera.lookAt(0, 0, 0);

// المصير (Renderer)
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true // جعل الخلفية شفافة لدمجها مع الـ CSS
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// تفعيل إعدادات الإضاءة الفيزيائية الصحيحة
// renderer.useLegacyLights = false; // تم إزالتها في الإصدارات الأحدث من Three.js لأنها أصبحت الافتراضية
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// --- الخطوة 1: بناء نظام الإضاءة السينمائية ---
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
// إنشاء بيئة الاستوديو الافتراضية
const environment = new RoomEnvironment();
const envMap = pmremGenerator.fromScene(environment).texture;
scene.environment = envMap; // تطبيق الإضاءة البيئية على المشهد
environment.dispose();

// إضاءة إضافية لتعزيز الظلال
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// إعداد محرك الفيزياء (Cannon.js)
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0), // جاذبية ابتدائية طبيعية
});

// متغيرات للتحكم بالجاذبية عبر التمرير (Scroll)
let targetGravityY = -9.82;
let currentScrollProgress = 0;

// الاستماع لحدث التمرير لحساب النسبة المئوية
window.addEventListener('scroll', () => {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  if (maxScroll > 0) {
    currentScrollProgress = window.scrollY / maxScroll;
  } else {
    currentScrollProgress = 0;
  }
  
  // تحويل النسبة (0 إلى 1) إلى جاذبية (من -9.82 إلى +2 مثلاً)
  // إذا كان التمرير 0 -> الجاذبية -9.82 (سقوط)
  // إذا كان التمرير 0.5 -> الجاذبية 0 (انعدام وزن)
  // إذا كان التمرير 1 -> الجاذبية +2 (طفو خفيف للأعلى)
  targetGravityY = THREE.MathUtils.lerp(-9.82, 2, currentScrollProgress);
});

// لجعل الصفحة قابلة للتمرير للاختبار
document.body.style.height = '300vh';

// إعداد خامة (Material) للحوائط والمكعبات للتحكم بالارتداد
const wallMaterial = new CANNON.Material('wallMaterial');
const boxPhysMaterial = new CANNON.Material('boxPhysMaterial');

const wallBoxContactMaterial = new CANNON.ContactMaterial(
  wallMaterial,
  boxPhysMaterial,
  {
    friction: 0.1,
    restitution: 0.4, // معامل الارتداد (0.3 - 0.5)
  }
);
world.addContactMaterial(wallBoxContactMaterial);

// --- نظام الحوائط غير المرئية (Invisible Boundaries) ---
// سنستخدم صناديق رقيقة (Box) بدلاً من Plane لأن Plane في Cannon.js يمتد للما لا نهاية ويصعب التحكم في حدوده بدقة
const walls: CANNON.Body[] = [];
const wallThickness = 1;

const createWall = (mass: number, width: number, height: number, depth: number) => {
  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const body = new CANNON.Body({ mass, shape, material: wallMaterial });
  world.addBody(body);
  walls.push(body);
  return body;
};

// سيتم تحديث أبعاد ومواقع هذه الحوائط لاحقاً في دالة resize
const groundWall = createWall(0, 1, wallThickness, 1);
const ceilWall = createWall(0, 1, wallThickness, 1);
const leftWall = createWall(0, wallThickness, 1, 1);
const rightWall = createWall(0, wallThickness, 1, 1);
const backWall = createWall(0, 1, 1, wallThickness);
const frontWall = createWall(0, 1, 1, wallThickness); // حائط أمامي إضافي لمنع المكعب من السقوط باتجاه الكاميرا

// --- الخطوة 2: إكساء المجسمات بالهوية البصرية (TextureManager) ---
const textureLoader = new THREE.TextureLoader();

// بيانات Odoo الوهمية (Mock Data) - سيتم الاحتفاظ بها كاحتياطي فقط
// دالة لجلب البيانات من الـ Backend Service
const fetchOdooData = async () => {
  try {
    // استخدم مسار الـ API المحلي أثناء التطوير (في الإنتاج سيتم توجيهه عبر Nginx)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/products';
    const response = await fetch(apiUrl);
    const result = await response.json();
    
    if (result.status === 'success' && result.data.length > 0) {
      return result.data;
    }
    throw new Error('No data received from backend');
  } catch (error) {
    console.error('Failed to fetch Odoo data, using fallback mock data:', error);
    return [
      { 
        id: 101, 
        name: "تصميم الهوية البصرية (Branding)", 
        price: 500.00, 
        description: "نبني لك هوية بصرية متكاملة تعكس رؤية شركتك وتجذب عملاءك.", 
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" 
      }, 
      { 
        id: 102, 
        name: "تطوير تطبيقات الويب (Web App)", 
        price: 1200.00, 
        description: "تطبيقات ويب سريعة، آمنة، ومبنية بأحدث التقنيات.", 
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" 
      } 
    ];
  }
};

// دالة محاكاة لجلب الصور من Odoo (تدعم Base64)
const loadServiceTexture = (base64String: string) => {
  // إضافة الـ prefix الخاص بـ base64 إذا لم يكن موجوداً
  const dataUrl = base64String.startsWith('data:image') 
    ? base64String 
    : `data:image/png;base64,${base64String}`;
    
  const texture = textureLoader.load(dataUrl);
  texture.colorSpace = THREE.SRGBColorSpace; // تصحيح الألوان
  return texture;
};

// إنشاء مادة فيزيائية متقدمة للبطاقات
const createCardMaterial = (base64Texture?: string) => {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'), // لون أبيض أساسي لكي تظهر الصورة بوضوح
    metalness: 0.1, // معدنية خفيفة
    roughness: 0.2, // لمعان عالي كالزجاج أو البلاستيك المصقول
    clearcoat: 1.0, // طبقة طلاء لامعة
    clearcoatRoughness: 0.1,
    map: base64Texture ? loadServiceTexture(base64Texture) : null,
  });
};

// إنشاء مجسمات "بطاقات الخدمات" ديناميكياً بناءً على بيانات Odoo
const cards: { mesh: THREE.Mesh, body: CANNON.Body, data: any }[] = [];
const cardGeometry = new THREE.BoxGeometry(2, 3, 0.2); // شكل يشبه بطاقة أو هاتف

const initCards = async () => {
  const liveData = await fetchOdooData();

  liveData.forEach((service: any, index: number) => {
    const material = createCardMaterial(service.image); // تغيرت من image_1920 إلى image حسب الـ Contract الجديد
    const mesh = new THREE.Mesh(cardGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // توزيع البطاقات بشكل مبدئي (توزيع عشوائي آمن ضمن حدود الشاشة)
    const xPos = (Math.random() - 0.5) * 4; 
    const yPos = 5 + index * 2;
    
    scene.add(mesh);

    const body = new CANNON.Body({
      mass: 1 + Math.random() * 2, // كتلة متغيرة قليلاً لتعطي تنوعاً في الحركة
      shape: new CANNON.Box(new CANNON.Vec3(1, 1.5, 0.1)),
      position: new CANNON.Vec3(xPos, yPos, 0),
      material: boxPhysMaterial,
      linearDamping: 0.5,
      angularDamping: 0.5
    });
    
    // إعطاء دوران عشوائي ابتدائي للبطاقة
    body.quaternion.setFromEuler(
      Math.random() * Math.PI, 
      Math.random() * Math.PI, 
      Math.random() * Math.PI
    );
    
    world.addBody(body);
    
    // تخزين البيانات مع البطاقة لسهولة الوصول لها عند النقر
    cards.push({ mesh, body, data: service });
  });

  // إخفاء رسالة التحميل بعد اكتمال جلب البيانات وبناء المشهد
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => {
      loading.style.display = 'none';
    }, 500); // توافق مع تأثير الـ CSS transition
  }
};

// بدء التهيئة
initCards();

// --- دالة تحديث حدود الشاشة ---
const updatePhysicsWalls = () => {
  // حساب الأبعاد بناءً على الكاميرا (في العمق z = 0 حيث يقع المكعب عادة)
  const distance = camera.position.z;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const height = 2 * Math.tan(vFov / 2) * distance;
  const width = height * camera.aspect;

  // هامش أمان إضافي للحوائط (أكبر بقليل من الشاشة)
  const margin = 0.5;
  const wallW = width + margin;
  const wallH = height + margin;
  const wallD = 20; // عمق الحوائط
  const depthZ = -wallThickness / 2; // مكان الجدار الخلفي
  const frontZ = 5; // مكان الجدار الأمامي
  
  // تحديث الأبعاد والمواقع
  // الأرضية والسقف
  groundWall.shapes[0] = new CANNON.Box(new CANNON.Vec3(wallW / 2, wallThickness / 2, wallD / 2));
  groundWall.position.set(0, -height / 2 - wallThickness / 2, 0);
  
  ceilWall.shapes[0] = new CANNON.Box(new CANNON.Vec3(wallW / 2, wallThickness / 2, wallD / 2));
  ceilWall.position.set(0, height / 2 + wallThickness / 2, 0);

  // الحوائط الجانبية
  leftWall.shapes[0] = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, wallH / 2, wallD / 2));
  leftWall.position.set(-width / 2 - wallThickness / 2, 0, 0);

  rightWall.shapes[0] = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, wallH / 2, wallD / 2));
  rightWall.position.set(width / 2 + wallThickness / 2, 0, 0);

  // الحائط الخلفي والأمامي
  backWall.shapes[0] = new CANNON.Box(new CANNON.Vec3(wallW / 2, wallH / 2, wallThickness / 2));
  backWall.position.set(0, 0, depthZ);

  frontWall.shapes[0] = new CANNON.Box(new CANNON.Vec3(wallW / 2, wallH / 2, wallThickness / 2));
  frontWall.position.set(0, 0, frontZ);
};

// تحديث مبدئي
updatePhysicsWalls();

// --- نظام التقاط الأشياء بالماوس (Raycasting & Constraints) ---
const raycaster = new THREE.Raycaster();
raycaster.params.Line = { threshold: 0.001 };
const mouse = new THREE.Vector2();

// لتتبع العنصر الذي تم التقاطه
let selectedBody: CANNON.Body | null = null;
let mouseConstraint: CANNON.PointToPointConstraint | null = null;
let interactionPlane: THREE.Mesh | null = null;
let isDragging = false;
let hoveredCard: THREE.Mesh | null = null;

// متغيرات للتفريق بين النقر والسحب
let pointerDownTime = 0;
const CLICK_TIME_THRESHOLD = 200; // ميلي ثانية (إذا كانت الضغطة أقل من 200ms تعتبر نقرة)

// عناصر الـ UI
const modal = document.getElementById('card-modal') as HTMLDivElement;
const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
const modalDesc = document.getElementById('modal-desc') as HTMLParagraphElement;
const modalPrice = document.getElementById('modal-price') as HTMLDivElement;
const modalClose = document.getElementById('modal-close') as HTMLButtonElement;

// إغلاق النافذة
modalClose?.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// كائن وهمي في Cannon.js يمثل موقع الماوس لربط القيد (Constraint) به
const mouseBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
world.addBody(mouseBody);

// مستوى (Plane) وهمي لتقاطع شعاع الماوس معه أثناء السحب
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
interactionPlane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(interactionPlane);

const getHitPoint = (clientX: number, clientY: number, meshes: THREE.Mesh[], plane: THREE.Mesh) => {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (isDragging && selectedBody) {
    // إذا كنا نسحب، نقيس التقاطع مع المستوى الوهمي
    const hits = raycaster.intersectObject(plane);
    return hits.length > 0 ? hits[0].point : null;
  } else {
    // إذا لم نكن نسحب، نبحث عن الأجسام القابلة للالتقاط
    const hits = raycaster.intersectObjects(meshes);
    return hits.length > 0 ? hits[0] : null;
  }
};

const addMouseConstraint = (x: number, y: number, z: number, body: CANNON.Body) => {
  // وضع الجسم الوهمي (الماوس) في نفس مكان التقاطع
  mouseBody.position.set(x, y, z);
  
  // إنشاء قيد يربط بين الجسم الممسوك ونقطة الماوس
  // يمكننا ربطه من النقطة المحلية (local point) أو من مركز الجسم، للسهولة سنربط بالمركز مع إزاحة
  const pivot = new CANNON.Vec3(0, 0, 0); 
  mouseConstraint = new CANNON.PointToPointConstraint(body, pivot, mouseBody, new CANNON.Vec3(0,0,0), 1000);
  world.addConstraint(mouseConstraint);
};

const removeMouseConstraint = () => {
  if (mouseConstraint) {
    world.removeConstraint(mouseConstraint);
    mouseConstraint = null;
  }
};

// الأحداث (Events)
const meshesToRaycast = cards.map(c => c.mesh); // الأجسام التي يمكن التفاعل معها

window.addEventListener('pointerdown', (e) => {
  // منع التفاعل إذا كنا نضغط على الـ UI (مثل النافذة المنبثقة)
  if ((e.target as HTMLElement).tagName !== 'CANVAS') return;

  pointerDownTime = performance.now();
  const hit = getHitPoint(e.clientX, e.clientY, meshesToRaycast, interactionPlane!) as THREE.Intersection;
  
  if (hit) {
    const mesh = hit.object as THREE.Mesh;
    // العثور على الـ Body المقابل
    const cardData = cards.find(c => c.mesh === mesh);
    
    if (cardData && cardData.body.mass < 10) {
      isDragging = true;
      selectedBody = cardData.body;
      
      // إيقاف السرعة لتجنب الحركات العشوائية عند الإمساك
      selectedBody.velocity.set(0, 0, 0);
      selectedBody.angularVelocity.set(0, 0, 0);

      // تحديد موقع وميل المستوى الوهمي ليكون مواجهاً للكاميرا ويمر بمركز الجسم
      interactionPlane!.position.copy(mesh.position);
      interactionPlane!.quaternion.copy(camera.quaternion);

      addMouseConstraint(hit.point.x, hit.point.y, hit.point.z, selectedBody);
      
      // تغيير لون المؤشر (Visual Feedback)
      document.body.style.cursor = 'grabbing';
      // تأثير بصري خفيف عند الإمساك
      (mesh.material as THREE.MeshPhysicalMaterial).emissive.set('#ff6b00');
    }
  }
});

window.addEventListener('pointermove', (e) => {
  if (isDragging && selectedBody) {
    const hitPoint = getHitPoint(e.clientX, e.clientY, meshesToRaycast, interactionPlane!) as THREE.Vector3;
    if (hitPoint) {
      // تحديث موقع الجسم الوهمي (الماوس) لسحب الجسم الحقيقي
      mouseBody.position.set(hitPoint.x, hitPoint.y, hitPoint.z);
    }
  } else {
    // Hover Effect with Emissive (Orange glow)
    const hit = getHitPoint(e.clientX, e.clientY, meshesToRaycast, interactionPlane!) as THREE.Intersection;
    
    if (hit) {
       const cardData = cards.find(c => c.mesh === hit.object);
       if(cardData && cardData.body.mass < 10) {
          document.body.style.cursor = 'grab';
          
          if (hoveredCard !== cardData.mesh) {
            // إزالة التوهج عن البطاقة السابقة
            if (hoveredCard) (hoveredCard.material as THREE.MeshPhysicalMaterial).emissive.set('#000000');
            
            // إضافة توهج برتقالي للبطاقة الحالية
            hoveredCard = cardData.mesh;
            (hoveredCard.material as THREE.MeshPhysicalMaterial).emissive.set('#ff6b00');
          }
       }
    } else {
      document.body.style.cursor = 'auto';
      if (hoveredCard) {
        (hoveredCard.material as THREE.MeshPhysicalMaterial).emissive.set('#000000');
        hoveredCard = null;
      }
    }
  }
});

window.addEventListener('pointerup', () => {
  if (isDragging && selectedBody) {
      // إزالة التأثير البصري
      const cardData = cards.find(c => c.body === selectedBody);
      if(cardData) {
          (cardData.mesh.material as THREE.MeshPhysicalMaterial).emissive.set(hoveredCard === cardData.mesh ? '#ff6b00' : '#000000');
          
          // التفريق بين النقر والسحب (Click vs Drag)
          const timePressed = performance.now() - pointerDownTime;
          if (timePressed < CLICK_TIME_THRESHOLD) {
             // يعتبر نقرة (Click) -> فتح النافذة
             openCardModal(cardData.data);
          }
      }
  }
  isDragging = false;
  selectedBody = null;
  removeMouseConstraint();
  document.body.style.cursor = hoveredCard ? 'grab' : 'auto';
});

// دالة فتح النافذة المنبثقة مع بيانات Odoo
const openCardModal = (data: any) => {
  modalTitle.textContent = data.name; // تغير من display_name إلى name بناءً على الـ Contract
  modalDesc.textContent = data.description; // تغير من description_sale إلى description
  modalPrice.textContent = `${data.price} ر.س`; // تغير من list_price إلى price
  modal.classList.remove('hidden');
};

// تم نقل إخفاء رسالة التحميل إلى دالة initCards

// حلقة التحديث والمصير
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // استيفاء (Lerp) ناعم للجاذبية الحالية لتصل للهدف المستخلص من التمرير
  world.gravity.y = THREE.MathUtils.lerp(world.gravity.y, targetGravityY, 0.05);

  // تحديث مقاومة الهواء (linearDamping) بناءً على الجاذبية الحالية
  // كلما اقتربت الجاذبية من الصفر، زادت مقاومة الهواء لمحاكاة انعدام الوزن أو الطفو في الماء
  const isZeroGravity = Math.abs(world.gravity.y) < 2.0;
  
  for(const card of cards) {
    if (isZeroGravity) {
        card.body.linearDamping = THREE.MathUtils.lerp(card.body.linearDamping, 0.8, 0.05);
        card.body.angularDamping = THREE.MathUtils.lerp(card.body.angularDamping, 0.8, 0.05);
    } else {
        card.body.linearDamping = THREE.MathUtils.lerp(card.body.linearDamping, 0.1, 0.05);
        card.body.angularDamping = THREE.MathUtils.lerp(card.body.angularDamping, 0.1, 0.05);
    }
  }

  // تحديث الفيزياء
  world.step(1 / 60, deltaTime, 3);

  // تحديث الرسوميات بناءً على الفيزياء لجميع البطاقات
  for(const card of cards) {
    card.mesh.position.copy(card.body.position as any);
    card.mesh.quaternion.copy(card.body.quaternion as any);
  }

  // Render
  renderer.render(scene, camera);

  // استدعاء الفريم التالي
  window.requestAnimationFrame(tick);
};

tick();

// استجابة لتغيير حجم النافذة (مع Debounce)
let resizeTimeout: ReturnType<typeof setTimeout>;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  
  resizeTimeout = setTimeout(() => {
    // تحديث الكاميرا
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // تحديث المصير
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // تحديث الحوائط الفيزيائية لتتناسب مع الحجم الجديد
    updatePhysicsWalls();
  }, 300); // 300ms debounce
});
