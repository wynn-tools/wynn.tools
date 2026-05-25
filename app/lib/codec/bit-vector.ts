import { Base64 } from './base64'

/**
 * A class used to represent an arbitrary length bit vector. Very useful for encoding and decoding.
 *
 */
export class BitVector {
  bits: Uint32Array
  length: number
  tailIdx: number

  /**
   * Constructs an arbitrary-length bit vector.
   * @class
   * @param {string | number} data - The data to append.
   * @param {number} length - A set length for the data. Ignored if data is a string.
   *
   * The structure of the Uint32Array should be [[last, ..., first], ..., [last, ..., first], [empty space, last, ..., first]]
   */
  constructor(data: string | number, length: number) {
    const bitVec: number[] = []

    if (typeof data === 'string') {
      let int = 0
      let bvIdx = 0
      length = data.length * 6

      for (let i = 0; i < data.length; i++) {
        const char = Base64.toInt(data[i]!)
        const prePos = bvIdx % 32
        int |= char << bvIdx
        bvIdx += 6
        const postPos = bvIdx % 32
        if (postPos < prePos) { // we have to have filled up the integer
          bitVec.push(int)
          int = char >>> (6 - postPos)
        }

        if (i === data.length - 1 && postPos !== 0) {
          bitVec.push(int)
        }
      }
    }
    else if (typeof data === 'number') {
      if (typeof length === 'undefined') {
        if (length < 0) {
          throw new RangeError('BitVector must have nonnegative length.')
        }
      }

      // convert to int just in case
      data = Math.round(data)

      // range of numbers that won't fit in a uint32
      if (data > 2 ** 32 - 1 || data < -(2 ** 32 - 1)) {
        throw new RangeError('Numerical data has to fit within a 32-bit integer range to instantiate a BitVector.')
      }
      bitVec.push(data)
    }
    else {
      throw new TypeError('BitVector must be instantiated with a Number or a B64 String')
    }

    this.length = length // The length, in bits, of the bitvector
    // Index to the first uninitialized entry of the underlying ArrayBuffer, interpreted as a Uint32Array.
    // For simplicity, the first entry is always treated as initialized even if the vector length is 0.
    this.tailIdx = bitVec.length === 0 ? 1 : bitVec.length

    this.bits = new Uint32Array(this.tailIdx)
    this.bits.set(bitVec, 0)
  }

  /**
   * Return value of bit at index idx.
   *
   * @param {number} idx - The index to read
   *
   * @returns The bit value at position idx
   */
  readBit(idx: number): number {
    if (idx < 0 || idx >= this.length) {
      throw new RangeError(`Cannot read bit outside the range of the BitVector. (${idx} > ${this.length})`)
    }
    return ((this.bits[Math.floor(idx / 32)]! & (1 << idx)) === 0 ? 0 : 1)
  }

  /**
   * Returns an integer value (if possible) made from the range of bits [start, end). Undefined behavior if the range to read is too big.
   *
   * @param {number} start - The index to start slicing from. Inclusive.
   * @param {number} end - The index to end slicing at. Exclusive.
   *
   * @returns An integer representation of the sliced bits.
   */
  slice(start: number, end: number): number {
    // TO NOTE: JS shifting is ALWAYS in mod 32. a << b will do a << (b mod 32) implicitly.
    if (end < start) {
      throw new RangeError('Cannot slice a range where the end is before the start.')
    }
    else if (end === start) {
      return 0
    }
    else if (end - start > 32) {
      // requesting a slice of longer than 32 bits (safe integer "length")
      throw new RangeError('Cannot slice a range of longer than 32 bits (unsafe to store in an integer).')
    }

    let res = 0
    if (Math.floor((end - 1) / 32) === Math.floor(start / 32)) {
      // the range is within 1 uint32 section - do some relatively fast bit twiddling
      res = (this.bits[Math.floor(start / 32)]! & ~((((~0) << ((end - 1))) << 1) | ~((~0) << (start)))) >>> (start % 32)
    }
    else {
      // the number of bits in the uint32s
      const startPos = (start % 32)
      const intPos = Math.floor(start / 32)
      res = (this.bits[intPos]! & ((~0) << (start))) >>> (startPos)
      res |= (this.bits[intPos + 1]! & ~((~0) << (end))) << (32 - startPos)
    }

    return res

    // General code - slow
    // for (let i = start; i < end; i++) {
    //     res |= (get_bit(i) << (i - start));
    // }
  }

  // TODO:(@orgold): optimize this code
  sliceB64(start: number, end: number): string {
    if (end < start) {
      throw new RangeError('Cannot slice a range where the end is before the start.')
    }
    else if (end > this.length) {
      throw new RangeError('Cannot slice past the end of the vector.')
    }
    else if (end === start) {
      return '0'
    }
    let b64String = ''
    for (let i = start; i < end; i += 6) {
      b64String += Base64.fromIntN(this.slice(i, i + 6), 1)
    }
    return b64String
  }

