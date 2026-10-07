<script setup lang="ts">
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { loginRules } from "./utils/rule";
import { debounce } from "@pureadmin/utils";
import { useNav } from "@/layout/hooks/useNav";
import { useEventListener } from "@vueuse/core";
import type { FormInstance } from "element-plus";
import { useUserStoreHook } from "@/store/modules/user";
import { initRouter, getTopMenu } from "@/router/utils";
import { ReImageVerify } from "@/components/ReImageVerify";
import { ref, reactive, watch, onMounted } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { avatar } from "./utils/static";
import { setToken } from "@/utils/auth";

import Lock from "~icons/ri/lock-fill";
import User from "~icons/ri/user-3-fill";
import Keyhole from "~icons/ri/shield-keyhole-line";
import Github from "~icons/ri/github-fill";

defineOptions({
  name: "Login"
});

const imgCode = ref("");
const loginDay = ref(7);
const router = useRouter();
const loading = ref(false);
const checked = ref(false);
const disabled = ref(false);
const ruleFormRef = ref<FormInstance>();

const { title } = useNav();

const ruleForm = reactive({
  username: "",
  password: "",
  verifyCode: ""
});

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const expires = params.get("expires");
  const error = params.get("error");

  if (error === "github_unauthorized") {
    message("该 GitHub 账号无权限登录后台", { type: "error" });
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }

  if (token && expires) {
    setToken({
      accessToken: token,
      expires: new Date(Number(expires)),
      refreshToken: "",
      username: "admin",
      nickname: "Admin",
      roles: ["admin"],
      permissions: ["*"]
    });
    initRouter().then(() => {
      router.push(getTopMenu(true).path).then(() => {
        message("GitHub 登录成功", { type: "success" });
      });
    });
    window.history.replaceState({}, "", window.location.pathname);
  }
});

const loginByGithub = () => {
  window.location.href = "/api/auth/github/login?state=admin";
};

const onLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(valid => {
    if (valid) {
      loading.value = true;
      useUserStoreHook()
        .loginByUsername({
          username: ruleForm.username,
          password: ruleForm.password
        })
        .then(async () => {
          await initRouter();
          disabled.value = true;
          router.push(getTopMenu(true).path).then(() => {
            message("登录成功", { type: "success" });
          });
        })
        .catch(() => {
          message("登录失败", { type: "error" });
        })
        .finally(() => {
          disabled.value = false;
          loading.value = false;
        });
    }
  });
};

const immediateDebounce: any = debounce(
  formRef => onLogin(formRef),
  1000,
  true
);

useEventListener(document, "keydown", ({ code }) => {
  if (
    ["Enter", "NumpadEnter"].includes(code) &&
    !disabled.value &&
    !loading.value
  )
    immediateDebounce(ruleFormRef.value);
});

watch(imgCode, value => {
  useUserStoreHook().SET_VERIFYCODE(value);
});
watch(checked, bool => {
  useUserStoreHook().SET_ISREMEMBERED(bool);
});
watch(loginDay, value => {
  useUserStoreHook().SET_LOGINDAY(value);
});
</script>

