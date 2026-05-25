import { BitVector } from './bit-vector'

/** Bitcode map: field name -> { BITLEN, ...flagName: value }. */
export type BitcodeMap = Record<string, Record<string, number>>

export class EncodingBitVector extends BitVector {
  bitcodeMap: BitcodeMap

  constructor(data: number | string, length: number, bitcodeMap: BitcodeMap) {
    super(data, length)
    this.bitcodeMap = bitcodeMap
  }

  appendFlag(field: string, flag: string): void {
    this.append(this.bitcodeMap[field]![flag]!, this.bitcodeMap[field]!.BITLEN!)
  }
}
