import { formatFileSize } from '../utils';

export interface UploadFile {
  file: File;
  width: number;
  height: number;
}

export interface InvalidUploadFile {
  uploadFile: UploadFile;
  error: string;
}

export interface UploadValidationResult {
  validFiles: UploadFile[];
  invalidFiles: InvalidUploadFile[];
}

export interface Attachment {
  uuid: string;
  content_type: string;
  url: string;
  filename: string;
  size: number;
  error: string;
}

export function validateDuplicateFiles(
  uploadFiles: UploadFile[],
  invalidFiles: InvalidUploadFile[],
  currentAttachments: Attachment[]
): UploadValidationResult {
  if (currentAttachments.length === 0) {
    return { validFiles: uploadFiles, invalidFiles: invalidFiles };
  } else {
    const validFiles: UploadFile[] = [];
    uploadFiles.map(uploadFile => {
      const index = currentAttachments.findIndex(
        value =>
          value.filename === uploadFile.file.name &&
          value.size === uploadFile.file.size
      );
      if (index === -1) {
        validFiles.push(uploadFile);
      } else {
        invalidFiles.push({ uploadFile: uploadFile, error: 'Duplicate file.' });
      }
    });
    return { validFiles: validFiles, invalidFiles: invalidFiles };
  }
}

export function validateMaxAttachments(
  uploadFiles: UploadFile[],
  invalidFiles: InvalidUploadFile[],
  currentAttachments: Attachment[],
  maxAttachments: number
): UploadValidationResult {
  let totalAttachments = currentAttachments.length + uploadFiles.length;
  if (totalAttachments <= maxAttachments) {
    return { validFiles: uploadFiles, invalidFiles: invalidFiles };
  } else {
    const validFiles: UploadFile[] = [];
    uploadFiles.map(uploadFile => {
      totalAttachments = currentAttachments.length + validFiles.length;
      if (totalAttachments < maxAttachments) {
        validFiles.push(uploadFile);
      } else {
        invalidFiles.push({
          uploadFile: uploadFile,
          error: `Maximum allowed attachments is ${maxAttachments} files.`,
        });
      }
    });
    return { validFiles: validFiles, invalidFiles: invalidFiles };
  }
}

export function validateMaxFileSize(
  uploadFiles: UploadFile[],
  invalidFiles: InvalidUploadFile[],
  maxFileSize: number
): UploadValidationResult {
  const validFiles: UploadFile[] = [];
  uploadFiles.map(uploadFile => {
    if (uploadFile.file.size <= maxFileSize) {
      validFiles.push(uploadFile);
    } else {
      invalidFiles.push({
        uploadFile: uploadFile,
        error: `Limit for file uploads is ${formatFileSize(maxFileSize, 0)}.`,
      });
    }
  });
  return { validFiles: validFiles, invalidFiles: invalidFiles };
}

export function validateFileDimensions(
  uploadFiles: UploadFile[],
  invalidFiles: InvalidUploadFile[],
  maxFileDimension: number
): UploadValidationResult {
  const validFiles: UploadFile[] = [];
  uploadFiles.map(uploadFile => {
    if (
      uploadFile.width === maxFileDimension &&
      uploadFile.height === maxFileDimension
    ) {
      validFiles.push(uploadFile);
    } else {
      invalidFiles.push({
        uploadFile: uploadFile,
        error: `Dimensions of file uploads must be ${maxFileDimension}px by ${maxFileDimension}px.`,
      });
    }
  });
  return { validFiles: validFiles, invalidFiles: invalidFiles };
}

export function getFileDimensions({
  file,
}: {
  file: File;
}): Promise<UploadFile> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = function (e: ProgressEvent<FileReader>) {
      const image = new Image();
      image.onload = function () {
        const uploadFile: UploadFile = {
          file: file,
          width: image.width,
          height: image.height,
        };
        resolve(uploadFile);
      };
      image.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
