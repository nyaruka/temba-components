import { formatFileSize } from '../utils';

export enum ImageType {
  Image = 'image',
  Avatar = 'avatar',
  Logo = 'logo',
}

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

export function validateImageDimensions(
  uploadFiles: UploadFile[],
  invalidFiles: InvalidUploadFile[],
  imageWidth: number,
  imageHeight: number,
  imageType = 'image'
): UploadValidationResult {
  const validFiles: UploadFile[] = [];
  uploadFiles.map(uploadFile => {
    if (
      imageType === ImageType.Avatar &&
      uploadFile.width === imageWidth &&
      uploadFile.width === uploadFile.height
    ) {
      validFiles.push(uploadFile);
    } else if (
      imageType === ImageType.Logo &&
      uploadFile.width === imageWidth &&
      uploadFile.height === imageHeight
    ) {
      validFiles.push(uploadFile);
    } else if (imageType === ImageType.Image) {
      validFiles.push(uploadFile);
    } else {
      const error =
        imageWidth === imageHeight
          ? `File uploads must have a width and height of ${imageWidth}px.`
          : `File uploads must have a width of ${imageWidth}px and a height of ${imageHeight}px.`;
      invalidFiles.push({
        uploadFile: uploadFile,
        error: error,
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
