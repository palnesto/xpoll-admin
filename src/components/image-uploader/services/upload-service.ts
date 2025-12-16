import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface UploadService {
  uploadFile: (
    file: File,
    options?: Record<string, any>
  ) => Promise<UploadResponse>;
}

export interface UploadResponse {
  url: string; // URL of the uploaded file
  id: string; // Unique ID of the file
  metadata?: any; // Optional metadata
}

export class DigitalOceanService implements UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private cdnEndpoint: string;
  private defaultFolderName: string;

  constructor(
    spaceName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    cdnEndpoint: string,
    defaultFolderName: string = import.meta.env
      .VITE_DO_SPACES_DEFAULT_FOLDER! || "defaults" // Optional default folder name
  ) {
    this.bucketName = spaceName;
    this.cdnEndpoint = cdnEndpoint;
    this.defaultFolderName = defaultFolderName;

    this.s3Client = new S3Client({
      region,
      endpoint: `https://${region}.digitaloceanspaces.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(
    file: File,
    options: Record<string, any> = {}
  ): Promise<UploadResponse> {
    const folderName = options.folderName || this.defaultFolderName; // Use provided folderName or default
    const fileKey = `${folderName}/${
      options.fileKey || `${Date.now()}-${file.name}`
    }`; // Prepend folder name

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey, // Include folder name in the key
        Body: file,
        ACL: "public-read",
        ContentType: file.type,
      });

      await this.s3Client.send(command);

      return {
        url: `${this.cdnEndpoint}/${fileKey}`, // Use the CDN endpoint for faster access
        id: fileKey,
      };
    } catch (error) {
      throw new Error(`DigitalOcean upload failed: ${error.message}`);
    }
  }
}
