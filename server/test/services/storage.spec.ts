import * as sinon from "sinon";
import { sandbox, stubAWSAPI } from "../helper";

import * as S3 from "aws-sdk/clients/s3";
import { promises as fs } from "fs";
import { Readable } from "stream";
import { Storage } from "../../src/services/storage";

describe(Storage.name, () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage("fake");
  });

  describe("#readAsStream", () => {
    let createReadStreamFake: sinon.SinonSpy;
    let getObjectStub: sinon.SinonStub;

    beforeEach(() => {
      const s3 = new S3();
      const s3Proto = Object.getPrototypeOf(s3);

      createReadStreamFake = sinon.fake.returns(Readable.from([1, 2,3]));

      getObjectStub = sandbox.stub(s3Proto, "getObject");
      getObjectStub.returns({ createReadStream: createReadStreamFake });
    });

    it("should return ReadableStream", () => {


      expect(storage.readAsStream("key")).toBeInstanceOf(Readable);

      expect(getObjectStub.callCount).toEqual(1);
      expect(getObjectStub.firstCall.args).toEqual([{
        Bucket: "fake",
        Key: "key",
      }]);

      expect(createReadStreamFake.callCount).toEqual(1);
    });
  });

  describe("#write", () => {
    let uploadFake: sinon.SinonSpy;

    beforeEach(() => {
      uploadFake = sinon.fake.resolves({});
      stubAWSAPI(S3, "upload", uploadFake);
    });

    it("should upload given body", async () => {
      const buf = Buffer.from("abc");

      const res = await storage.write({
        key: "key",
        body: buf,
      });

      expect(res).toEqual({
        bucket: "fake",
        key: "key",
        data: {},
      });

      expect(uploadFake.callCount).toEqual(1);
      expect(uploadFake.firstCall.args).toEqual([{
        Bucket: "fake",
        Key: "key",
        Body: buf,
      }]);
    });

    it("should set ACL if provided", async () => {
      await storage.write({
        key: "key",
        body: Buffer.from([1, 2, 3]),
        metadata: {
          acl: "public-read",
        },
      });

      expect(uploadFake.firstCall.args[0]).toMatchObject({
        ACL: "public-read",
      });
    });

    it("should set Expires if provided", async () => {
      const expiresAt = new Date(1594598400000);

      await storage.write({
        key: "key",
        body: Buffer.from([1, 2, 3]),
        metadata: {
          expiresAt,
        },
      });

      expect(uploadFake.firstCall.args[0]).toMatchObject({
        Expires: expiresAt,
      });
    });

    it("should set Content-Type if provided", async () => {
      const contentType = "text/plain; charset=utf-8";

      await storage.write({
        key: "key",
        body: Buffer.from([1, 2, 3]),
        metadata: {
          contentType,
        },
      });

      expect(uploadFake.firstCall.args[0]).toMatchObject({
        ContentType: contentType,
      });
    });

    it("should set Content-Type if detected", async () => {
      const fixture = await fs.readFile("fixtures/yeri.jpg");

      await storage.write({
        key: "key",
        body: fixture,
      });

      expect(uploadFake.firstCall.args[0]).toMatchObject({
        ContentType: "image/jpeg",
      });
    });

    it("should set CacheControl if provided", async () => {
      const contentType = "text/plain; charset=utf-8";

      await storage.write({
        key: "key",
        body: Buffer.from([1, 2, 3]),
        metadata: {
          cacheControl: "public, max-age=300",
        },
      });

      expect(uploadFake.firstCall.args[0]).toMatchObject({
        CacheControl: "public, max-age=300",
      });
    });
  });
});