  /**
   * Assign bit at index idx to 1.
   *
   * @param {number} idx - The index to set.
   */
  setBit(idx: number): void {
    if (idx < 0 || idx >= this.length) {
      throw new RangeError('Cannot set bit outside the range of the BitVector.')
    }
    this.bits[Math.floor(idx / 32)]! |= (1 << idx % 32)
  }

  /**
   * Assign bit at index idx to 0.
   *
   * @param {number} idx - The index to clear.
   */
  clearBit(idx: number): void {
    if (idx < 0 || idx >= this.length) {
      throw new RangeError('Cannot clear bit outside the range of the BitVector.')
    }
    this.bits[Math.floor(idx / 32)]! &= ~(1 << idx % 32)
  }

  /**
   * Creates a string version of the bit vector in B64. Does not keep the order of elements a sensible human readable format.
   *
   * @returns A b64 string representation of the BitVector.
   */
  toB64(): string {
    if (this.length === 0) {
      return ''
    }
    let b64String = ''
    let i = 0
    while (i < this.length) {
      b64String += Base64.fromIntN(this.slice(i, i + 6), 1)
      i += 6
    }

    return b64String
  }

  /**
   * Returns a BitVector in bitstring format. Probably only useful for dev debugging.
   *
   * @returns A bit string representation of the BitVector. Goes from higher-indexed bits to lower-indexed bits. (n ... 0)
   */
  toString(): string {
    let retStr = ''
    for (let i = 0; i < this.length; i++) {
      retStr = (this.readBit(i) === 0 ? '0' : '1') + retStr
    }
    return retStr
  }

  /**
   * Returns a BitVector in bitstring format. Probably only useful for dev debugging.
   *
   * @returns A bit string representation of the BitVector. Goes from lower-indexed bits to higher-indexed bits. (0 ... n)
   */
  toStringR(): string {
    let retStr = ''
    for (let i = 0; i < this.length; i++) {
      retStr += (this.readBit(i) === 0 ? '0' : '1')
    }
    return retStr
  }

  updateTailInt(v: number, vLen: number): void {
    const prePos = this.length % 32 // insertion pos
    const postPos = prePos + vLen // excess insertion pos

    this.bits[this.tailIdx - 1]! |= v << prePos // mask the tail with the bits of the new int that fit
    this.tailIdx += Number(postPos >= 32) // if we've exhausted the tail, increment it

    // if we've overflowed and there's excess bits, add them to the new tail
    this.bits[this.tailIdx - 1]! |= (v & ((postPos <= 32 ? 1 : 0) - 1)) >>> (32 - prePos)
    this.length += vLen
  }

  /**
   * Resizes the unerlying buffer if necessary.
   * @param {number} length - The number of bits being added to the vector.
   */
  checkResize(length: number): void {
    let resizeLen = this.bits.length
    const needed = (Math.floor(this.length + length) / 32) + 1
    if (needed >= resizeLen) {
      resizeLen = (resizeLen + needed) * 2
      const newBits = new Uint32Array(resizeLen * 2)
      newBits.set(this.bits, 0)
      this.bits = newBits
    }
  }

  /**
   * Appends data from a Base64 string to the vector.
   * @param {string} data - A Base64 string.
   */
  appendB64(data: string): void {
    if (typeof data !== 'string')
      throw new Error('`BitVector.appendB64` can only be used to append Base 64 strings. Try `BitVector.append`.')
    const length = data.length * 6
    this.checkResize(length)

    for (const c of data) {
      const v = Base64.toInt(c)
      this.updateTailInt(v, 6)
    }
  }

  /**
   * Appends data to the BitVector.
   *
   * @param {number | string} data - The data to append.
   * @param {number} length - The length, in bits, of the new data.
   */
  append(data: number, length: number): void {
    if (typeof data !== 'number')
      throw new Error('`BitVector.append` can only be used to append integers. Try `BitVector.appendB64`.')
    if (length < 0) {
      throw new RangeError('BitVector length must increase by a nonnegative number.')
    }
    this.checkResize(length)

    // convert to int just in case
    const int = data & 0xFFFFFFFF

    // range of numbers that "could" fit in a uint32 -> [0, 2^32) U [-2^31, 2^31)
    if (data > 2 ** 32 - 1 || data < -(2 ** 31)) {
      throw new RangeError('Numerical data has to fit within a 32-bit integer range to instantiate a BitVector.')
    }
    if (length !== 32 && (int & ((1 << (length)) - 1)) !== int) {
      throw new RangeError(`${int} doesn't fit in ${length} bits!`)
    }

    this.updateTailInt(int, length)
  }

