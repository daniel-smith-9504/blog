<script setup lang="ts">
import "vditor/dist/index.css";
import Vditor from "vditor";
import { useDark } from "@pureadmin/utils";
import { useIntervalFn } from "@vueuse/core";
import { onMounted, ref, watch, toRaw, onUnmounted } from "vue";
import { uploadImage } from "@/api/album";
import { message } from "@/utils/message";

const emit = defineEmits([
  "update:modelValue",
  "after",
  "focus",
  "blur",
  "esc",
  "ctrlEnter",
  "select"
]);

const props = defineProps({
  options: {
    type: Object,
    default() {
      return {};
    }
  },
  modelValue: {
    type: String,
    default: ""
  }
});

const { isDark } = useDark();
const editor = ref<Vditor | null>(null);
const markdownRef = ref<HTMLElement | null>(null);
const editorReady = ref(false);
let pendingValue: string | null = null;

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

onMounted(() => {
  editor.value = new Vditor(markdownRef.value as HTMLElement, {
    ...props.options,
    value: props.modelValue,
    cache: {
      enable: false
    },
    fullscreen: {
      index: 10000
    },
    // 图片上传配置
    upload: {
      url: "/api/upload/image",
      fieldName: "file",
      accept: "image/*",
      max: 10 * 1024 * 1024,
      // 自定义上传：走 Axios（自动携带并刷新 token），与后台其他页面上传方式保持一致
      async handler(fileList: File[]): Promise<null> {
        for (const file of fileList) {
          try {
            const compressed = await compressImage(file);
            const res = await uploadImage(compressed);
            const name = file.name?.replace(/\.[^.]+$/, "") || "image";
            editor.value?.insertValue(`\n\n![${name}](${res.url})\n\n`);
          } catch (e: any) {
            const errorMsg =
              e?.response?.data?.error || e?.message || "图片上传失败";
            message(errorMsg, { type: "error" });
            console.error("[Vditor] 图片上传失败:", e);
          }
        }
        return null;
      }
    },
    after() {
      editorReady.value = true;
      if (pendingValue !== null) {
        editor.value?.setValue(pendingValue);
        pendingValue = null;
      }
      emit("after", toRaw(editor.value));
    },
    input(value: string) {
      emit("update:modelValue", value);
    },
    focus(value: string) {
      emit("focus", value);
    },
    blur(value: string) {
      emit("blur", value);
    },
    esc(value: string) {
      emit("esc", value);
    },
    ctrlEnter(value: string) {
      emit("ctrlEnter", value);
    },
    select(value: string) {
      emit("select", value);
    }
  });
});

watch(
  () => props.modelValue,
  newVal => {
    if (!editorReady.value) {
      pendingValue = newVal;
      return;
    }
    if (newVal !== editor.value?.getValue()) {
      editor.value?.setValue(newVal);
    }
  }
);

watch(
  () => isDark.value,
  newVal => {
    const { pause } = useIntervalFn(() => {
      if (editor.value.vditor) {
        newVal
          ? editor.value.setTheme("dark", "dark", "rose-pine")
          : editor.value.setTheme("classic", "light", "github");
        pause();
      }
    }, 20);
  }
);

onUnmounted(() => {
  const editorInstance = editor.value;
  if (!editorInstance) return;
  try {
    editorInstance?.destroy?.();
  } catch (error) {
    console.log(error);
  }
});
</script>

<template>
  <div ref="markdownRef" />
</template>
