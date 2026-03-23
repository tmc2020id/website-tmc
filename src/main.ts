import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// إعداد المشهد الأساسي
const canvas = document.querySelector('#webgl-canvas') as HTMLCanvasElement;
const loading = document.querySelector('#loading') as HTMLDivElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#111');

// الكاميرا
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// المصير (Renderer)
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

// الإضاءة
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// إعداد محرك الفيزياء (Cannon.js)
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});

// إنشاء أرضية
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ color: '#444' });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// إنشاء مكعب يتأثر بالفيزياء
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({ color: '#ff0000' });
const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
boxMesh.castShadow = true;
scene.add(boxMesh);

const boxBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
  position: new CANNON.Vec3(0, 5, 0)
});
world.addBody(boxBody);

// إخفاء رسالة التحميل
if (loading) {
  loading.style.display = 'none';
}

// حلقة التحديث والمصير
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // تحديث الفيزياء
  world.step(1 / 60, deltaTime, 3);

  // تحديث الرسوميات بناءً على الفيزياء
  boxMesh.position.copy(boxBody.position as any);
  boxMesh.quaternion.copy(boxBody.quaternion as any);

  // إضافة حركة دوران بسيطة للمكعب
  boxMesh.rotation.y += 0.01;

  // Render
  renderer.render(scene, camera);

  // استدعاء الفريم التالي
  window.requestAnimationFrame(tick);
};

tick();

// استجابة لتغيير حجم النافذة
window.addEventListener('resize', () => {
  // تحديث الكاميرا
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // تحديث المصير
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
