<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message as msg } from "@/utils/message";
import { http } from "@/utils/http";
import { uploadImage } from "@/api/album";
import {
  getAllSiteConfig,
  updateSiteConfig,
  createSiteConfig,
  deleteSiteConfig
} from "@/api/siteConfig";
import type { SiteConfigItem } from "@/api/siteConfig";

defineOptions({ name: "SiteConfigIndex" });

const loading = ref(false);
const dataList = ref<SiteConfigItem[]>([]);

// 图片类配置键名
const SINGLE_IMAGE_KEYS = ["avatarUrl", "defaultPostCover", "photoWallImage"];
const MULTI_IMAGE_KEYS = ["bgImages"];

function isImageKey(key: string): boolean {
  return SINGLE_IMAGE_KEYS.includes(key) || MULTI_IMAGE_KEYS.includes(key);
}
function isSingleImageKey(key: string): boolean {
  return SINGLE_IMAGE_KEYS.includes(key);
}
function isMultiImageKey(key: string): boolean {
  return MULTI_IMAGE_KEYS.includes(key);
}

// 编辑对话框
const dialogVisible = ref(false);
const dialogTitle = ref("编辑配置");
const formRef = ref();
const form = ref({
  key: "",
  value: "",
  description: ""
});
const isEdit = ref(false);

// 多图列表（用于 bgImages）
const imageFileList = ref<any[]>([]);

const rules = {
  key: [{ required: true, message: "请输入配置键名", trigger: "blur" }],
  value: [{ required: true, message: "请输入配置值", trigger: "blur" }]
};

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 60 },
  { label: "配置键名", prop: "key", width: 220 },
  {
    label: "配置值",
    prop: "value",
    minWidth: 240,
    slot: "value"
  },
  { label: "说明", prop: "description", minWidth: 160 },
  {
    label: "更新时间",
    prop: "updated_at",
    width: 170,
    formatter: ({ updated_at }: SiteConfigItem) =>
      updated_at ? updated_at.replace("T", " ").slice(0, 19) : ""
  },
  {
    label: "操作",
    fixed: "right",
    width: 150,
    slot: "operation"
  }
];

async function onSearch() {
  loading.value = true;
  try {
    const res = await getAllSiteConfig();
    console.log("[site-config] API 返回:", res);
    if (Array.isArray(res)) {
      dataList.value = res;
    } else {
      msg("站点配置数据格式异常，请刷新重试", { type: "warning" });
      console.error("[site-config] 返回不是数组:", res);
    }
  } catch (e: any) {
    msg(e?.message ?? "获取站点配置失败", { type: "error" });
    console.error("[site-config] 请求失败:", e);
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  isEdit.value = false;
  dialogTitle.value = "新增配置";
  form.value = { key: "", value: "", description: "" };
  imageFileList.value = [];
  dialogVisible.value = true;
}

function openEdit(row: SiteConfigItem) {
  isEdit.value = true;
  dialogTitle.value = "编辑配置";
  const val = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
  form.value = {
    key: row.key,
    value: val,
    description: row.description || ""
  };
  // 初始化多图列表
  if (isMultiImageKey(row.key)) {
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr)) {
        imageFileList.value = arr.map((url: string, idx: number) => ({
            name: `图片${idx + 1}`,
            url,
            status: "success"
          }));
      } else {
        imageFileList.value = [];
      }
    } catch {
      imageFileList.value = [];
    }
  } else {
    imageFileList.value = [];
  }
  dialogVisible.value = true;
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  // 多图配置从 fileList 生成 value
  if (isMultiImageKey(form.value.key)) {
    const urls = imageFileList.value
      .map((f: any) => f.url || f.response?.url)
      .filter(Boolean);
    form.value.value = JSON.stringify(urls);
  }

  try {
    if (isEdit.value) {
      await updateSiteConfig(form.value.key, {
        value: form.value.value,
        description: form.value.description
      });
      msg("更新成功", { type: "success" });
    } else {
      await createSiteConfig({
        key: form.value.key,
        value: form.value.value,
        description: form.value.description
      });
      msg("新增成功", { type: "success" });
    }
    dialogVisible.value = false;
    onSearch();
  } catch (e: any) {
    msg(e?.message ?? "操作失败", { type: "error" });
  }
}

