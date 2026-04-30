import { getBackendApiUrl } from './env';

export interface Book {
  _id: string;
  title: string;
  author: string;
  cover?: string;
  readAt?: string;
  rating?: number;
  postSlug?: string;
  createdAt: string;
  updatedAt: string;
}

function getBooksUrl(): string {
  return `${getBackendApiUrl().replace(/\/$/, '')}/books`;
}

export async function fetchBooks(): Promise<Book[]> {
  try {
    const res = await fetch(getBooksUrl());
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchBook(id: string): Promise<Book | null> {
  try {
    const res = await fetch(`${getBooksUrl()}/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
