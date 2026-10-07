-- CreateTable
CREATE TABLE "user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "post_count" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "cover" TEXT NOT NULL DEFAULT '',
    "category_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "reading_time" INTEGER NOT NULL DEFAULT 0,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostTag" (
    "post_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    PRIMARY KEY ("post_id", "tag_id"),
    CONSTRAINT "PostTag_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GitHubUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "github_id" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "post_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "github_user_id" INTEGER,
    "email_user_name" TEXT NOT NULL DEFAULT '',
    "email_user_avatar" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_github_user_id_fkey" FOREIGN KEY ("github_user_id") REFERENCES "GitHubUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "github_user_id" INTEGER,
    "parent_id" INTEGER,
    "content" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "email_user_name" TEXT NOT NULL DEFAULT '',
    "email_user_avatar" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_github_user_id_fkey" FOREIGN KEY ("github_user_id") REFERENCES "GitHubUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chatter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "images" TEXT NOT NULL DEFAULT '[]',
    "mood" TEXT NOT NULL DEFAULT '',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChatterComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chatter_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "github_user_id" INTEGER,
    "email_user_name" TEXT NOT NULL DEFAULT '',
    "email_user_avatar" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatterComment_chatter_id_fkey" FOREIGN KEY ("chatter_id") REFERENCES "Chatter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatterComment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ChatterComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatterComment_github_user_id_fkey" FOREIGN KEY ("github_user_id") REFERENCES "GitHubUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Album" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cover" TEXT NOT NULL DEFAULT '',
    "photo_count" INTEGER NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "album_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "orientation" TEXT NOT NULL DEFAULT 'landscape',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "long_description" TEXT NOT NULL DEFAULT '',
    "cover_image" TEXT NOT NULL DEFAULT '',
    "tech_stack" TEXT NOT NULL DEFAULT '[]',
    "link_github" TEXT NOT NULL DEFAULT '',
    "link_gitee" TEXT NOT NULL DEFAULT '',
    "link_live" TEXT NOT NULL DEFAULT '',
    "link_docs" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'developing',
    "status_label" TEXT NOT NULL DEFAULT '',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FriendLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BookmarkCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BookmarkSite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookmarkSite_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "BookmarkCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Music" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL DEFAULT '',
    "cover" TEXT NOT NULL DEFAULT '',
    "src" TEXT NOT NULL,
    "lrc" TEXT NOT NULL DEFAULT '',
    "lrcSrc" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'local',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ip" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '',
    "user_agent" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "org" TEXT NOT NULL DEFAULT '',
    "asn" TEXT NOT NULL DEFAULT '',
    "is_mobile" BOOLEAN NOT NULL DEFAULT false,
    "is_proxy" BOOLEAN NOT NULL DEFAULT false,
    "is_hosting" BOOLEAN NOT NULL DEFAULT false,
    "browser" TEXT NOT NULL DEFAULT '',
    "os" TEXT NOT NULL DEFAULT '',
    "device_type" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "login_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL DEFAULT 0,
    "username" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "system" TEXT NOT NULL DEFAULT '',
    "browser" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "operating_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "book_category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "book" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "cover" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "file_url" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'epub',
    "file_size" INTEGER NOT NULL DEFAULT 0,
    "category_id" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "chapter_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "book_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "book_category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_chapter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "book_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "book_chapter_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reading_progress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "book_id" INTEGER NOT NULL,
    "chapter_id" INTEGER,
    "chapter_title" TEXT NOT NULL DEFAULT '',
    "position" REAL NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reading_progress_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "book_id" INTEGER NOT NULL,
    "chapter_id" INTEGER,
    "text" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#facc15',
    "cfi" TEXT NOT NULL DEFAULT '',
    "chapter_title" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "book_note_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_verification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_slug_idx" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "Post_category_id_idx" ON "Post"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubUser_github_id_key" ON "GitHubUser"("github_id");

-- CreateIndex
CREATE INDEX "Comment_post_id_idx" ON "Comment"("post_id");

-- CreateIndex
CREATE INDEX "Comment_status_idx" ON "Comment"("status");

-- CreateIndex
CREATE INDEX "Comment_github_user_id_idx" ON "Comment"("github_user_id");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE INDEX "Message_parent_id_idx" ON "Message"("parent_id");

-- CreateIndex
CREATE INDEX "Message_github_user_id_idx" ON "Message"("github_user_id");

-- CreateIndex
CREATE INDEX "Chatter_status_idx" ON "Chatter"("status");

-- CreateIndex
CREATE INDEX "ChatterComment_chatter_id_idx" ON "ChatterComment"("chatter_id");

-- CreateIndex
CREATE INDEX "ChatterComment_status_idx" ON "ChatterComment"("status");

-- CreateIndex
CREATE INDEX "ChatterComment_github_user_id_idx" ON "ChatterComment"("github_user_id");

-- CreateIndex
CREATE INDEX "Photo_album_id_idx" ON "Photo"("album_id");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "BookmarkSite_category_id_idx" ON "BookmarkSite"("category_id");

-- CreateIndex
CREATE INDEX "Music_type_idx" ON "Music"("type");

-- CreateIndex
CREATE INDEX "Music_sort_idx" ON "Music"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "SiteConfig_key_key" ON "SiteConfig"("key");

-- CreateIndex
CREATE INDEX "Visitor_ip_idx" ON "Visitor"("ip");

-- CreateIndex
CREATE INDEX "Visitor_created_at_idx" ON "Visitor"("created_at");

-- CreateIndex
CREATE INDEX "login_log_user_id_idx" ON "login_log"("user_id");

-- CreateIndex
CREATE INDEX "login_log_operating_time_idx" ON "login_log"("operating_time");

-- CreateIndex
CREATE UNIQUE INDEX "book_category_name_key" ON "book_category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "book_category_slug_key" ON "book_category"("slug");

-- CreateIndex
CREATE INDEX "book_category_id_idx" ON "book"("category_id");

-- CreateIndex
CREATE INDEX "book_format_idx" ON "book"("format");

-- CreateIndex
CREATE INDEX "book_chapter_book_id_idx" ON "book_chapter"("book_id");

-- CreateIndex
CREATE INDEX "book_chapter_order_idx" ON "book_chapter"("order");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_book_id_key" ON "reading_progress"("book_id");

-- CreateIndex
CREATE INDEX "book_note_book_id_idx" ON "book_note"("book_id");

-- CreateIndex
CREATE INDEX "email_verification_email_idx" ON "email_verification"("email");

-- CreateIndex
CREATE INDEX "email_verification_code_idx" ON "email_verification"("code");
