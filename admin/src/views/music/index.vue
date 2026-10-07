<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import {
  getLocalMusics,
  deleteMusic,
  uploadMusic,
  updateMusic,
  type MusicItem
} from "@/api/music";
import { getPresignedUrl } from "@/api/upload";

defineOptions({ name: "MusicIndex" });

const loading = ref(false);
const dataList = ref<MusicItem[]>([]);
const uploadVisible = ref(false);
const uploading = ref(false);
const searchQuery = ref("");
const editingId = ref<number | null>(null);
const editVisible = ref(false);
const editForm = ref({
  title: "",
  artist: "",
  cover: null as File | null,
  lrc: null as File | null,
  sort: 0
});

const uploadForm = ref({
  title: "",
  artist: "",
  file: null as File | null,
  cover: null as File | null,
  lrc: null as File | null,
  sort: 0
});
const uploadFormRef = ref();

const uploadRules = {
  file: [{ required: true, message: "请选择音频文件", trigger: "change" }]
};

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 60 },
  {
    label: "封面",
    prop: "cover",
    width: 80,
    slot: "cover"
  },
  { label: "歌名", prop: "title", minWidth: 150 },
  { label: "歌手", prop: "artist", minWidth: 120 },
  {
    label: "歌词",
    prop: "lrc",
    width: 80,
    slot: "lrc"
  },
  { label: "排序", prop: "sort", width: 80 },
  {
    label: "上传时间",
    prop: "created_at",
    minWidth: 170,
    formatter: ({ created_at }: { created_at: string }) =>
      created_at?.replace("T", " ").slice(0, 19) ?? ""
  },
  { label: "操作", fixed: "right", width: 150, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const res = await getLocalMusics();
    let list = res;
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.artist.toLowerCase().includes(q)
      );
    }
    dataList.value = list;
  } catch {
    message("获取音乐列表失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function handleDelete(row: MusicItem) {
  try {
    await deleteMusic(row.id);
    message("删除成功", { type: "success" });
    onSearch();
  } catch {
    message("删除失败", { type: "error" });
  }
}

function openEdit(row: MusicItem) {
  editingId.value = row.id;
  editForm.value = {
    title: row.title || "",
    artist: row.artist || "",
    cover: null,
    lrc: null,
    sort: row.sort ?? 0
  };
  editVisible.value = true;
}

function handleEditCoverChange(file: any) {
  editForm.value.cover = file.raw;
}

function handleEditLrcChange(file: any) {
  editForm.value.lrc = file.raw;
}

async function handleUpdate() {
  if (!editingId.value) return;
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append("title", editForm.value.title);
    fd.append("artist", editForm.value.artist);
    fd.append("sort", String(editForm.value.sort));
    if (editForm.value.cover) fd.append("cover", editForm.value.cover);
    if (editForm.value.lrc) fd.append("lrc", editForm.value.lrc);

    await updateMusic(editingId.value, fd);
    message("更新成功", { type: "success" });
    editVisible.value = false;
    onSearch();
  } catch (err: any) {
    message("更新失败: " + (err?.response?.data?.error || err?.message || ""), { type: "error" });
  } finally {
    uploading.value = false;
  }
}

function openUpload() {
  uploadForm.value = {
    title: "",
    artist: "",
    file: null,
    cover: null,
    lrc: null,
    sort: 0
  };
  uploadVisible.value = true;
}

function handleFileChange(file: any) {
  uploadForm.value.file = file.raw;
}

function handleCoverChange(file: any) {
  uploadForm.value.cover = file.raw;
}

function handleLrcChange(file: any) {
  uploadForm.value.lrc = file.raw;
}

