import bcrypt from 'bcryptjs';
import { findUserByUsername, createUser, updateLastLogin } from './db.js';

export interface AuthUser {
  id: number;
  role: 'company' | 'shareholder';
  username: string;
  fullName: string;
  companyId: string | null;
}

export async function login(username: string, password: string): Promise<{ success: false; error: string } | { success: true; user: AuthUser }> {
  const user = findUserByUsername(username);
  if (!user) return { success: false, error: 'Invalid username or password' };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { success: false, error: 'Invalid username or password' };

  updateLastLogin(user.id);

  return {
    success: true,
    user: {
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.full_name,
      companyId: user.company_id || null,
    },
  };
}

export async function register(
  role: 'company' | 'shareholder',
  username: string,
  fullName: string,
  password: string,
  companyId?: string,
): Promise<{ success: false; error: string } | { success: true; user: AuthUser }> {
  if (!username || !password || !fullName) {
    return { success: false, error: 'All fields are required' };
  }
  if (username.length < 3) return { success: false, error: 'Username must be at least 3 characters' };
  if (password.length < 4) return { success: false, error: 'Password must be at least 4 characters' };

  const existing = findUserByUsername(username);
  if (existing) return { success: false, error: 'Username already taken' };

  const hash = await bcrypt.hash(password, 10);
  createUser(role, username, fullName, hash, companyId);

  const user = findUserByUsername(username);
  return {
    success: true,
    user: {
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.full_name,
      companyId: user.company_id || null,
    },
  };
}

export async function seedUserPasswords() {
  const { getDb } = await import('./db.js');
  const db = getDb();
  const users = db.prepare('SELECT id, username FROM users WHERE password = ?').all('$2a$10$placeholder') as any[];
  if (users.length === 0) return;

  const passwords: Record<string, string> = {
    acme: 'acme2026', globex: 'globex2026',
    alice: 'alice2026', bob: 'bob2026', charlie: 'charlie2026',
    diana: 'diana2026', eve: 'eve2026',
  };

  const updateStmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
  for (const u of users) {
    const pwd = passwords[u.username] || `${u.username}2026`;
    const hash = await bcrypt.hash(pwd, 10);
    updateStmt.run(hash, u.id);
  }
}
