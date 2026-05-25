const DIGITS_STR = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-'
const DIGITS = DIGITS_STR.split('')
const DIGITS_MAP: Record<string, number> = Object.fromEntries(DIGITS.map((x, i) => [x, i]))

export const Base64 = {
  /** Encode a number as base64, minimal width. */
  fromIntV(int32: number): string {
    let result = ''
    for (;;) {
      result = DIGITS[int32 & 0x3F] + result
      int32 >>>= 6
      if (int32 === 0)
        break
    }
    return result
  },

  /** Decode a base64 string to an unsigned integer. */
  toInt(digitsStr: string): number {
    let result = 0
    for (const ch of digitsStr)
      result = (result << 6) + DIGITS_MAP[ch]!
    return result
  },

  /** Encode a number as base64 to a fixed width of n chars. */
  fromIntN(int32: number, n: number): string {
    let result = ''
    for (let i = 0; i < n; ++i) {
      result = DIGITS[int32 & 0x3F] + result
      int32 >>= 6
    }
    return result
  },

  /** Decode a base64 string to a signed integer (sign-extends from the leading digit). */
  toIntSigned(digitsStr: string): number {
    let result = 0
    const digits = digitsStr.split('')
    if (digits[0] && (DIGITS_MAP[digits[0]]! & 0x20))
      result = -1
    for (const ch of digits)
      result = (result << 6) + DIGITS_MAP[ch]!
    return result
  },

  /** True only if every char is in the alphabet. */
  isB64(str: string): boolean {
    return str.split('').every(c => DIGITS_MAP[c] !== undefined)
  },
}
