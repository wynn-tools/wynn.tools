import type { RollBasis } from './roll-basis'
import type { SearchItem, StatSumPresetKey } from './types'
import { canonicalKey } from '~/lib/data/identifications'
import { playerFavoredValue } from './roll-basis'
import { STAT_SUM_PRESETS, sumPreset } from './stat-sums'

type Tok
  = | { t: 'num', v: number }
    | { t: 'id', v: string }
    | { t: 'op', v: string }
    | { t: 'lp' }
    | { t: 'rp' }
    | { t: 'eof' }

const OPS = ['<=', '>=', '==', '!=', '<', '>', '+', '-', '*', '/']
const WORD_OPS: Record<string, string> = { and: '&&', or: '||', not: '!' }
const SUM_KEYS = new Set<string>(Object.keys(STAT_SUM_PRESETS))

function tokenize(src: string): Tok[] | { error: string } {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]!
    if (c === ' ' || c === '\t' || c === '\n') {
      i++
      continue
    }
    if (c === '(') {
      out.push({ t: 'lp' })
      i++
      continue
    }
    if (c === ')') {
      out.push({ t: 'rp' })
      i++
      continue
    }
    if (/[0-9.]/.test(c)) {
      let j = i + 1
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++
      const n = Number(src.slice(i, j))
      if (!Number.isFinite(n))
        return { error: `bad number at ${i}` }
      out.push({ t: 'num', v: n })
      i = j
      continue
    }
    if (/[a-z_]/i.test(c)) {
      let j = i + 1
      while (j < src.length && /\w/.test(src[j]!)) j++
      const word = src.slice(i, j)
      if (word in WORD_OPS)
        out.push({ t: 'op', v: WORD_OPS[word]! })
      else
        out.push({ t: 'id', v: word })
      i = j
      continue
    }
    const two = src.slice(i, i + 2)
    if (OPS.includes(two)) {
      out.push({ t: 'op', v: two })
      i += 2
      continue
    }
    if (OPS.includes(c)) {
      out.push({ t: 'op', v: c })
      i++
      continue
    }
    return { error: `unexpected character '${c}' at ${i}` }
  }
  out.push({ t: 'eof' })
  return out
}

type Node
  = | { kind: 'num', v: number }
    | { kind: 'id', name: string }
    | { kind: 'call', name: 'min' | 'max' | 'raw', arg: Node }
    | { kind: 'bin', op: string, l: Node, r: Node }
    | { kind: 'un', op: '!', arg: Node }

const PREC: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 3,
  '<=': 3,
  '>': 3,
  '>=': 3,
  '+': 4,
  '-': 4,
  '*': 5,
  '/': 5,
}

function isErr<T>(x: T | { error: string }): x is { error: string } {
  return typeof x === 'object' && x !== null && 'error' in (x as Record<string, unknown>)
}

function parse(toks: Tok[]): { ok: true, node: Node } | { ok: false, error: string } {
  let p = 0
  function peek(): Tok {
    return toks[p]!
  }
  function eat(): Tok {
    return toks[p++]!
  }

  function parsePrimary(): Node | { error: string } {
    const t = eat()
    if (t.t === 'num')
      return { kind: 'num', v: t.v }
    if (t.t === 'lp') {
      const e = parseExpr(0)
      if (isErr(e))
        return e
      const r = eat()
      if (r.t !== 'rp')
        return { error: 'expected )' }
      return e
    }
    if (t.t === 'op' && t.v === '!') {
      const r = parsePrimary()
      if (isErr(r))
        return r
      return { kind: 'un', op: '!', arg: r }
    }
    if (t.t === 'op' && t.v === '-') {
      const r = parsePrimary()
      if (isErr(r))
        return r
      return { kind: 'bin', op: '-', l: { kind: 'num', v: 0 }, r }
    }
    if (t.t === 'id') {
      if (peek().t === 'lp') {
        if (t.v !== 'min' && t.v !== 'max' && t.v !== 'raw')
          return { error: `unknown function '${t.v}'` }
        eat()
        const arg = parseExpr(0)
        if (isErr(arg))
          return arg
        const r = eat()
        if (r.t !== 'rp')
          return { error: 'expected )' }
        return { kind: 'call', name: t.v, arg }
      }
      return { kind: 'id', name: t.v }
    }
    return { error: 'unexpected token' }
  }

  function parseExpr(minPrec: number): Node | { error: string } {
    let left = parsePrimary()
    if (isErr(left))
      return left
    while (true) {
      const t = peek()
      if (t.t !== 'op' || !(t.v in PREC) || PREC[t.v]! < minPrec)
        break
      const op = (eat() as { t: 'op', v: string }).v
      const right = parseExpr(PREC[op]! + 1)
      if (isErr(right))
        return right
      left = { kind: 'bin', op, l: left, r: right }
    }
    return left
  }

  const tree = parseExpr(0)
  if (isErr(tree))
    return { ok: false, error: tree.error }
  if (peek().t !== 'eof')
    return { ok: false, error: 'unexpected trailing input' }
  return { ok: true, node: tree }
}

function resolveIdentifier(item: SearchItem, name: string, basis: RollBasis): number {
  if (SUM_KEYS.has(name))
    return sumPreset(item, name as StatSumPresetKey, basis)
  const key = canonicalKey(name)
  if (!key)
    return 0
  const entry = item.identifications[key]
  if (!entry)
    return 0
  return playerFavoredValue(entry, key, basis)
}

function evalNode(node: Node, item: SearchItem, basis: RollBasis): number {
  switch (node.kind) {
    case 'num':
      return node.v
    case 'id':
      return resolveIdentifier(item, node.name, basis)
    case 'call': {
      const argName = node.arg.kind === 'id' ? node.arg.name : ''
      const key = canonicalKey(argName)
      if (!key)
        return 0
      const entry = item.identifications[key]
      if (!entry)
        return 0
      return entry[node.name]
    }
    case 'un':
      return evalNode(node.arg, item, basis) ? 0 : 1
    case 'bin': {
      const l = evalNode(node.l, item, basis)
      const r = evalNode(node.r, item, basis)
      switch (node.op) {
        case '+': return l + r
        case '-': return l - r
        case '*': return l * r
        case '/': return r === 0 ? 0 : l / r
        case '<': return l < r ? 1 : 0
        case '<=': return l <= r ? 1 : 0
        case '>': return l > r ? 1 : 0
        case '>=': return l >= r ? 1 : 0
        case '==': return l === r ? 1 : 0
        case '!=': return l !== r ? 1 : 0
        case '&&': return (l && r) ? 1 : 0
        case '||': return (l || r) ? 1 : 0
      }
      return 0
    }
  }
}

export type Parsed
  = | { ok: true, eval: (item: SearchItem, basis: RollBasis) => boolean }
    | { ok: false, error: string }

export function parseExpression(src: string): Parsed {
  const toks = tokenize(src)
  if (isErr(toks))
    return { ok: false, error: toks.error }
  const parsed = parse(toks)
  if (!parsed.ok)
    return { ok: false, error: parsed.error }
  return { ok: true, eval: (item, basis) => !!evalNode(parsed.node, item, basis) }
}
