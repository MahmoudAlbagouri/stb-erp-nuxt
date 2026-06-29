<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastContainer />

  <Teleport to="body">
    <div class="stb-bg" aria-hidden="true">
      <span class="stb-orb stb-orb--1" />
      <span class="stb-orb stb-orb--2" />
      <span class="stb-orb stb-orb--3" />
      <span class="stb-orb stb-orb--4" />
      <span class="stb-ring stb-ring--1" />
      <span class="stb-ring stb-ring--2" />
      <span class="stb-ring stb-ring--3" />
      <span class="stb-grid" />
      <span class="stb-dot stb-dot--1" />
      <span class="stb-dot stb-dot--2" />
      <span class="stb-dot stb-dot--3" />
      <span class="stb-dot stb-dot--4" />
      <span class="stb-dot stb-dot--5" />
      <span class="stb-dot stb-dot--6" />

      <!-- ✦ دوائر صاعدة -->
      <span class="stb-rise stb-rise--1" />
      <span class="stb-rise stb-rise--2" />
      <span class="stb-rise stb-rise--3" />
      <span class="stb-rise stb-rise--4" />
      <span class="stb-rise stb-rise--5" />

      <!-- ✦ دوائر مدارية -->
      <span class="stb-orbit stb-orbit--1"
        ><span class="stb-orbit__dot"
      /></span>
      <span class="stb-orbit stb-orbit--2"
        ><span class="stb-orbit__dot"
      /></span>
      <span class="stb-orbit stb-orbit--3"
        ><span class="stb-orbit__dot"
      /></span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { onMounted } from "vue";

const auth = useAuthStore();
onMounted(() => auth.hydrate());
</script>

<style>
.stb-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

/* ══ القديم بدون تغيير ═══════════════════════════════════════════════════ */
.stb-orb {
  position: absolute;
  border-radius: 50%;
  will-change: transform, opacity;
}
.stb-orb--1 {
  width: 600px;
  height: 600px;
  top: -120px;
  right: -150px;
  background: radial-gradient(
    circle,
    rgba(10, 79, 168, 0.18) 0%,
    transparent 70%
  );
  animation: orb-float-1 18s ease-in-out infinite;
}
.stb-orb--2 {
  width: 480px;
  height: 480px;
  bottom: -100px;
  left: -100px;
  background: radial-gradient(
    circle,
    rgba(0, 170, 255, 0.1) 0%,
    transparent 65%
  );
  animation: orb-float-2 22s ease-in-out infinite;
}
.stb-orb--3 {
  width: 360px;
  height: 360px;
  top: 40%;
  left: 30%;
  background: radial-gradient(
    circle,
    rgba(6, 45, 107, 0.14) 0%,
    transparent 70%
  );
  animation: orb-float-3 26s ease-in-out infinite;
}
.stb-orb--4 {
  width: 280px;
  height: 280px;
  top: 20%;
  left: 10%;
  background: radial-gradient(
    circle,
    rgba(0, 170, 255, 0.07) 0%,
    transparent 60%
  );
  animation: orb-float-4 20s ease-in-out infinite;
}
@keyframes orb-float-1 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(-40px, 30px) scale(1.05);
  }
  66% {
    transform: translate(20px, -20px) scale(0.97);
  }
}
@keyframes orb-float-2 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(50px, -35px) scale(1.08);
  }
  70% {
    transform: translate(-20px, 20px) scale(0.95);
  }
}
@keyframes orb-float-3 {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-60px, 40px);
  }
}
@keyframes orb-float-4 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(30px, -50px) scale(1.1);
    opacity: 0.6;
  }
}

.stb-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed rgba(30, 58, 95, 0.5);
  will-change: transform;
}
.stb-ring--1 {
  width: 500px;
  height: 500px;
  top: 50%;
  left: 50%;
  margin: -250px 0 0 -250px;
  animation: ring-spin 35s linear infinite;
}
.stb-ring--2 {
  width: 340px;
  height: 340px;
  top: 50%;
  left: 50%;
  margin: -170px 0 0 -170px;
  border-color: rgba(0, 170, 255, 0.08);
  border-style: solid;
  animation: ring-spin 22s linear infinite reverse;
}
.stb-ring--3 {
  width: 700px;
  height: 700px;
  top: 50%;
  left: 50%;
  margin: -350px 0 0 -350px;
  border-color: rgba(10, 79, 168, 0.07);
  animation: ring-spin 50s linear infinite;
}
@keyframes ring-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.stb-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 170, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 170, 255, 0.025) 1px, transparent 1px);
  background-size: 60px 60px;
}