async function handleUpload() {
  if (!uploadForm.value.file) {
    message("请选择音频文件", { type: "warning" });
    return;
  }
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append("title", uploadForm.value.title);
    fd.append("artist", uploadForm.value.artist);
    fd.append("sort", String(uploadForm.value.sort));

    // 大文件（>5MB）直传 R2，绕过 Vercel/Netlify 请求体限制
    const audioFile = uploadForm.value.file;
    const MAX_DIRECT_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 后端限制 50MB

    if (audioFile.size > MAX_TOTAL_SIZE) {
      throw new Error(`音频文件大小超过 50MB 限制（当前 ${(audioFile.size / 1024 / 1024).toFixed(2)}MB）`);
    }

    if (audioFile.size > MAX_DIRECT_SIZE) {
      let presigned;
      try {
        presigned = await getPresignedUrl({
          filename: audioFile.name,
          contentType: audioFile.type || "audio/mpeg",
          prefix: "uploads/music"
        });
      } catch (e: any) {
        throw new Error(
          "获取直传链接失败，请检查 Vercel 环境变量是否配置了 R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME"
        );
      }

      let res;
      try {
        res = await fetch(presigned.url, {
          method: "PUT",
          body: audioFile,
          headers: { "Content-Type": audioFile.type || "audio/mpeg" }
        });
      } catch (e: any) {
        throw new Error(
          "直传 R2 失败，通常是 R2 bucket CORS 未开启 PUT 跨域，请在 Cloudflare R2 控制台配置 AllowedMethods 包含 PUT"
        );
      }

      if (!res.ok) {
        throw new Error(`音频文件直传失败，R2 返回状态码 ${res.status}`);
      }
      fd.append("file", presigned.url.replace(/\?.*$/, ""));
    } else if (audioFile) {
      fd.append("file", audioFile);
    }

    if (uploadForm.value.cover) fd.append("cover", uploadForm.value.cover);
    if (uploadForm.value.lrc) fd.append("lrc", uploadForm.value.lrc);

    await uploadMusic(fd);
    message("上传成功", { type: "success" });
    uploadVisible.value = false;
    onSearch();
  } catch (err: any) {
    const msg = err?.response?.data?.error || err?.message || "未知错误";
    message("上传失败: " + msg, { type: "error" });
  } finally {
    uploading.value = false;
  }
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="main-content">
    <div class="flex justify-between items-center mb-4">
      <div class="flex gap-3 items-center">
        <el-input
          v-model="searchQuery"
          placeholder="搜索歌名、歌手..."
          clearable
          class="!w-[240px]"
          @keyup.enter="onSearch"
        />
        <el-button type="primary" @click="onSearch">搜索</el-button>
      </div>
      <el-button type="primary" @click="openUpload">上传音乐</el-button>
    </div>

    <el-table
      :data="dataList"
      border
      stripe
      v-loading="loading"
      :header-cell-style="{
        background: 'var(--el-fill-color-light)',
        color: 'var(--el-text-color-primary)'
      }"
    >
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        v-bind="col"
      >
        <template v-if="col.slot === 'cover'" #default="{ row }">
          <el-image
            v-if="row.cover"
            :src="row.cover"
            class="w-10 h-10 rounded object-cover"
            fit="cover"
            preview-teleported
            :preview-src-list="[row.cover]"
          />
          <span v-else class="text-gray-400">-</span>
        </template>
        <template v-else-if="col.slot === 'lrc'" #default="{ row }">
          <el-tag v-if="row.lrc || row.lrcSrc" size="small" type="success" effect="plain">
            有
          </el-tag>
          <el-tag v-else size="small" type="info" effect="plain">无</el-tag>
        </template>
        <template v-else-if="col.slot === 'operation'" #default="{ row }">
          <el-button type="primary" size="small" link @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除该音乐？" @confirm="handleDelete(row)">
            <template #reference>
              <el-button type="danger" size="small" link>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- Edit Dialog -->
    <el-dialog
      v-model="editVisible"
      title="编辑音乐"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="歌名">
          <el-input v-model="editForm.title" placeholder="请输入歌名" />
        </el-form-item>
        <el-form-item label="歌手">
          <el-input v-model="editForm.artist" placeholder="请输入歌手" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="editForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="封面">
          <el-upload
            accept="image/*"
            :auto-upload="false"
            :limit="1"
            :on-change="handleEditCoverChange"
          >
            <el-button>更换封面</el-button>
            <template #tip>
              <div class="el-upload__tip">留空则保持现有封面</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="歌词">
          <el-upload
            accept=".lrc"
            :auto-upload="false"
            :limit="1"
            :on-change="handleEditLrcChange"
          >
            <el-button>更换歌词</el-button>
            <template #tip>
              <div class="el-upload__tip">留空则保持现有歌词</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpdate">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- Upload Dialog -->
    <el-dialog
      v-model="uploadVisible"
      title="上传音乐"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadRules"
        label-width="80px"
      >
        <el-form-item label="歌名" prop="title">
          <el-input v-model="uploadForm.title" placeholder="请输入歌名（留空自动从文件读取）" />
        </el-form-item>
        <el-form-item label="歌手" prop="artist">
          <el-input v-model="uploadForm.artist" placeholder="请输入歌手（留空自动从文件读取）" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="uploadForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="音频" prop="file">
          <el-upload
            accept=".mp3,.wav,.flac,.mp4,.m4a,.aac,.ogg,.oga"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
          >
            <el-button type="primary">选择音频文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 MP3 / WAV / FLAC / MP4 / M4A / AAC / OGG，最大 50MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="封面">
          <el-upload
            accept="image/*"
            :auto-upload="false"
            :limit="1"
            :on-change="handleCoverChange"
          >
            <el-button>选择封面</el-button>
            <template #tip>
              <div class="el-upload__tip">留空自动提取音频文件内嵌封面</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="歌词">
          <el-upload
            accept=".lrc"
            :auto-upload="false"
            :limit="1"
            :on-change="handleLrcChange"
          >
            <el-button>选择歌词文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 .lrc 格式，留空自动提取内嵌歌词</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
