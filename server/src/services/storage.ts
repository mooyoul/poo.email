import * as S3 from "aws-sdk/clients/s3";
import * as BbPromise from "bluebird";
import * as fileType from "file-type";
import * as https from "https";
import { Readable as ReadableStream } from "stream";

export interface Metadata {
  contentType?: string;
  expiresAt?: Date;
  cacheControl?: string;
  acl?: S3.ObjectCannedACL;
}

export interface UploadResult {
  bucket: string;
  key: string;
  data?: S3.ManagedUpload.SendData;
}

export class Storage {
  private static httpsAgent = new https.Agent({ keepAlive: true });

  protected readonly s3: S3;

  public constructor(
    protected readonly bucketName: string,
  ) {
    this.s3 = new S3({
      httpOptions: {
        agent: Storage.httpsAgent,
      },
    });
    this.s3.config.setPromisesDependency(BbPromise);
  }

  public readAsStream(key: string) {
    return this.s3.getObject({
      Bucket: this.bucketName,
      Key: key,
    }).createReadStream();
  }

  public async write(params: {
    key: string;
    body: Buffer | ReadableStream;
    metadata?: Metadata;
  }): Promise<UploadResult> {
    const { key } = params;

    // if content type metadata is missing, guess content-type by matching "magic bytes"
    const contentType = params.metadata?.contentType ??
      (Buffer.isBuffer(params.body) ? (await fileType.fromBuffer(params.body))?.mime : undefined);

    const uploadResult = await this.s3.upload({
      Bucket: this.bucketName,
      Key: key,
      Body: params.body,
      ACL: params.metadata?.acl,
      Expires: params.metadata?.expiresAt,
      ContentType: contentType,
      CacheControl: params.metadata?.cacheControl,
    }).promise();

    return {
      bucket: this.bucketName,
      key,
      data: uploadResult,
    };
  }
}
