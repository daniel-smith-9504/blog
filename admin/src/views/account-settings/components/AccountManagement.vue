<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import { deviceDetection } from "@pureadmin/utils";
import { getMine, changePassword } from "@/api/user";
import type { UserInfo } from "@/api/user";

defineOptions({
  name: "AccountManagement"
});

const userInfo = ref<UserInfo | null>(null);
const loading = ref(false);

const dialogVisible = ref(false);
const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const submitting = ref(false);

async function fetchUserInfo() {
  try {
    const res = await getMine();
    if (res.code === 0 && res.data) {
      userInfo.value = res.data;
    }
  } catch {
    message("获取用户信息失败", { type: "error" });
  }
}

function openChangePassword() {
  oldPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  dialogVisible.value = true;
}

async function handleChangePassword() {
  if (!oldPassword.value || !newPassword.value) {
    message("请填写旧密码和新密码", { type: "warning" });
    return;
  }
  if (newPassword.value.length < 6) {
    message("新密码长度不能少于 6 位", { type: "warning" });
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    message("两次输入的新密码不一致", { type: "warning" });
    return;
  }
  submitting.value = true;
  try {
    const res = await changePassword({
      oldPassword: oldPassword.value,
      newPassword: newPassword.value
    });
    if (res.code === 0) {
      message("密码修改成功", { type: "success" });
      dialogVisible.value = false;
    } else {
      message(res.message || "修改失败", { type: "error" });
    }
  } catch {
    message("修改密码失败", { type: "error" });
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  fetchUserInfo();
});
</script>

<template>
  <div :class="['min-w-45', deviceDetection() ? 'max-w-full' : 'max-w-[70%]']">
    <h3 class="my-8!">账户管理</h3>

    <div v-if="userInfo" class="space-y-4">
      <div class="flex items-center">
        <div class="flex-1">
          <p>用户名</p>
          <el-text class="mx-1" type="info">{{ userInfo.username }}</el-text>
        </div>
      </div>
      <el-divider />

      <div class="flex items-center">
        <div class="flex-1">
          <p>昵称</p>
          <el-text class="mx-1" type="info">{{ userInfo.nickname || "未设置" }}</el-text>
        </div>
      </div>
      <el-divider />

      <div class="flex items-center">
        <div class="flex-1">
          <p>邮箱</p>
          <el-text class="mx-1" type="info">{{ userInfo.email || "未绑定" }}</el-text>
        </div>
      </div>
      <el-divider />

      <div class="flex items-center">
        <div class="flex-1">
          <p>账户密码</p>
          <el-text class="mx-1" type="info">定期修改密码可以保护账户安全</el-text>
        </div>
        <el-button type="primary" text @click="openChangePassword">
          修改
        </el-button>
      </div>
      <el-divider />
    </div>

    <el-dialog v-model="dialogVisible" title="修改密码" width="400px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="旧密码">
          <el-input v-model="oldPassword" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleChangePassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.el-divider--horizontal {
  border-top: 0.1px var(--el-border-color) var(--el-border-style);
}
</style>