.stb-dot {
  position: absolute;
  border-radius: 50%;
  background: #00aaff;
  will-change: opacity;
}
.stb-dot--1 {
  width: 3px;
  height: 3px;
  top: 15%;
  right: 20%;
  animation: twinkle 4s ease-in-out infinite;
}
.stb-dot--2 {
  width: 2px;
  height: 2px;
  top: 35%;
  left: 15%;
  animation: twinkle 6s ease-in-out infinite 1s;
}
.stb-dot--3 {
  width: 4px;
  height: 4px;
  top: 60%;
  right: 35%;
  animation: twinkle 5s ease-in-out infinite 2s;
}
.stb-dot--4 {
  width: 2px;
  height: 2px;
  top: 75%;
  left: 40%;
  animation: twinkle 7s ease-in-out infinite 0.5s;
}
.stb-dot--5 {
  width: 3px;
  height: 3px;
  top: 25%;
  left: 55%;
  animation: twinkle 5.5s ease-in-out infinite 3s;
}
.stb-dot--6 {
  width: 2px;
  height: 2px;
  top: 85%;
  right: 15%;
  animation: twinkle 4.5s ease-in-out infinite 1.5s;
}
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.15;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.6);
  }
}

/* ══ ✦ دوائر صاعدة ══════════════════════════════════════════════════════ */
.stb-rise {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(0, 170, 255, 0.2);
  bottom: -60px;
  will-change: transform, opacity;
}
.stb-rise--1 {
  width: 16px;
  height: 16px;
  left: 8%;
  background: rgba(0, 170, 255, 0.07);
  animation: rise 15s ease-in-out infinite;
}
.stb-rise--2 {
  width: 10px;
  height: 10px;
  left: 25%;
  background: rgba(0, 170, 255, 0.05);
  animation: rise 20s ease-in-out infinite 5s;
}
.stb-rise--3 {
  width: 22px;
  height: 22px;
  left: 50%;
  background: rgba(10, 79, 168, 0.09);
  border-color: rgba(0, 170, 255, 0.12);
  animation: rise 24s ease-in-out infinite 9s;
}
.stb-rise--4 {
  width: 12px;
  height: 12px;
  left: 70%;
  background: rgba(0, 170, 255, 0.06);
  animation: rise 17s ease-in-out infinite 3s;
}
.stb-rise--5 {
  width: 8px;
  height: 8px;
  left: 88%;
  background: rgba(0, 212, 255, 0.07);
  border-color: rgba(0, 212, 255, 0.18);
  animation: rise 21s ease-in-out infinite 12s;
}

@keyframes rise {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  8% {
    opacity: 0.65;
  }
  25% {
    transform: translateY(-27vh) translateX(10px);
  }
  50% {
    transform: translateY(-55vh) translateX(-7px);
    opacity: 0.45;
  }
  75% {
    transform: translateY(-80vh) translateX(9px);
  }
  92% {
    opacity: 0.2;
  }
  100% {
    transform: translateY(-112vh) translateX(0);
    opacity: 0;
  }
}

/* ══ ✦ دوائر مدارية ══════════════════════════════════════════════════════ */
/*
  الـ container يدور كله حول المركز.
  النقطة الداخلية على الحافة = تسير في مسار دائري كامل.
*/
.stb-orbit {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}
.stb-orbit--1 {
  width: 500px;
  height: 500px;
  top: 50%;
  left: 50%;
  margin: -250px 0 0 -250px;
  animation: orbit-cw 28s linear infinite;
}
.stb-orbit--2 {
  width: 340px;
  height: 340px;
  top: 50%;
  left: 50%;
  margin: -170px 0 0 -170px;
  animation: orbit-ccw 18s linear infinite;
}
.stb-orbit--3 {
  width: 680px;
  height: 680px;
  top: 50%;
  left: 50%;
  margin: -340px 0 0 -340px;
  animation: orbit-cw 44s linear infinite 7s;
}

@keyframes orbit-cw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes orbit-ccw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}

/* النقطة على الحافة العلوية من كل container */
.stb-orbit__dot {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 50%;
  will-change: transform;
}
.stb-orbit--1 .stb-orbit__dot {
  width: 7px;
  height: 7px;
  top: -3px;
  background: rgba(0, 170, 255, 0.5);
  box-shadow: 0 0 7px 2px rgba(0, 170, 255, 0.18);
}
.stb-orbit--2 .stb-orbit__dot {
  width: 5px;
  height: 5px;
  top: -2px;
  background: rgba(0, 212, 255, 0.4);
  box-shadow: 0 0 5px 1px rgba(0, 212, 255, 0.12);
}
.stb-orbit--3 .stb-orbit__dot {
  width: 4px;
  height: 4px;
  top: -2px;
  background: rgba(10, 79, 168, 0.55);
  box-shadow: 0 0 4px 1px rgba(10, 79, 168, 0.15);
}

/* المحتوى فوق الخلفية */
#__nuxt > .layout,
#__nuxt > [data-v-app] {
  position: relative;
  z-index: 1;
}
</style>
