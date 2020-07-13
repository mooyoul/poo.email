const POO_EMAIL_EPOCH = 1593475200000; // 2020-06-30T00:00:00.000Z

export class EpochIdentifier {
  private readonly prefix: string;

  public constructor(prefix: string) {
    this.prefix = prefix;
  }

  public generate(timestamp: number = Date.now()) {
    const value = timestamp - POO_EMAIL_EPOCH;
    const zeroFilled = `00000000${value.toString(36)}`
      .toUpperCase()
      .slice(-8);

    return `${this.prefix}${zeroFilled}`;
  }

  public parse(id: string) {
    const value = parseInt(id.replace(this.prefix, ""), 36);

    return value + POO_EMAIL_EPOCH;
  }
}
