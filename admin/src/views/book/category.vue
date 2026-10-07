<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import {
  getBookCategories,
  createBookCategory,
  updateBookCategory,
  deleteBookCategory,
  type BookCategoryItem
} from "@/api/book";

defineOptions({ name: "BookCategory" });

const loading = ref(false);
const dataList = ref<BookCategoryItem[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref("新增分类");
const formRef = ref();
const form = ref({
  id: 0,
  name: "",
  slug: "",
  description: "",
  sort: 0
});

const rules = {
  name: [{ required: true, message: "请输入分类名称", trigger: "blur" }]
};

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 70 },
  { label: "分类名称", prop: "name", minWidth: 150 },
  { label: "Slug", prop: "slug", minWidth: 150 },
  { label: "描述", prop: "description", minWidth: 200 },
  { label: "图书数量", prop: "_count.books", width: 100 },
  { label: "排序", prop: "sort", width: 80 },
  { label: "操作", fixed: "right", width: 200, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const res = await getBookCategories();
    dataList.value = res.categories;
  } finally {
    loading.value = false;
  }
}

function openDialog(title: string, row?: BookCategoryItem) {
  dialogTitle.value = title;
  if (row) {
    form.value = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sort: row.sort
    };
  } else {
    form.value = { id: 0, name: "", slug: "", description: "", sort: 0 };
  }
  dialogVisible.value = true;
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    if (form.value.id) {
      await updateBookCategory(form.value.id, {
        name: form.value.name,
        slug: form.value.slug || undefined,
        description: form.value.description,
        sort: form.value.sort
      });
      message("更新成功", { type: "success" });
    } else {
      await createBookCategory({
        name: form.value.name,
        slug: form.value.slug || undefined,
        description: form.value.description,
        sort: form.value.sort
      });
      message("创建成功", { type: "success" });
    }
    dialogVisible.value = false;
    onSearch();
  } catch {
    message("操作失败", { type: "error" });
  }
}

async function handleDelete(row: BookCategoryItem) {
  try {
    await deleteBookCategory(row.id);
    message("删除成功", { type: "success" });
    onSearch();
  } catch {
    message("删除失败", { type: "error" });
  }
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="main-content">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">图书分类管理</h3>
      <el-button type="primary" @click="openDialog('新增分类')">
        新增分类
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
        <template v-if="col.slot === 'operation'" #default="{ row }">
          <el-button
            type="primary"
            size="small"
            link
            @click="openDialog('编辑分类', row)"
          >
            编辑
          </el-button>
          <el-popconfirm
            title="确认删除该分类？"
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="Slug" prop="slug">
          <el-input
            v-model="form.slug"
            placeholder="URL 别名（留空自动生成）"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="分类描述"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>