import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';

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
  gravity: new CANNON.Vec3(0, 0.5, 0), // جاذبية طافية للأعلى مبدئياً لتأثير Anti-Gravity
});

// متغيرات للتحكم بالجاذبية
let targetGravityY = 0.5;

// تم إزالة مستمع التمرير القديم (scroll) لأننا انتقلنا إلى Scroll-jacking

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

// متغير للتحكم بتفعيل الفيزياء (يبدأ كـ false حتى ينتهي ترتيب البطاقات)
let physicsEnabled = false;

// --- طبقة فيزياء الخلفية (Background Physics Layer - Anti-Gravity) ---
const particles: { mesh: THREE.Mesh, body: CANNON.Body }[] = [];
const particleCount = 20;

const createBackgroundParticles = () => {
  const geometries = [
    new THREE.IcosahedronGeometry(0.3, 0),
    new THREE.TorusGeometry(0.3, 0.1, 16, 100),
    new THREE.OctahedronGeometry(0.3, 0)
  ];
  
  const material = new THREE.MeshPhysicalMaterial({
    color: '#0055ff',
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.6, // شبه شفافة لكي لا تزعج النظر
  });

  for (let i = 0; i < particleCount; i++) {
    const geo = geometries[Math.floor(Math.random() * geometries.length)];
    const mesh = new THREE.Mesh(geo, material);
    
    // موقع عشوائي في الفضاء
    const x = (Math.random() - 0.5) * 15;
    const y = (Math.random() - 0.5) * 15;
    const z = (Math.random() - 0.5) * 5 - 2; // خلف البطاقات قليلاً
    
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const body = new CANNON.Body({
      mass: 0.1, // خفيفة جداً
      shape: new CANNON.Sphere(0.4),
      position: new CANNON.Vec3(x, y, z),
      linearDamping: 0.1,
      angularDamping: 0.1
    });
    
    world.addBody(body);
    particles.push({ mesh, body });
  }
};
createBackgroundParticles();

// --- نظام التنقل (Navigation & Scroll-jacking) ---
let currentSection = 'hero';
const sections = document.querySelectorAll('.scroll-section');
const navBtns = document.querySelectorAll('.nav-btn');

const navigateTo = (sectionId: string) => {
  currentSection = sectionId;
  
  // تحديث الـ UI
  sections.forEach(sec => {
    if (sec.id === sectionId) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  // تحديث حالة الفيزياء بناءً على القسم
  if (sectionId === 'products') {
    // تفعيل الجاذبية والفيزياء في قسم المنتجات
    if (!physicsEnabled && cards.length > 0) {
       enablePhysics();
    }
    // إخفاء تأثير الضباب إذا كان موجوداً
    canvasElement.classList.remove('blurred');
  } else {
    // في الأقسام الأخرى، البطاقات قد تطير بعيداً أو نوقف الجاذبية
    // لتأثير Anti-Gravity، سنجعل الجاذبية طافية للأعلى ببطء
    targetGravityY = 0.5;
    canvasElement.classList.add('blurred'); // التركيز على المحتوى النصي
  }
};

navBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).getAttribute('data-target');
    if (target) navigateTo(target);
  });
});

// التمرير بالماوس (Scroll-jacking) للتنقل بين الأقسام
const sectionOrder = ['hero', 'about', 'products', 'contact'];
let isScrolling = false;

window.addEventListener('wheel', (e) => {
  if (isScrolling) return;
  
  const currentIndex = sectionOrder.indexOf(currentSection);
  let nextIndex = currentIndex;

  if (e.deltaY > 0) {
    // تمرير للأسفل
    nextIndex = Math.min(currentIndex + 1, sectionOrder.length - 1);
  } else {
    // تمرير للأعلى
    nextIndex = Math.max(currentIndex - 1, 0);
  }

  if (nextIndex !== currentIndex) {
    isScrolling = true;
    navigateTo(sectionOrder[nextIndex]);
    
    // منع التمرير السريع المتتالي
    setTimeout(() => {
      isScrolling = false;
    }, 1000);
  }
});

// تعطيل التمرير الطبيعي للصفحة
document.body.style.overflow = 'hidden';
document.body.style.height = '100vh';

