/**
 * 简单的内存登录失败限制器
 * 注意：生产环境建议使用 Redis 或数据库实现持久化
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 分钟
const WINDOW_MS = 15 * 60 * 1000; // 15 分钟窗口

// 每 30 分钟清理一次过期记录
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (now > record.lockedUntil && now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 30 * 60 * 1000);

export function getLoginAttempts(identifier: string) {
  const record = attempts.get(identifier);
  if (!record) return { count: 0, locked: false, remainingTime: 0 };

  const now = Date.now();
  if (now < record.lockedUntil) {
    return {
      count: record.count,
      locked: true,
      remainingTime: Math.ceil((record.lockedUntil - now) / 1000)
    };
  }

  // 窗口过期则重置
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(identifier);
    return { count: 0, locked: false, remainingTime: 0 };
  }

  return {
    count: record.count,
    locked: false,
    remainingTime: 0
  };
}

export function recordLoginFailure(identifier: string) {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(identifier, {
      count: 1,
      firstAttempt: now,
      lockedUntil: 0
    });
    return { locked: false, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  record.count++;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_DURATION_MS;
    return { locked: true, remainingTime: LOCK_DURATION_MS / 1000 };
  }

  return {
    locked: false,
    remainingAttempts: MAX_ATTEMPTS - record.count
  };
}

export function clearLoginAttempts(identifier: string) {
  attempts.delete(identifier);
}
