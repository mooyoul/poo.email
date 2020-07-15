import * as BbPromise from "bluebird";
import { createReadStream } from "fs";
import { pipeline, Readable } from "stream";

import { MeasureStream } from "../../src/services/measure-stream";

describe(MeasureStream.name, () => {
  it("should measure size of given stream", async () => {
    const measureTinyReadable = new MeasureStream();
    measureTinyReadable.resume();
    await BbPromise.fromCallback((cb) =>
      pipeline(
        Readable.from([
          Buffer.from([1]),
          Buffer.from([2]),
          Buffer.from([3]),
        ]),
        measureTinyReadable,
        cb,
      ),
    );
    expect(measureTinyReadable.size).toEqual(3);

    const measureTinyString = new MeasureStream();
    measureTinyString.resume();
    await BbPromise.fromCallback((cb) => {
      measureTinyString.end("hello", () => {
        cb(null);
      });
    });

    expect(measureTinyString.size).toEqual(5);

    const measureLargeFile = new MeasureStream();
    measureLargeFile.resume();
    await BbPromise.fromCallback((cb) =>
      pipeline(
        createReadStream("fixtures/yeri.jpg"),
        measureLargeFile,
        cb,
      ),
    );
    expect(measureLargeFile.size).toEqual(199906);
  });
});
