import type { NextRequest } from 'next/server';

import { getToken } from '@/lib/getToken';

export async function resolveToken(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const trimmed = authHeader.trim();
    if (trimmed.startsWith('Bearer ')) {
      const token = trimmed.slice('Bearer '.length).trim();
      if (token) {
        return token;
      }
    }
  }

  return await getToken();
}