async function handleDelete(row: SiteConfigItem) {
  try {
    await deleteSiteConfig(row.key);
    msg("删除成功", { type: "success" });
    onSearch();
  } catch (e: any) {
    msg(e?.message ?? "删除失败", { type: "error" });
  }
}

// 删除旧图片文件
async function deleteOldFile(url: string) {
  if (!url || !url.startsWith("/uploads/")) return;
  try {
    await http.request("delete", `/api/upload/image?url=${encodeURIComponent(url)}`);
  } catch {
    // 静默失败，不影响主流程
  }
}

// 压缩/缩放图片：最大 2000px 宽/高，GIF、SVG 跳过压缩
function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return Promise.resolve(file);
  }

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const quality = outputType === "image/png" ? undefined : 0.8;

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 2000;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        // PNG 保留透明通道：不填充背景
        if (outputType !== "image/png") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => {
            if (!blob) return resolve(file);
            const ext = outputType === "image/png" ? "png" : "jpg";
            const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
            resolve(new File([blob], name, { type: outputType }));
          },
          outputType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// 单图上传：走 Axios（自动携带并刷新 token），与照片墙等其他页面上传方式保持一致
async function handleSingleImageUpload(options: any) {
  const file = options.file;
  if (!file) return;
  try {
    const compressed = await compressImage(file);
    const res = await uploadImage(compressed);
    const oldUrl = form.value.value;
    form.value.value = res.url;
    options.onSuccess({ url: res.url });
    if (oldUrl && oldUrl.startsWith("/uploads/")) {
      deleteOldFile(oldUrl);
    }
    msg("上传成功", { type: "success" });
  } catch (e: any) {
    options.onError(e);
    const errorMsg = e?.response?.data?.error || e?.message || "图片上传失败";
    msg(errorMsg, { type: "error" });
    console.error("[site-config] 单图上传失败:", e);
  }
}

// 多图上传：走 Axios（自动携带并刷新 token）
async function handleMultiImageUpload(options: any) {
  const file = options.file;
  if (!file) return;
  try {
    const compressed = await compressImage(file);
    const res = await uploadImage(compressed);
    // 通知 el-upload 成功，file.response 会写入 url，供删除与保存时读取
    options.onSuccess({ url: res.url });
    // 同步更新 form.value，确保表单验证正确
    syncMultiImageValue();
  } catch (e: any) {
    options.onError(e);
    const errorMsg =
      e?.response?.data?.error || e?.message || `${file.name || "图片"}上传失败`;
    msg(errorMsg, { type: "error" });
    console.error("[site-config] 多图上传失败:", e);
  }
}

// 多图删除时清理服务器文件
async function onMultiImageRemove(uploadFile: any) {
  const url = uploadFile.url || uploadFile.response?.url;
  if (url && url.startsWith("/uploads/")) {
    await deleteOldFile(url);
  }
  // 同步更新 form.value，确保表单验证正确
  syncMultiImageValue();
}

// 同步多图列表到 form.value
function syncMultiImageValue() {
  if (!isMultiImageKey(form.value.key)) return;
  const urls = imageFileList.value
    .map((f: any) => f.url || f.response?.url)
    .filter(Boolean);
  form.value.value = JSON.stringify(urls);
}

// 清空单图
async function clearSingleImage() {
  const oldUrl = form.value.value;
  form.value.value = "";
  if (oldUrl && oldUrl.startsWith("/uploads/")) {
    await deleteOldFile(oldUrl);
  }
}

function formatValue(val: unknown): string {
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function getImageUrls(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.filter((v: any) => typeof v === "string");
    } catch {
      // 不是 JSON，当作单个 URL
    }
    return [val].filter(v => typeof v === "string" && (v.startsWith("/") || v.startsWith("http")));
  }
  return [];
}