<template>
  <div class="login-page">
    <!-- 背景网格 -->
    <div class="bg-grid" />

    <!-- 柔和光晕装饰 -->
    <div class="glow glow-1" />
    <div class="glow glow-2" />
    <div class="glow glow-3" />

    <!-- 细线几何装饰 -->
    <svg class="lines-deco" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M-100 200 Q 200 100, 400 300 T 900 200" stroke="rgba(59,130,246,0.12)" stroke-width="1.5" fill="none">
        <animate attributeName="d" dur="12s" repeatCount="indefinite"
          values="M-100 200 Q 200 100, 400 300 T 900 200;
                  M-100 250 Q 200 150, 400 250 T 900 300;
                  M-100 200 Q 200 100, 400 300 T 900 200" />
      </path>
      <path d="M1540 600 Q 1200 500, 1000 700 T 500 600" stroke="rgba(99,102,241,0.1)" stroke-width="1.5" fill="none">
        <animate attributeName="d" dur="15s" repeatCount="indefinite"
          values="M1540 600 Q 1200 500, 1000 700 T 500 600;
                  M1540 650 Q 1200 550, 1000 650 T 500 700;
                  M1540 600 Q 1200 500, 1000 700 T 500 600" />
      </path>
      <circle cx="120" cy="150" r="4" fill="rgba(59,130,246,0.2)">
        <animate attributeName="cy" values="150;170;150" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="1300" cy="750" r="3" fill="rgba(99,102,241,0.25)">
        <animate attributeName="cy" values="750;730;750" dur="8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0.5;0.25" dur="8s" repeatCount="indefinite" />
      </circle>
      <circle cx="1100" cy="120" r="2.5" fill="rgba(56,189,248,0.2)">
        <animate attributeName="cy" values="120;140;120" dur="7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.45;0.2" dur="7s" repeatCount="indefinite" />
      </circle>
      <circle cx="200" cy="800" r="3.5" fill="rgba(59,130,246,0.15)">
        <animate attributeName="cy" values="800;780;800" dur="9s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.4;0.15" dur="9s" repeatCount="indefinite" />
      </circle>
    </svg>

    <!-- 登录卡片（居中） -->
    <div class="login-card">
      <!-- Logo -->
      <div class="logo-wrap">
        <component :is="avatar" class="logo-icon" />
        <h1 class="site-title">{{ title }}</h1>
        <p class="site-subtitle">后台管理系统</p>
      </div>

      <!-- 登录表单 -->
      <el-form
        ref="ruleFormRef"
        :model="ruleForm"
        :rules="loginRules"
        size="large"
        class="login-form"
      >
        <el-form-item
          :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]"
          prop="username"
        >
          <el-input
            v-model="ruleForm.username"
            clearable
            placeholder="用户名"
            :prefix-icon="useRenderIcon(User)"
            class="login-input"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="ruleForm.password"
            clearable
            show-password
            placeholder="密码"
            :prefix-icon="useRenderIcon(Lock)"
            class="login-input"
          />
        </el-form-item>

        <el-form-item prop="verifyCode">
          <el-input
            v-model="ruleForm.verifyCode"
            clearable
            placeholder="验证码"
            :prefix-icon="useRenderIcon(Keyhole)"
            class="login-input"
          >
            <template #append>
              <ReImageVerify v-model:code="imgCode" />
            </template>
          </el-input>
        </el-form-item>

        <div class="flex items-center justify-between text-sm mb-2">
          <el-checkbox v-model="checked">
            <span class="flex items-center text-slate-500">
              <select
                v-model="loginDay"
                :style="{
                  width: loginDay < 10 ? '10px' : '16px',
                  outline: 'none',
                  background: 'none',
                  appearance: 'none',
                  border: 'none'
                }"
              >
                <option value="1">1</option>
                <option value="7">7</option>
                <option value="30">30</option>
              </select>
              天内免登录
            </span>
          </el-checkbox>
        </div>

        <el-button
          class="w-full !h-11 !text-base !rounded-xl"
          size="default"
          type="primary"
          :loading="loading"
          :disabled="disabled"
          @click="onLogin(ruleFormRef)"
        >
          登 录
        </el-button>

        <div class="flex items-center justify-center my-3">
          <div class="flex-1 h-px bg-gray-200" />
          <span class="mx-3 text-xs text-gray-400">或</span>
          <div class="flex-1 h-px bg-gray-200" />
        </div>

        <el-button
          class="w-full !h-11 !text-base !rounded-xl"
          size="default"
          @click="loginByGithub"
        >
          <component :is="useRenderIcon(Github)" class="mr-1" />
          使用 GitHub 登录
        </el-button>
      </el-form>

      <!-- 底部版权 -->
      <div class="copyright">
        Copyright © {{ new Date().getFullYear() }} {{ title }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  max-width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #eef5ff 0%, #f5f9ff 40%, #ffffff 70%, #e8f0fe 100%);
}

/* ========== 淡网格背景 ========== */
.bg-grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.08) 1px, transparent 0);
  background-size: 40px 40px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
}

/* ========== 柔和光晕 ========== */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.glow-1 {
  width: 500px;
  height: 500px;
  background: rgba(59, 130, 246, 0.06);
  left: -150px;
  top: -100px;
  animation: drift 16s ease-in-out infinite alternate;
}

.glow-2 {
  width: 400px;
  height: 400px;
  background: rgba(99, 102, 241, 0.05);
  right: -120px;
  bottom: -80px;
  animation: drift 18s ease-in-out infinite alternate-reverse;
}

.glow-3 {
  width: 300px;
  height: 300px;
  background: rgba(56, 189, 248, 0.04);
  left: 30%;
  top: 60%;
  animation: drift 14s ease-in-out infinite alternate;
}

@keyframes drift {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(40px, -30px) scale(1.08);
  }
}

/* ========== SVG 细线装饰 ========== */
.lines-deco {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* ========== 登录卡片（居中） ========== */
.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 420px;
  padding: 44px 40px 36px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.02),
    0 10px 30px -5px rgba(59, 130, 246, 0.08),
    0 4px 16px -2px rgba(0, 0, 0, 0.04);
  animation: fadeInUp 0.7s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo 区域 */
.logo-wrap {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  display: block;
}

/* ========== 动态渐变标题 ========== */
.site-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0;
  background: linear-gradient(
    90deg,
    #3b82f6,
    #6366f1,
    #8b5cf6,
    #3b82f6
  );
  background-size: 300% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientFlow 4s linear infinite;
}

@keyframes gradientFlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 300% 50%;
  }
}

.site-subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 6px;
}

/* 表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 输入框 */
:deep(.login-input .el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  padding: 6px 16px;
  background: #f8fafc;
  transition: all 0.25s ease;
}

:deep(.login-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
  background: #ffffff;
}

:deep(.login-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3b82f6 inset, 0 0 0 4px rgba(59, 130, 246, 0.08);
  background: #ffffff;
}

/* 登录按钮 */
:deep(.el-button--primary) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
  transition: all 0.2s ease;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}

:deep(.el-button--primary:active) {
  transform: translateY(0);
}

/* 版权 */
.copyright {
  margin-top: 28px;
  text-align: center;
  font-size: 12px;
  color: #cbd5e1;
}

/* 响应式 */
@media screen and (max-width: 480px) {
  .login-card {
    margin: 0 20px;
    padding: 32px 24px 28px;
    border-radius: 20px;
  }

  .site-title {
    font-size: 22px;
  }

  .logo-icon {
    width: 52px;
    height: 52px;
  }

  .glow-1,
  .glow-2,
  .glow-3 {
    filter: blur(50px);
  }
}
</style>
