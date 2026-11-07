// RTF → HTML converter (client-side)
// Handles paragraphs, bold/italic/underline, font sizes, colors,
// text alignment, basic tables, embedded PNG/JPEG images, field results.

// ─── Utilities ────────────────────────────────────────────────────────────────

function win1252(code) {
  // Mapping of Windows-1252 bytes 0x80-0x9F to Unicode codepoints
  const M = new Map([
    [0x80, 0x20AC], [0x82, 0x201A], [0x83, 0x0192], [0x84, 0x201E],
    [0x85, 0x2026], [0x86, 0x2020], [0x87, 0x2021], [0x88, 0x02C6],
    [0x89, 0x2030], [0x8A, 0x0160], [0x8B, 0x2039], [0x8C, 0x0152],
    [0x8E, 0x017D], [0x91, 0x2018], [0x92, 0x2019], [0x93, 0x201C],
    [0x94, 0x201D], [0x95, 0x2022], [0x96, 0x2013], [0x97, 0x2014],
    [0x98, 0x02DC], [0x99, 0x2122], [0x9A, 0x0161], [0x9B, 0x203A],
    [0x9C, 0x0153], [0x9E, 0x017E], [0x9F, 0x0178],
  ])
  const cp = M.get(code) ?? code
  return String.fromCodePoint(cp)
}

function hexToDataUri(hexStr, mime) {
  try {
    const h = hexStr.replace(/\s/g, '')
    const len = h.length >> 1
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++)
      bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
    const CHUNK = 1023  // multiple of 3 for clean base64 chunks
    let b64 = ''
    for (let i = 0; i < bytes.length; i += CHUNK)
      b64 += btoa(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)))
    return `data:${mime};base64,${b64}`
  } catch { return '' }
}

function findGroupEnd(rtf, start) {
  let depth = 0
  for (let i = start; i < rtf.length; i++) {
    if      (rtf[i] === '{') depth++
    else if (rtf[i] === '}') { if (!--depth) return i }
  }
  return rtf.length - 1
}

// Extract the image hex data from a {\pict...} group string by explicitly
// walking past every RTF control word, then returning what remains.
// This is robust against control-word numbers immediately adjacent to the
// hex data (no newline separator), which defeated regex-based approaches.
function hexFromPict(pict) {
  let i = 1  // skip opening {
  while (i < pict.length - 1) {
    const c = pict[i]
    if (c === '\\') {
      // skip \keyword (letters + optional * symbol)
      i++
      while (i < pict.length && /[a-zA-Z*]/.test(pict[i])) i++
      // skip optional signed integer
      if (i < pict.length && pict[i] === '-') i++
      while (i < pict.length && /\d/.test(pict[i])) i++
      // consume single space delimiter
      if (i < pict.length && pict[i] === ' ') i++
    } else if (c === '{' || c === '}') {
      // nested sub-group (e.g. {\*\blipuid...}) — skip entire group
      let d = 0
      while (i < pict.length) {
        if      (pict[i] === '{') d++
        else if (pict[i] === '}') { if (!--d) { i++; break } }
        i++
      }
    } else if (/[\r\n\t ]/.test(c)) {
      i++  // whitespace between control words
    } else if (/[0-9a-fA-F]/i.test(c)) {
      // Reached the hex data — collect only hex chars + whitespace,
      // stopping as soon as we hit { } or any non-hex character so we
      // never include {\*\blipuid...} or other trailing groups.
      const start = i
      while (i < pict.length && /[0-9a-fA-F\s]/i.test(pict[i])) i++
      return pict.slice(start, i)
    } else {
      break  // unexpected character
    }
  }
  return null
}

