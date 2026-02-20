export interface BackupMetadata {
  version: string;
  createdAt: string; // ISO date
  checksums?: {
    'database/users.json'?: string;
    'database/posts.json'?: string;
    'database/media.json'?: string;
    'database/albums.json'?: string;
    'database/apiintegrations.json'?: string;
    'database/oauthproviders.json'?: string;
  };
  counts?: {
    users: number;
    posts: number;
    media: number;
    albums: number;
    apiintegrations: number;
    oauthproviders: number;
  };
}

export interface ValidateBackupResult {
  valid: boolean;
  metadata?: BackupMetadata;
  warnings: string[];
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restored: {
    users: number;
    posts: number;
    media: number;
    albums: number;
    apiintegrations: number;
    oauthproviders: number;
    filesCount: number;
  };
  preRestoreBackupPath?: string;
  error?: string;
}
