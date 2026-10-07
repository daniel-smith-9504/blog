import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_SITE_CONFIGS } from "../app/lib/default-site-config";

const prisma = new PrismaClient();

async function main() {
  // 创建 admin 用户（部署后请立即修改默认密码）
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { nickname: "Admin" },
    create: {
      username: "admin",
      hashed_password: adminPassword,
      nickname: "Admin",
      is_admin: true,
    },
  });

  // 创建默认站点配置（中性占位符，部署后请在后台修改为自己的信息）
  const siteConfigs = DEFAULT_SITE_CONFIGS;

  for (const cfg of siteConfigs) {
    await prisma.siteConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }

  console.log("Seed completed: admin user and default site configs created.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