// Extract the first raster image (pngblip/jpegblip) from any RTF group string.
// Skips WMF/EMF metafiles. Returns { uri, mime } or null.
function extractFirstRasterFromGroup(group) {
  // Find the first {\pict...} that is NOT a metafile (wmetafile/emfblip)
  let search = 0
  while (true) {
    const p = group.indexOf('{\\pict', search)
    if (p === -1) return null
    const pe = findGroupEnd(group, p)
    const pg = group.slice(p, pe + 1)
    const isPng  = pg.includes('\\pngblip')
    const isJpeg = !isPng && pg.includes('\\jpegblip')
    if (isPng || isJpeg) {
      const hexData = hexFromPict(pg)
      if (hexData) {
        const mime = isPng ? 'image/png' : 'image/jpeg'
        const uri  = hexToDataUri(hexData, mime)
        return uri ? { uri, mime } : null
      }
    }
    search = pe + 1
  }
}

// Pre-pass: extract embedded images; replace inline {\pict} with markers,
// extract {\shp} floating shapes (behind-text) into bgImages.
function extractImages(rtf) {
  const imageMap = new Map()
  const bgImages = []      // data URIs for floating/behind-text shapes
  let idx = 0
  let result = ''
  let pos = 0

  while (pos < rtf.length) {
    // Find {\*\shppict (inline Word wrapper), plain {\pict, and {\shp (floating/behind-text)
    const shppictPos = rtf.indexOf('{\\*\\shppict', pos)
    const pictPos    = rtf.indexOf('{\\pict',       pos)

    // {\shp} = floating shape; verify next char after 'shp' is not a letter
    // to exclude {\shprslt, {\shptxt, {\shpinst etc.
    let shpPos = -1
    let shpSearch = pos
    while (true) {
      const c = rtf.indexOf('{\\shp', shpSearch)
      if (c === -1) break
      if (!/[a-zA-Z]/.test(rtf[c + 5])) { shpPos = c; break }
      shpSearch = c + 1
    }

    if (shppictPos === -1 && pictPos === -1 && shpPos === -1) { result += rtf.slice(pos); break }

    // Determine which candidate appears first in the document
    const firstPos = Math.min(
      shpPos     !== -1 ? shpPos     : Infinity,
      shppictPos !== -1 ? shppictPos : Infinity,
      pictPos    !== -1 ? pictPos    : Infinity,
    )

    // ── Handle {\shp...} floating shape (image set "behind text" in Word) ────
    // These images are background layers — extracted to bgImages, removed from flow.
    if (shpPos !== -1 && shpPos === firstPos) {
      result += rtf.slice(pos, shpPos)
      const shpEnd   = findGroupEnd(rtf, shpPos)
      const shpGroup = rtf.slice(shpPos, shpEnd + 1)

      const extracted = extractFirstRasterFromGroup(shpGroup)
      console.log('[rtfToHtml] {\shp} at', shpPos, '→', extracted ? 'extracted bg image' : 'no raster image found')
      if (extracted) {
        bgImages.push(extracted.uri)
      }
      pos = shpEnd + 1
      continue
    }

    // ── Handle {\*\shppict} or plain {\pict} ─────────────────────────────────
    const useShppict = shppictPos !== -1 && (pictPos === -1 || shppictPos <= pictPos)
    const gs = useShppict ? shppictPos : pictPos

    result += rtf.slice(pos, gs)
    const ge    = findGroupEnd(rtf, gs)
    const group = rtf.slice(gs, ge + 1)

    // Locate the actual {\pict\pngblip...} or {\pict\jpegblip...} inside
    const innerPng = group.indexOf('{\\pict\\pngblip')
    const innerJpg = group.indexOf('{\\pict\\jpegblip')
    const isPng = innerPng !== -1 || (group.includes('\\pict') && group.includes('\\pngblip'))
    const isJpg = !isPng && (innerJpg !== -1 || (group.includes('\\pict') && group.includes('\\jpegblip')))

    if (isPng || isJpg) {
      const pictStart = isPng
        ? (innerPng !== -1 ? innerPng : group.indexOf('{\\pict'))
        : (innerJpg !== -1 ? innerJpg : group.indexOf('{\\pict'))
      const pictEnd   = findGroupEnd(group, pictStart)
      const pictGroup = group.slice(pictStart, pictEnd + 1)

      const hexData = hexFromPict(pictGroup)

      if (hexData) {
        const key = `\x02IMG${idx++}\x02`
        const uri = hexToDataUri(hexData, isPng ? 'image/png' : 'image/jpeg')
        if (uri) imageMap.set(key, uri)
        result += key
        pos = ge + 1

        // Skip a {\nonshppict...} that Word appends immediately after {\*\shppict}
        if (useShppict) {
          let p = pos
          while (p < rtf.length && (rtf[p] === ' ' || rtf[p] === '\r' || rtf[p] === '\n')) p++
          if (rtf.startsWith('{\\nonshppict', p)) pos = findGroupEnd(rtf, p) + 1
        }
        continue
      }
    }

    // Not extractable — keep the original group text and move on
    result += group
    pos = ge + 1
  }
  return { rtf: result, imageMap, bgImages }
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────
function tokenize(rtf) {
  const tokens = []
  let i = 0
  while (i < rtf.length) {
    const c = rtf[i]
    if (c === '{') { tokens.push({ t:'{' }); i++ }
    else if (c === '}') { tokens.push({ t:'}' }); i++ }
    else if (c === '\\') {
      const n = rtf[i + 1]
      if (!n) { i++; continue }
      if (n === '\\') { tokens.push({ t:'text', v:'\\' });  i += 2 }
      else if (n==='{') { tokens.push({ t:'text', v:'{' });  i += 2 }
      else if (n==='}') { tokens.push({ t:'text', v:'}' });  i += 2 }
      else if (n==="'") {
        tokens.push({ t:'text', v: win1252(parseInt(rtf.slice(i+2,i+4),16)) })
        i += 4
      }
      else if (n==='~') { tokens.push({ t:'text', v:' ' }); i += 2 }
      else if (n==='-') { tokens.push({ t:'text', v:'­' }); i += 2 }
      else if (n==='\n'||n==='\r') { tokens.push({ t:'ctrl', n:'par', v:null }); i += 2 }
      else if (n==='*') { tokens.push({ t:'ctrl', n:'*', v:null }); i += 2 }
      else {
        let j = i + 1
        while (j < rtf.length && /[a-zA-Z]/.test(rtf[j])) j++
        const name = rtf.slice(i+1, j).toLowerCase()
        let val = null
        if (j < rtf.length && (rtf[j]==='-' || /\d/.test(rtf[j]))) {
          const neg = rtf[j]==='-' ? (j++, true) : false
          let ns = ''
          while (j < rtf.length && /\d/.test(rtf[j])) ns += rtf[j++]
          val = parseInt(ns) * (neg ? -1 : 1)
        }
        if (rtf[j] === ' ') j++
        tokens.push({ t:'ctrl', n:name, v:val })
        i = j
      }
    } else {
      let j = i
      while (j < rtf.length && rtf[j]!=='{'&&rtf[j]!=='}'&&rtf[j]!=='\\') j++
      const chunk = rtf.slice(i, j).replace(/[\r\n]/g,'')
      if (chunk) tokens.push({ t:'text', v:chunk })
      i = j
    }
  }
  return tokens
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
//
// KEY DESIGN: `skip` lives in the state stack.
//   • Pushing a new group inherits skip from parent via spread.
//   • Setting cur().skip = true marks this group AND all nested groups as skipped.
//   • Popping restores parent's (non-skip) state automatically.
// This correctly handles the full RTF group nesting without a depth counter.

// Groups whose entire content should be invisible to the reader.
const SKIP_GROUPS = new Set([
  'fonttbl','colortbl','stylesheet','info','pict',
  'object','objdata','objclass','objname','objalt',
  'fldinst',          // field instruction (NOT result)
  'header','footer','headerl','headerr','headerf',
  'footerl','footerr','footerf',
  'rsidtbl','generator','themedata','colorschememapping',
  'latentstyles','listtable','listoverride','pgptbl',
  'sp','sn','sv',     // shape property sub-groups
  'xmlnstbl','msipicturecomment','mcspc',
  'nonshppict',  // WMF fallback for {\*\shppict} — always skip
])

// After a \* control symbol, these destination keywords are KNOWN and shown.
// Everything else after \* is treated as an unknown destination → skip.
// shppict: Word wraps PNG/JPEG pict groups in {\*\shppict{...}} — must NOT skip
// so the image marker placed there by extractImages is visible to the renderer.
const SHOW_AFTER_STAR = new Set(['fldrslt', 'shptxt', 'ud', 'shppict'])

function render(tokens, colors, imageMap) {
  const mkState = () => ({
    bold:false, italic:false, underline:false, strike:false,
    fontSize:12, colorIdx:0, align:'left',
    skip: false,          // inherited through nested groups
  })

  const stack = [mkState()]
  const cur   = () => stack[stack.length - 1]

  let starPending = false   // true after \* until next ctrl word
  let inTable     = false
  let cellHtmls   = []
  let paraHtml    = ''
  let paraAlign   = 'left'
  let bodyHtml    = ''

  // Paragraph-level spacing (reset on \pard)
  let paraSb = 0      // \sb  — space before (twips)
  let paraSa = 0      // \sa  — space after  (twips)
  let paraLi = 0      // \li  — left indent  (twips)
  let paraSl = 0      // \sl  — line spacing (twips; 0 = auto)
  let paraSlMult = 0  // \slmult — 1 = multiple of 240, 0 = exact pt

  const twipMm = n => `${(n * 25.4 / 1440).toFixed(1)}mm`

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  const flushPara = () => {
    const c = paraHtml.trim()
    paraHtml = ''

    // Convert spacing to CSS — use padding instead of margin to avoid CSS collapsing
    const pt = paraSb > 0 ? `padding-top:${twipMm(paraSb)};` : ''
    const pb = paraSa > 0 ? `padding-bottom:${twipMm(paraSa)};` : ''
    const pl = paraLi > 0 ? `padding-left:${twipMm(paraLi)};` : ''
    let lh = 'line-height:1.45;'
    if (paraSl !== 0) {
      lh = paraSlMult
        ? `line-height:${(paraSl / 240).toFixed(2)};`
        : `line-height:${(Math.abs(paraSl) / 20).toFixed(1)}pt;`
    }

    if (!c) {
      // Empty paragraph — emit a zero-height spacer so its \sb still takes space
      if (paraSb > 0 || paraSa > 0) {
        bodyHtml += `<p style="margin:0;${pt}${pb}line-height:0;font-size:0;height:0;overflow:hidden"> </p>\n`
      }
      return
    }

    if (inTable) {
      cellHtmls.push(`<td style="padding:4pt 6pt;text-align:${paraAlign};vertical-align:top">${c}</td>`)
    } else {
      bodyHtml += `<p style="margin:0;text-align:${paraAlign};${pt}${pb}${pl}${lh}">${c}</p>\n`
    }
  }

  for (const tok of tokens) {

    // ── Group open ────────────────────────────────────────────────────────────
    if (tok.t === '{') {
      stack.push({ ...cur() })   // inherits skip from parent
      starPending = false

    // ── Group close ───────────────────────────────────────────────────────────
    } else if (tok.t === '}') {
      stack.pop()
      if (!stack.length) stack.push(mkState())
      starPending = false

    // ── Skip all content inside a skip group ──────────────────────────────────
    } else if (cur().skip) {
      continue

    // ── Control words ─────────────────────────────────────────────────────────
    } else if (tok.t === 'ctrl') {
      const s = cur()
      const { n, v } = tok

      // Handle \* — marks current group as optional/unknown destination
      if (n === '*') {
        starPending = true
        continue
      }

      // If previous token was \*, decide whether to skip this group
      if (starPending) {
        starPending = false
        if (!SHOW_AFTER_STAR.has(n)) {
          s.skip = true   // unknown destination → skip this group
          continue
        }
        // known destination after \* → fall through to normal handling
      }

      // Named skip groups
      if (SKIP_GROUPS.has(n)) { s.skip = true; continue }

      // ── Paragraph / character formatting ──────────────────────────────────
      if      (n === 'pard') {
        Object.assign(s, { bold:false, italic:false, underline:false,
          strike:false, fontSize:12, colorIdx:0, align:'left' })
        paraAlign = 'left'
        paraSb = 0; paraSa = 0; paraLi = 0; paraSl = 0; paraSlMult = 0
      }
      else if (n === 'par')    { flushPara(); paraAlign = s.align }
      else if (n === 'line')   { paraHtml += '<br>' }
      else if (n === 'tab')    { paraHtml += '&nbsp;&nbsp;&nbsp;' }
      else if (n === 'b')      { s.bold      = v === null || v !== 0 }
      else if (n === 'i')      { s.italic    = v === null || v !== 0 }
      else if (n === 'ul'||n==='uld'||n==='uldash') { s.underline = true }
      else if (n === 'ulnone') { s.underline = false }
      else if (n === 'strike') { s.strike    = true }
      else if (n === 'fs')     { s.fontSize  = Math.round((v ?? 24) / 2) }
      else if (n === 'cf')     { s.colorIdx  = v ?? 0 }
      else if (n === 'qc')     { s.align = 'center'; paraAlign = 'center' }
      else if (n === 'ql')     { s.align = 'left';   paraAlign = 'left'   }
      else if (n === 'qr')     { s.align = 'right';  paraAlign = 'right'  }
      else if (n === 'qj')     { s.align = 'justify';paraAlign = 'justify'}
      // Paragraph spacing and indent
      else if (n === 'sb')     { paraSb = v ?? 0 }
      else if (n === 'sa')     { paraSa = v ?? 0 }
      else if (n === 'li')     { paraLi = v ?? 0 }
      else if (n === 'sl')     { paraSl = v ?? 0 }
      else if (n === 'slmult') { paraSlMult = v ?? 0 }
      // Tables
      else if (n === 'trowd')  { inTable = true; cellHtmls = [] }
      else if (n === 'intbl')  { /* already handled */ }
      else if (n === 'cell')   { flushPara() }
      else if (n === 'row')    {
        bodyHtml += `<tr>${cellHtmls.join('')}</tr>\n`
        cellHtmls = []; inTable = false
      }

    // ── Text ──────────────────────────────────────────────────────────────────
    } else if (tok.t === 'text') {
      const raw = tok.v
      if (!raw) continue

      // Check for image markers (may be mixed with surrounding text)
      if (raw.includes('\x02IMG')) {
        const parts = raw.split(/(\x02IMG\d+\x02)/)
        for (const part of parts) {
          if (!part) continue
          if (imageMap.has(part)) {
            paraHtml += `<img src="${imageMap.get(part)}" style="max-width:100%;height:auto;display:block;margin:0 auto;">`
          } else {
            paraHtml += renderSpan(part, cur(), colors, esc)
          }
        }
        continue
      }

      paraHtml += renderSpan(raw, cur(), colors, esc)
    }
  }

  if (paraHtml.trim()) flushPara()
  return bodyHtml
}

function renderSpan(text, s, colors, esc) {
  const color = s.colorIdx > 0 ? (colors[s.colorIdx] ?? 'inherit') : 'inherit'
  const st = []
  if (s.bold)               st.push('font-weight:bold')
  if (s.italic)             st.push('font-style:italic')
  if (s.underline)          st.push('text-decoration:underline')
  if (s.strike)             st.push('text-decoration:line-through')
  if (s.fontSize !== 12)    st.push(`font-size:${s.fontSize}pt`)
  if (color !== 'inherit')  st.push(`color:${color}`)

  const escaped = esc(text)
  return st.length ? `<span style="${st.join(';')}">${escaped}</span>` : escaped
}

// ─── Page-size detection ──────────────────────────────────────────────────────
function detectPageSize(rtf) {
  // Scan up to 16 KB — large font/color tables can push page info far in
  const head = rtf.slice(0, 16384)

  // Document-level paper size (twips)
  let pw = parseInt((head.match(/\\paperw(\d+)/) || [,0])[1])
  let ph = parseInt((head.match(/\\paperh(\d+)/) || [,0])[1])

  // Section-level page size overrides document level when both are present
  // (\pgwsxn / \pghsxn appear inside \sectd blocks)
  const pgwM = head.match(/\\pgwsxn(\d+)/)
  const pghM = head.match(/\\pghsxn(\d+)/)
  if (pgwM) pw = parseInt(pgwM[1])
  if (pghM) ph = parseInt(pghM[1])

  // Apply A4 portrait defaults when no values found
  if (!pw) pw = 11906
  if (!ph) ph = 16838

  // Landscape signals (any one is sufficient):
  //   \paperw > \paperh           — dimensions already swapped
  //   \landscape                  — document-level keyword
  //   \lndscpsxn                  — section-level landscape flag (Compatibility Mode)
  //   \pgwsxn > \pghsxn           — section dims explicitly landscape
  const landscape = pw > ph
    || /\\landscape\b/.test(head)
    || /\\lndscpsxn\b/.test(head)
    || (pgwM && pghM && parseInt(pgwM[1]) > parseInt(pghM[1]))

  // 1 twip = 25.4 / 1440 mm — normalise so widthMm is always the long side
  const mm  = n => +(n * 25.4 / 1440).toFixed(1)
  const wMm = mm(pw), hMm = mm(ph)
  const widthMm  = landscape ? Math.max(wMm, hMm) : Math.min(wMm, hMm)
  const heightMm = landscape ? Math.min(wMm, hMm) : Math.max(wMm, hMm)

  // Page margins (twips → mm) — defaults are Word's 1-inch margins
  const marginTop    = mm(parseInt((head.match(/\\margt(\d+)/)  || [,1440])[1]))
  const marginBottom = mm(parseInt((head.match(/\\margb(\d+)/)  || [,1440])[1]))
  const marginLeft   = mm(parseInt((head.match(/\\margl(\d+)/)  || [,1800])[1]))
  const marginRight  = mm(parseInt((head.match(/\\margr(\d+)/)  || [,1800])[1]))

  console.log(`[rtfToHtml] page: pw=${pw} ph=${ph} landscape=${landscape} → ${widthMm}×${heightMm}mm margins: t${marginTop} b${marginBottom} l${marginLeft} r${marginRight}`)
  return { landscape, widthMm, heightMm, marginTop, marginBottom, marginLeft, marginRight }
}

// ─── Public API ───────────────────────────────────────────────────────────────
// Returns { html, bgHtml, landscape, widthMm, heightMm }
// bgHtml: <img> tags for floating/behind-text images; empty string if none.
export function rtfToHtml(rtfContent) {
  // 1. Detect page orientation/size from document header
  const pageSize = detectPageSize(rtfContent)

  // 2. Extract embedded images (replace {\pict...} with markers; {\shp} → bgImages)
  const { rtf: cleaned, imageMap, bgImages } = extractImages(rtfContent)

  // 3. Parse color table
  const colors = ['inherit']
  const ctm = cleaned.match(/\{\\colortbl\s*;?(.*?)\}/s)
  if (ctm) {
    ctm[1].split(';').forEach(e => {
      if (!e.includes('\\red')) return
      const r = (e.match(/\\red(\d+)/)   || [,0])[1]
      const g = (e.match(/\\green(\d+)/) || [,0])[1]
      const b = (e.match(/\\blue(\d+)/)  || [,0])[1]
      colors.push(`rgb(${r},${g},${b})`)
    })
  }

  // 4. Tokenize + render
  const tokens = tokenize(cleaned)
  const html = render(tokens, colors, imageMap)

  // 5. Build background-image HTML (floating shapes from {\shp} groups)
  const bgHtml = bgImages.map(uri =>
    `<img src="${uri}" alt="" style="width:100%;height:100%;object-fit:fill;display:block;">`
  ).join('')

  console.log(`[rtfToHtml] bgImages=${bgImages.length} bgHtml.length=${bgHtml.length}`)
  return { html, bgHtml, ...pageSize }
}
