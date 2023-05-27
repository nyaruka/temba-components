import { formatFileSize } from '../utils';
import {
  Attachment,
  UploadValidationResult,
  InvalidFile,
} from './AttachmentsUploader';

export function validateDuplicateFiles(
  files: File[],
  invalidFiles: InvalidFile[],
  currentAttachments: Attachment[]
): UploadValidationResult {
  console.log('validateDuplicateFiles');
  console.log('currentAttachments', currentAttachments.length);
  if (currentAttachments.length === 0) {
    return { validFiles: files, invalidFiles: invalidFiles };
  } else {
    const validFiles: File[] = [];
    files.map(file => {
      const index = currentAttachments.findIndex(
        value => value.filename === file.name && value.size === file.size
      );
      if (index === -1) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file: file, error: 'Duplicate file.' });
      }
    });
    return { validFiles: validFiles, invalidFiles: invalidFiles };
  }
}

export function validateMaxAttachments(
  files: File[],
  invalidFiles: InvalidFile[],
  currentAttachments: Attachment[],
  maxAttachments: number
): UploadValidationResult {
  console.log('validateMaxAttachments');
  console.log('maxAttachments', maxAttachments);
  let totalAttachments = currentAttachments.length + files.length;
  if (totalAttachments <= maxAttachments) {
    return { validFiles: files, invalidFiles: invalidFiles };
  } else {
    const validFiles: File[] = [];
    files.map(file => {
      totalAttachments = currentAttachments.length + validFiles.length;
      if (totalAttachments < maxAttachments) {
        validFiles.push(file);
      } else {
        invalidFiles.push({
          file: file,
          error: `Maximum allowed attachments is ${maxAttachments} files.`,
        });
      }
    });
    return { validFiles: validFiles, invalidFiles: invalidFiles };
  }
}

export function validateMaxFileSize(
  files: File[],
  invalidFiles: InvalidFile[],
  maxFileSize: number
): UploadValidationResult {
  console.log('validateMaxFileSize');
  console.log('maxFileSize', maxFileSize);
  const validFiles: File[] = [];
  files.map(file => {
    if (file.size <= maxFileSize) {
      validFiles.push(file);
    } else {
      console.log('maxFileSize', maxFileSize);
      invalidFiles.push({
        file: file,
        error: `Limit for file uploads is ${formatFileSize(maxFileSize, 0)}.`,
      });
    }
  });
  return { validFiles: validFiles, invalidFiles: invalidFiles };
}

export function validateFileDimensions(files: File[]): UploadValidationResult {
  const validFiles: File[] = [];
  const invalidFiles: InvalidFile[] = [];
  files.map(file => {
    const reader = new FileReader();
    reader.onload = function (e: ProgressEvent<FileReader>) {
      const image = new Image();
      image.onload = function () {
        if (image.width === image.height) {
          validFiles.push(file);
        } else {
          invalidFiles.push({
            file: file,
            error: 'Dimensions of file uploads must be equal.',
          });
        }
      };
      image.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
  return { validFiles: validFiles, invalidFiles: invalidFiles };
}
