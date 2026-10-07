<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import {
  getBooks,
  deleteBook,
  uploadBook,
  getBookCategories,
  type BookItem,
  type BookCategoryItem
} from "@/api/book";
import { getPresignedUrl } from "@/api/upload";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "BookIndex" });

const loading = ref(false);
const dataList = ref<BookItem[]>([]);
const categories = ref<BookCategoryItem[]>([]);
const uploadVisible = ref(false);
const uploading = ref(false);
const searchQuery = ref("");
const activeCategory = ref<number | null>(null);

const uploadForm = ref({
  title: "",
  author: "",
  description: "",
  category_id: null as number | null,
  file: null as File | null,
  cover: null as File | null
});
const uploadFormRef = ref();

const uploadRules = {
  file: [{ required: true, message: "请选择图书文件", trigger: "change" }]
};

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 60 },
  {
    label: "封面",
    prop: "cover",
    width: 80,
    slot: "cover"
  },
  { label: "书名", prop: "title", minWidth: 150 },
  { label: "作者", prop: "author", minWidth: 120 },
  {
    label: "格式",
    prop: "format",
    width: 80,
    slot: "format"
  },
  {
    label: "分类",
    prop: "category",
    width: 100,
    slot: "category"
  },
  {
    label: "大小",
    prop: "file_size",
    width: 100,
    formatter: ({ file_size }) => {
      if (!file_size) return "-";
      if (file_size < 1024) return `${file_size} B`;
      if (file_size < 1024 * 1024) return `${(file_size / 1024).toFixed(1)} KB`;
      return `${(file_size / (1024 * 1024)).toFixed(1)} MB`;
    }
  },
  { label: "阅读", prop: "views", width: 80 },
  {
    label: "上传时间",
    prop: "created_at",
    minWidth: 170,
    formatter: ({ created_at }) =>
      created_at?.replace("T", " ").slice(0, 19) ?? ""
  },
  { label: "操作", fixed: "right", width: 150, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const params: any = { page_size: 100 };
    if (searchQuery.value) params.q = searchQuery.value;
    if (activeCategory.value) params.category_id = activeCategory.value;
    const res = await getBooks(params);
    dataList.value = res.books;
    categories.value = res.categories;
  } catch {
    message("获取图书列表失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function handleDelete(row: BookItem) {
  try {
    await deleteBook(row.id);
    message("删除成功", { type: "success" });
    onSearch();
  } catch {
    message("删除失败", { type: "error" });
  }
}

function openUpload() {
  uploadForm.value = {
    title: "",
    author: "",
    description: "",
    category_id: null,
    file: null,
    cover: null
  };
  uploadVisible.value = true;
}

function handleFileChange(file: any) {
  uploadForm.value.file = file.raw;
}

function handleCoverChange(file: any) {
  uploadForm.value.cover = file.raw;
}

async function handleUpload() {
  if (!uploadForm.value.file) {
    message("请选择图书文件", { type: "warning" });
    return;
  }
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append("title", uploadForm.value.title);
    fd.append("author", uploadForm.value.author);
    fd.append("description", uploadForm.value.description);
    if (uploadForm.value.category_id)
      fd.append("category_id", String(uploadForm.value.category_id));

    // 大文件（>5MB）直传 R2，绕过 Netlify 6MB 限制
    const bookFile = uploadForm.value.file;
    if (bookFile && bookFile.size > 5 * 1024 * 1024) {
      const presigned = await getPresignedUrl({
        filename: bookFile.name,
        contentType: bookFile.type || "application/epub+zip",
        prefix: "uploads/books"
      });
      const res = await fetch(presigned.url, {
        method: "PUT",
        body: bookFile,
        headers: { "Content-Type": bookFile.type || "application/epub+zip" }
      });
      if (!res.ok) throw new Error("图书文件直传失败");
      fd.append("file", presigned.url.replace(/\?.*$/, ""));
    } else if (bookFile) {
      fd.append("file", bookFile);
    }

    if (uploadForm.value.cover) fd.append("cover", uploadForm.value.cover);

    await uploadBook(fd);
    message("上传成功", { type: "success" });
    uploadVisible.value = false;
    onSearch();
  } catch (err: any) {
    message("上传失败: " + (err?.response?.data?.error || err?.message || ""), { type: "error" });
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
          placeholder="搜索书名、作者..."
          clearable
          class="!w-[240px]"
          @keyup.enter="onSearch"
        />
        <el-select
          v-model="activeCategory"
          placeholder="分类筛选"
          clearable
          class="!w-[160px]"
          @change="onSearch"
        >
          <el-option label="全部分类" :value="null" />
          <el-option
            v-for="cat in categories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
        <el-button type="primary" @click="onSearch">
          搜索
        </el-button>
      </div>
      <el-button type="primary" @click="openUpload">
        上传图书
      </el-button>
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
            class="w-10 h-14 rounded object-cover"
            fit="cover"
            preview-teleported
            :preview-src-list="[row.cover]"
          />
          <span v-else class="text-gray-400">-</span>
        </template>
        <template v-else-if="col.slot === 'format'" #default="{ row }">
          <el-tag size="small" type="primary" effect="plain">
            {{ row.format.toUpperCase() }}
          </el-tag>
        </template>
        <template v-else-if="col.slot === 'category'" #default="{ row }">
          <span v-if="row.category">{{ row.category.name }}</span>
          <span v-else class="text-gray-400">-</span>
        </template>
        <template v-else-if="col.slot === 'operation'" #default="{ row }">
          <el-popconfirm
            title="确认删除该图书？"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button type="danger" size="small" link>
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- Upload Dialog -->
    <el-dialog
      v-model="uploadVisible"
      title="上传图书"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadRules"
        label-width="80px"
      >
        <el-form-item label="书名" prop="title">
          <el-input v-model="uploadForm.title" placeholder="请输入书名" />
        </el-form-item>
        <el-form-item label="作者" prop="author">
          <el-input v-model="uploadForm.author" placeholder="请输入作者" />
        </el-form-item>
        <el-form-item label="分类" prop="category_id">
          <el-select
            v-model="uploadForm.category_id"
            placeholder="选择分类"
            clearable
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入图书简介"
          />
        </el-form-item>
        <el-form-item label="封面" prop="cover">
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept="image/*"
            :on-change="handleCoverChange"
            :file-list="[]"
          >
            <el-button type="primary" plain>选择封面图片</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="文件" prop="file">
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept=".epub,.pdf,.txt,.mobi"
            :on-change="handleFileChange"
            :file-list="[]"
          >
            <el-button type="primary">选择图书文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持 EPUB、PDF、TXT、MOBI 格式，最大 50MB
              </div>
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