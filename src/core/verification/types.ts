export type VerificationStatus = 'FILE_EXISTS' | 'FILE_MATCHES' | 'CONFIG_PARSES' | 'RESOURCE_DISCOVERED' | 'FAILED';

export type FileVerification = {
  path: string;
  status: VerificationStatus;
  expectedHash?: string;
  actualHash?: string;
  message: string;
};

export type ResourceVerification = {
  resourceId: string;
  type: string;
  name: string;
  status: VerificationStatus;
  message: string;
};

export type VerificationReport = {
  migrationId: string;
  verifiedAt: string;
  success: boolean;
  files: FileVerification[];
  resources: ResourceVerification[];
  warnings: string[];
};
