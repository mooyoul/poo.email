import * as stream from "stream";

export class MeasureStream extends stream.Transform {
  public size: number = 0;

  public _transform(data: Buffer, encoding: any, callback: stream.TransformCallback) {
    this.size += Buffer.byteLength(data);

    const buf = Buffer.isBuffer(data)
      ? data
      : Buffer.from(data, encoding);

    // Pass-through chunk as is
    callback(null, buf);
  }
}