// إنشاء مجسمات "بطاقات الخدمات" ديناميكياً بناءً على بيانات Odoo
const cards: { mesh: THREE.Mesh, body: CANNON.Body, data: any }[] = [];
const cardGeometry = new THREE.BoxGeometry(2, 3, 0.2); // شكل يشبه بطاقة أو هاتف

const initCards = async () => {
  const liveData = await fetchOdooData();

  liveData.forEach((service: any) => {
    const material = createCardMaterial(service.image); // تغيرت من image_1920 إلى image حسب الـ Contract الجديد
    const mesh = new THREE.Mesh(cardGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // وضع البطاقة خارج الشاشة في البداية (للأعلى)
    mesh.position.set(0, 15, 0);
    mesh.rotation.set(Math.PI, 0, 0); // مقلوبة في البداية
    
    scene.add(mesh);

    // إنشاء الجسم الفيزيائي ولكن لا نضيفه للعالم (world) فوراً
    const body = new CANNON.Body({
      mass: 1 + Math.random() * 2, // كتلة متغيرة قليلاً لتعطي تنوعاً في الحركة
      shape: new CANNON.Box(new CANNON.Vec3(1, 1.5, 0.1)),
      position: new CANNON.Vec3(0, 15, 0), // نفس الموضع المبدئي
      material: boxPhysMaterial,
      linearDamping: 0.5,
      angularDamping: 0.5
    });
    
    // تخزين البيانات مع البطاقة
    cards.push({ mesh, body, data: service });
  });

  // إخفاء رسالة التحميل بعد اكتمال جلب البيانات وبناء المشهد
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => {
      loading.style.display = 'none';
      // بدء حركة الدخول بعد إخفاء شاشة التحميل
      animateEntrance();
    }, 500); // توافق مع تأثير الـ CSS transition
  }
};

// حركة الدخول والترتيب (Entrance Animation)
const animateEntrance = () => {
  cards.forEach((card, index) => {
    // استخدام المسار العمودي (trackX) المخصص لكل فئة
    // تم تمرير الـ trackX من الـ Backend
    const targetX = card.data.trackX !== undefined ? card.data.trackX : 0;
    const targetY = 2 + (Math.random() - 0.5) * 4; // توزيع عشوائي طفيف على محور Y ضمن المسار العمودي
    const targetZ = 0;

    // استخدام GSAP لتحريك الـ Mesh
    gsap.to(card.mesh.position, {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration: 1.5,
      delay: index * 0.2, // دخول متتالي (واحدة تلو الأخرى)
      ease: "power3.out"
    });

    gsap.to(card.mesh.rotation, {
      x: 0, // اعتدال البطاقة
      y: Math.PI * 2, // دورة كاملة مبهرة
      z: 0, // إلغاء الميلان العشوائي في وضع الـ Grid
      duration: 1.5,
      delay: index * 0.2,
      ease: "power3.out",
      onComplete: () => {
        // بعد انتهاء حركة آخر بطاقة
        if (index === cards.length - 1) {
          // ننتظر ثانيتين ليقرأ المستخدم البطاقات، ثم نفعل الفيزياء (التي تم تعديلها للعمل كمسارات عمودية)
          setTimeout(enablePhysics, 2000);
        }
      }
    });
  });
};