  /**
   * Merge bit vectors together.
   * changes the vector in-place.
   *
   * @param {BitVector[]} bitVecs A list of BitVectors.
   */
  merge(bitVecs: BitVector[]): void {
    for (const bitVec of bitVecs) {
      let bitVecLen = bitVec.length
      for (let i = 0; i < bitVec.tailIdx; ++i) {
        if (i === bitVec.tailIdx - 1) {
          this.append(bitVec.bits[i]!, bitVecLen)
        }
        else {
          this.append(bitVec.bits[i]!, 32)
          bitVecLen -= 32
        }
      }
    }
  }
}

/**
 * Cursor for easy bit navigation of a bitvector.
 * Must be instantiated with a BitVector or it's subclass.
 *
 * @prop {BitVector} #bitVec - the underlying bit vector.
 * @prop {number} #currIdx - the current index pointed to by the cursor.
 * @prop {number} #endIdx - the last index the cursor is permitted to travel to.
 */
export class BitVectorCursor {
  #bitVec: BitVector | null
  #currIdx: number
  #endIdx: number

  /**
   * Construct a new Cursor from an existing bit vector.
   * @param {BitVector} bitvec - the underlying bit vector.
   * @param {number} [idx] - the index the cursor will point to upon construction.
   * @param {number} [span] - the number of bits the cursor is allowed to travel from idx.
   */
  constructor(bitvec: BitVector, idx: number = 0, span: number = (bitvec.length - idx)) {
    if (span < 0 || idx < 0) {
      throw new Error('Span and index must be positive.')
    }
    if (idx + span > bitvec.length) {
      throw new RangeError('idx and span must satisfy `idx + span <= bitvec.length`.')
    }
    this.#bitVec = bitvec
    this.#currIdx = idx
    this.#endIdx = idx + span
  }

  get bitVec(): BitVector | null {
    return this.#bitVec
  }

  get currIdx(): number {
    return this.#currIdx
  }

  get endIdx(): number {
    return this.#endIdx
  }

  /**
   * Create another cursor at the same index with a new span.
   */
  spawn(span: number, idx: number = this.#currIdx): BitVectorCursor {
    return new BitVectorCursor(this.#bitVec!, idx, span)
  }

  /**
   * Return whether the cursor reached the end of it's span.
   */
  end(): boolean {
    return this.#currIdx === this.#endIdx
  }

  /**
   * @returns the result of BitVector.readBit(idx) and advances the cursor to the next byte.
   */
  advance(): number {
    if (this.end()) {
      throw new Error('Cannot advance further - reached the end of the vector.')
    }
    const idx = this.#currIdx
    this.#currIdx += 1
    return this.#bitVec!.readBit(idx)
  }

  /**
   * @param {number} amount
   *
   * @returns the result of BitVector.slice(cursor.#currIdx, amount) and advances the cursor by `amount` bits.
   */
  advanceBy(amount: number): number {
    if (this.#currIdx + amount > this.#endIdx) {
      throw new Error(`Cannot advance ${this.#currIdx} by ${amount} bits - the cursor window ends at ${this.#endIdx}`)
    }
    else if (((this.#currIdx + amount - 1) % 32) + 1 > 32) {
      throw new Error(`Unsafe - result of advanceBy will not fit in a 32 bit integer.`)
    }
    const idx = this.#currIdx
    this.#currIdx += amount
    return this.#bitVec!.slice(idx, this.#currIdx)
  }

  /**
   * Advances the cursor by `amount` chars and returns the resulting Base64 string.
   * @param {number} amount - the amount of characters to advance by.
   */
  advanceByChars(amount: number): string {
    const idx = this.#currIdx
    this.#currIdx += amount * 6
    return this.bitVec!.sliceB64(idx, this.#currIdx)
  }

  /**
   * Advance the cursor `amount` bits without reading any of them.
   * @param {number} amount - the amount to advance by. Must be in the cursor's range.
   */
  skip(amount: number): void {
    if (this.#currIdx + amount > this.#endIdx)
      throw new Error('Can\'t skip more than the cursor\'s allowed span.')
    this.#currIdx += amount
  }

  /**
   * Consume the cursor until the end of the bitvector.
   * This method removes the reference to the vector, rendering
   * the cursor unusable.
   *
   * @returns {BitVector} - a BitVector with data corresponding to the remaining data in this cursor.
   */
  consume(): BitVector {
    let idx = this.#currIdx
    this.#currIdx = this.#endIdx
    let len = this.#endIdx - idx
    const vec = new BitVector(0, 0)
    while (len > 32) {
      vec.append(this.#bitVec!.slice(idx, idx + 32), 32)
      idx += 32
      len -= 32
    }
    vec.append(this.#bitVec!.slice(idx, idx + len), len)
    this.#bitVec = null
    return vec
  }
}