onMounted(() => onSearch());
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="font-medium">站点配置</span>
          <el-button type="primary" @click="openAdd">新增配置</el-button>
        </div>
      </template>

      <pure-table
        :data="dataList"
        :columns="columns"
        :loading="loading"
        align-whole="center"
        row-key="id"
        table-layout="auto"
      >
        <template #value="{ row }">
          <div class="flex items-center justify-start gap-2 flex-wrap">
            <template v-if="isSingleImageKey(row.key)">
              <el-image
                v-if="row.value && row.value.trim() && row.value !== 'null' && row.value !== 'undefined'"
                :src="row.value"
                style="width: 60px; height: 60px; border-radius: 6px"
                fit="cover"
                :preview-src-list="[row.value]"
                preview-teleported
              />
              <span v-else class="text-gray-400 text-sm">未设置</span>
            </template>
            <template v-else-if="isMultiImageKey(row.key)">
              <template v-if="getImageUrls(row.value).length">
                <el-image
                  v-for="(url, idx) in getImageUrls(row.value).slice(0, 4)"
                  :key="idx"
                  :src="url"
                  style="width: 60px; height: 60px; border-radius: 6px"
                  fit="cover"
                  :preview-src-list="getImageUrls(row.value)"
                  preview-teleported
                />
                <span
                  v-if="getImageUrls(row.value).length > 4"
                  class="text-gray-400 text-sm"
                >
                  +{{ getImageUrls(row.value).length - 4 }}
                </span>
              </template>
              <span v-else class="text-gray-400 text-sm">未设置</span>
            </template>
            <template v-else>
              <div
                class="text-left max-w-xs truncate"
                :title="formatValue(row.value)"
              >
                {{ formatValue(row.value) }}
              </div>
            </template>
          </div>
        </template>

        <template #operation="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">
            编辑
          </el-button>
          <el-popconfirm
            :title="`确认删除配置 ${row.key}？`"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button link type="danger" size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </pure-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="620px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="配置键名" prop="key">
          <el-input
            v-model="form.key"
            :disabled="isEdit"
            placeholder="如 cloudMusicPlaylistId"
          />
        </el-form-item>

        <!-- 单图配置 -->
        <template v-if="isSingleImageKey(form.key)">
          <el-form-item label="当前图片">
            <div class="flex items-center gap-4">
              <el-image
                v-if="form.value && form.value.trim() && form.value !== 'null' && form.value !== 'undefined'"
                :src="form.value"
                style="width: 120px; height: 120px; border-radius: 8px"
                fit="cover"
                :preview-src-list="[form.value]"
                preview-teleported
              />
              <span v-else class="text-gray-400">暂无图片</span>
            </div>
          </el-form-item>
          <el-form-item label="更换图片">
            <el-upload
              :http-request="handleSingleImageUpload"
              :show-file-list="false"
              accept="image/*"
            >
              <el-button type="primary">上传新图片</el-button>
            </el-upload>
          </el-form-item>
          <el-form-item prop="_clear_image" v-if="form.value">
            <el-button type="danger" link @click="clearSingleImage">
              清空图片
            </el-button>
          </el-form-item>
        </template>

        <!-- 多图配置（背景图列表） -->
        <template v-else-if="isMultiImageKey(form.key)">
          <el-form-item label="图片列表" prop="value">
            <el-upload
              v-model:file-list="imageFileList"
              :http-request="handleMultiImageUpload"
              list-type="picture-card"
              :on-remove="onMultiImageRemove"
              accept="image/*"
            >
              <span style="font-size: 20px">+</span>
            </el-upload>
          </el-form-item>
        </template>

        <!-- 普通文本配置 -->
        <template v-else>
          <el-form-item label="配置值" prop="value">
            <el-input
              v-model="form.value"
              type="textarea"
              :rows="3"
              placeholder="配置值"
            />
          </el-form-item>
        </template>

        <el-form-item label="说明" prop="description">
          <el-input
            v-model="form.description"
            placeholder="配置项说明（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