// تفعيل الفيزياء بعد انتهاء الترتيب
const enablePhysics = () => {
  cards.forEach(card => {
    // نقل موقع الـ Mesh الحالي إلى الـ Body الفيزيائي
    card.body.position.copy(card.mesh.position as any);
    card.body.quaternion.copy(card.mesh.quaternion as any);
    // إعطاء دفعة بسيطة عشوائية على محور Y فقط (للحفاظ على المسار العمودي)
    card.body.velocity.set(0, (Math.random() - 0.5) * 2, 0);
    // إيقاف الدوران للحفاظ على ترتيب الشبكة (Grid)
    card.body.angularVelocity.set(0, 0, 0);
    
    // تقييد الحركة على المحور X (Smart Grid Logic)
    // سنجعل الـ Damping عالياً جداً على X ونثبت السرعة، أو نقوم بتحديث الـ position برمجياً في الـ tick
    
    world.addBody(card.body);
  });
  physicsEnabled = true;
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
const modalCategory = document.getElementById('modal-category') as HTMLDivElement;
const modalDesc = document.getElementById('modal-desc') as HTMLParagraphElement;
const modalAttributes = document.getElementById('modal-attributes') as HTMLDivElement;
const modalPrice = document.getElementById('modal-price') as HTMLDivElement;
const modalClose = document.getElementById('modal-close') as HTMLButtonElement;
const modalOrder = document.getElementById('modal-order') as HTMLButtonElement;
const canvasElement = document.getElementById('webgl-canvas') as HTMLCanvasElement; // للحصول على عنصر الـ Canvas

// إغلاق النافذة
modalClose?.addEventListener('click', () => {
  modal.classList.add('hidden');
  canvasElement.classList.remove('blurred'); // إزالة تأثير الضباب
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
  modalTitle.textContent = data.name;
  modalCategory.textContent = data.category;
  modalDesc.textContent = data.description;
  
  // بناء جدول المواصفات
  if (data.attributes && data.attributes.length > 0) {
    let tableHTML = '<table><tbody>';
    // محاكاة عرض المواصفات (Odoo يرسل ID المواصفات، في الإنتاج يجب عمل Fetch لتفاصيلها أو إرسالها من الـ Backend كـ Key/Value)
    // هنا نضع مثالاً بسيطاً
    data.attributes.forEach((_attr: any, index: number) => {
      tableHTML += `<tr><th>مواصفة ${index + 1}</th><td>تفاصيل تقنية متقدمة</td></tr>`;
    });
    tableHTML += '</tbody></table>';
    modalAttributes.innerHTML = tableHTML;
    modalAttributes.style.display = 'block';
  } else {
    modalAttributes.style.display = 'none';
  }

  modalPrice.textContent = `${data.price} ر.س`;
  
  // تحديث رابط زر الطلب (يوجه للواتساب كمثال مع اسم المنتج)
  modalOrder.onclick = () => {
    const message = encodeURIComponent(`مرحباً، أريد طلب: ${data.name}`);
    window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
  };

  modal.classList.remove('hidden');
  canvasElement.classList.add('blurred'); // إضافة تأثير الضباب
};

// تم نقل إخفاء رسالة التحميل إلى دالة initCards

// حلقة التحديث والمصير
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  if (physicsEnabled) {
    // استيفاء (Lerp) ناعم للجاذبية الحالية لتصل للهدف المستخلص من التمرير
    world.gravity.y = THREE.MathUtils.lerp(world.gravity.y, targetGravityY, 0.05);

    // تحديث مقاومة الهواء (linearDamping) بناءً على الجاذبية الحالية
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

    // تحديث الرسوميات بناءً على الفيزياء لجميع البطاقات (وتطبيق Smart Grid Logic)
    for(const card of cards) {
      // إجبار البطاقة على البقاء في المسار العمودي المخصص لها
      if (card.data.trackX !== undefined && currentSection === 'products') {
        card.body.position.x = card.data.trackX;
        card.body.velocity.x = 0; // منع الحركة الأفقية تماماً
        // منع الدوران للحفاظ على ترتيب الشبكة
        card.body.quaternion.setFromEuler(0, 0, 0);
        card.body.angularVelocity.set(0, 0, 0);
      }

      card.mesh.position.copy(card.body.position as any);
      card.mesh.quaternion.copy(card.body.quaternion as any);
    }
  }

  // تحديث الجسيمات الخلفية دائماً (تعمل حتى قبل تفعيل البطاقات)
  for(const p of particles) {
    p.mesh.position.copy(p.body.position as any);
    p.mesh.quaternion.copy(p.body.quaternion as any);
    
    // إذا خرج الجسيم من الشاشة للأعلى بسبب انعدام الجاذبية، نعيده من الأسفل
    if (p.body.position.y > 15) {
      p.body.position.y = -15;
      p.body.velocity.set(0,0,0);
    }
    if (p.body.position.y < -15) {
      p.body.position.y = 15;
      p.body.velocity.set(0,0,0);
    }
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
