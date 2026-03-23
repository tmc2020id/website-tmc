import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import path from 'path';

export default defineConfig({
  // دعم استيراد ملفات Shaders (GLSL, VS, FS, VERT, FRAG)
  plugins: [glsl()],
  
  resolve: {
    alias: {
      // إعداد Path Aliases لتسهيل الاستيراد
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@shaders': path.resolve(__dirname, './src/shaders'),
      '@components': path.resolve(__dirname, './src/components')
    }
  },
  
  server: {
    port: 5173, // المنفذ الافتراضي
    strictPort: false, // يسمح بالبحث عن منفذ آخر إذا كان 5173 مشغولاً
    host: true, // لتمكين الوصول من الشبكة المحلية (Network)
    cors: true, // حل مشاكل Cross-Origin عند تحميل assets
    hmr: {
      overlay: true, // إظهار الأخطاء على الشاشة
    },
    watch: {
      usePolling: true, // لضمان عمل HMR بكفاءة أعلى
    }
  },
  
  build: {
    sourcemap: true, // تفعيل Source Maps لتسهيل تصحيح الأخطاء (Debugging)
    target: 'esnext', // استخدام أحدث ميزات JS
    minify: 'terser', // تصغير الكود
    rollupOptions: {
      treeshake: true, // تفعيل Tree Shaking لتقليل حجم الحزمة (مهم جداً لـ Three.js)
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) {
              return 'three';
            }
            if (id.includes('cannon-es')) {
              return 'cannon-es';
            }
            return 'vendor'; // للمكتبات الأخرى
          }
        }
      }
    }
  },
  
  optimizeDeps: {
    // تحسين تحميل المكتبات الضخمة أثناء التطوير
    include: ['three', 'cannon-es']
  }
});
