import path from 'path'

const TIMESTAMP_CAPTURE_REGEX = /^\d{4}-\d{2}-\d{2}-\d{6}\.md$/
const HASHTAG_REGEX = /(?:^|[\s([{])#([\p{L}\p{N}_/-]+)/gu
const DEFAULT_TAG_CAP = 5

export function isTimestampCapture(basename) {
  return TIMESTAMP_CAPTURE_REGEX.test(basename)
}

export function stripTelegramFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return content

  const frontmatter = match[1]
  const body = match[2]
  if (!frontmatter.includes('source: telegram-text')) return content

  return body.trimStart()
}

export function titleFromFilename(basename) {
  const baseName = path.basename(basename, path.extname(basename))
  return baseName.replace(/[\/\\?%*:|"<>]/g, '-')
}

function stripQuotes(value) {
  const trimmed = value.trim()
  return trimmed.replace(/^["']|["']$/g, '').trim()
}

function normalizeTagSpaces(tag) {
  return tag.trim().replace(/\s+/g, '-')
}

function dedupePreserveOrder(tags) {
  const seen = new Set()
  const result = []
  for (const raw of tags) {
    const tag = typeof raw === 'string' ? normalizeTagSpaces(raw) : ''
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { frontmatter: null, body: content }
  return { frontmatter: match[1], body: match[2] }
}

function parseFrontmatterTags(frontmatter) {
  if (!frontmatter) return []

  const listMatch = frontmatter.match(/^tags:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/m)
  if (listMatch) {
    return listMatch[1]
      .split('\n')
      .map((line) => {
        const item = line.match(/^[ \t]*-[ \t]*(.+?)\s*$/)
        return item ? stripQuotes(item[1]) : ''
      })
      .filter(Boolean)
  }

  const inlineMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m)
  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map((part) => stripQuotes(part))
      .filter(Boolean)
  }

  return []
}

function extractHashtags(body) {
  const tags = []
  for (const match of body.matchAll(HASHTAG_REGEX)) {
    tags.push(match[1])
  }
  return tags
}

export function extractExistingTags(content) {
  const { frontmatter, body } = splitFrontmatter(content)
  return dedupePreserveOrder([
    ...parseFrontmatterTags(frontmatter),
    ...extractHashtags(body),
  ])
}

export function mergeTags(existingTags, llmTags, maxTotal = DEFAULT_TAG_CAP) {
  const merged = dedupePreserveOrder(existingTags || [])
  const seen = new Set(merged.map((tag) => tag.toLowerCase()))

  for (const raw of sanitizeLlmTags(llmTags || [])) {
    if (merged.length >= maxTotal) break
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(raw)
  }

  return merged
}

// Common simplified-only forms (TC uses a different character). Incomplete by design — prompt is primary.
const SIMPLIFIED_ONLY_RE =
  /[爱办报备贝笔毕边别宾补参仓侧层产长尝场车彻陈称诚处传创词从达带担单当党导岛敌递点电调丢东动断对队吨夺额尔儿发范飞坟奋丰凤肤妇复该赶个给巩沟构购顾关观馆惯广归国过汉号轰红后户画话欢环会机积级挤计记纪监见荐将浆奖讲胶阶节结诫届紧尽经竞镜纠旧举剧据惧卷觉开克恳夸块宽矿亏馈扩阔蜡来兰劳乐垒泪类累篱里礼丽历俩联练粮两疗辽猎临邻鳞龄领刘龙楼录陆驴乱仑论萝逻吗买麦卖脉猫锚铆贸门闷们谜面亩纳难拟酿鸟聂拧钮农疟诺欧殴鸥呕盘庞赔喷鹏骗飘频凭评苹谱齐骑启气签千牵钎迁钱钳浅谴枪呛蔷墙抢乔桥鞘窍窃亲寝轻氢倾请琼穷趋区躯驱鹊确让扰绕热韧认绒软锐润洒萨鳃赛伞丧扫涩杀纱筛晒删闪陕赡伤赏烧绍赊摄绅审婶肾渗声绳圣胜师狮湿诗时蚀实寿兽枢输书术树竖数帅双谁税顺说硕丝饲耸怂讼诵苏诉肃虽随髓岁孙损笋缩琐锁它挞胎态摊贪瘫坛谈叹汤烫涛绦铁听铜图涂团洼袜弯湾网为韦卫闻问务无雾务习系戏细虾吓铣鲜纤县现线乡写胁亵兴须许叙绪续轩悬选癣学寻训讯压鸦鸭哑亚讶颜阎艳厌砚彦验鸯扬阳养样钥爷页业叶医铱遗仪蚁艺亿忆义议译阴银饮樱婴鹰应绤痈拥佣踊优犹邮铀游诱舆鱼渔与屿语郁狱誉浴预驭鸳渊园员圆缘远愿约跃钥阅云郧匀陨运蕴杂灾载攒脏责择则泽贼赠轧闸债毡战绽张掌涨帐胀赵这贞针侦诊镇阵挣睁狰帧郑证织职执纸挚掷帜质钟终肿种冢众诌轴皱骤猪诸诛烛嘱贮铸抓爪专砖转赚桩装妆壮状准时浊总纵邹诅组钻续]/

const JUNK_TAG_RE = /^[.．。…⋯・·\-–—_*~`'"“”‘’\s]+$/

export function sanitizeLlmTags(tags) {
  return dedupePreserveOrder(
    (tags || [])
      .map((tag) => (typeof tag === 'string' ? tag : ''))
      .filter((tag) => {
        const normalized = normalizeTagSpaces(tag)
        return normalized && !JUNK_TAG_RE.test(normalized) && !SIMPLIFIED_ONLY_RE.test(normalized)
      }),
  )
}
