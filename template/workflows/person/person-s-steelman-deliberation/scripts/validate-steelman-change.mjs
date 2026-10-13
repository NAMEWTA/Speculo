#!/usr/bin/env node

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const WORKFLOW = 'person';
const WORK_ID = 'person/steelman-deliberation';
const ALLOWED_PHASES = new Set(['awaiting-answer', 'completed']);
const ALLOWED_DECISIONS = new Set(['recommend', 'reject', 'conditional', 'defer-for-evidence']);
const DOSSIER_HEADINGS = [
  '原始问题',
  '真正问题重述',
  '决策目标与成功标准',
  '已知事实、推断、价值与未知',
  '双向钢人',
  '共同基础',
  '真正分歧',
  '关键变量',
  '唯一关键问题',
  '证据缺口与适用边界',
];
const DECISION_HEADINGS = [
  '唯一关键问题',
  '用户回答',
  '明确判断',
  '决定性理由',
  '为什么另一边没有赢',
  '下一步行动',
  '反转条件',
  '置信度与剩余不确定性',
];

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function fail(message) {
  throw new ValidationError(message);
}

function parseArgs(argv) {
  const options = {
    selfCheck: false,
    phase: null,
    changeDir: null,
    statusFile: null,
    dossierFile: null,
    decisionFile: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--self-check') {
      options.selfCheck = true;
      continue;
    }

    const valueOptions = new Map([
      ['--phase', 'phase'],
      ['--change-dir', 'changeDir'],
      ['--status-file', 'statusFile'],
      ['--dossier-file', 'dossierFile'],
      ['--decision-file', 'decisionFile'],
    ]);
    const field = valueOptions.get(arg);
    if (!field) {
      fail(`unknown argument: ${arg}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      fail(`${arg} requires a value`);
    }
    options[field] = value;
    index += 1;
  }

  if (options.selfCheck) {
    if (argv.length !== 1) {
      fail('--self-check cannot be combined with other arguments');
    }
    return options;
  }

  if (!ALLOWED_PHASES.has(options.phase)) {
    fail('--phase must be awaiting-answer or completed');
  }
  if (!options.changeDir) {
    fail('--change-dir is required');
  }
  return options;
}

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, '\n');
}

function normalizeInline(value) {
  return value
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripYamlValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseFrontmatter(text, filePath) {
  const normalized = normalizeNewlines(text);
  const lines = normalized.split('\n');
  if (lines[0] !== '---') {
    fail(`${filePath}: missing opening frontmatter delimiter`);
  }
  const closing = lines.indexOf('---', 1);
  if (closing === -1) {
    fail(`${filePath}: missing closing frontmatter delimiter`);
  }

  const data = {};
  for (const rawLine of lines.slice(1, closing)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      fail(`${filePath}: unsupported frontmatter line: ${rawLine}`);
    }
    data[match[1]] = stripYamlValue(match[2]);
  }

  return { data, body: lines.slice(closing + 1).join('\n') };
}

function exactHeadingSections(body, level, heading, filePath) {
  const prefix = `${'#'.repeat(level)} ${heading}`;
  const lines = normalizeNewlines(body).split('\n');
  const indexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() === prefix) indexes.push(index);
  }
  if (indexes.length !== 1) {
    fail(`${filePath}: requires exactly one "${prefix}" heading; found ${indexes.length}`);
  }
  const start = indexes[0] + 1;
  let end = lines.length;
  const nextHeading = new RegExp(`^#{1,${level}}\\s+`);
  for (let index = start; index < lines.length; index += 1) {
    if (nextHeading.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

function requireSections(body, headings, filePath) {
  const sections = new Map();
  for (const heading of headings) {
    const content = exactHeadingSections(body, 2, heading, filePath);
    if (!normalizeInline(content)) {
      fail(`${filePath}: section "${heading}" is empty`);
    }
    sections.set(heading, content);
  }
  return sections;
}

function assertNoTodos(text, filePath) {
  if (/\[TODO(?::[^\]]*)?\]/i.test(text)) {
    fail(`${filePath}: contains unresolved [TODO] placeholder`);
  }
}

function requireScalar(frontmatter, key, expected, filePath) {
  if (frontmatter[key] !== expected) {
    fail(`${filePath}: frontmatter ${key} must be ${JSON.stringify(expected)}; got ${JSON.stringify(frontmatter[key])}`);
  }
}

function requireIso(value, label) {
  if (typeof value !== 'string' || !value || Number.isNaN(Date.parse(value))) {
    fail(`${label} must be a valid ISO-8601 timestamp`);
  }
}

function validateKeyQuestion(rawQuestion, filePath) {
  const withoutComments = rawQuestion.replace(/<!--[^]*?-->/g, '').trim();
  const paragraphs = withoutComments.split(/\n\s*\n/).map(normalizeInline).filter(Boolean);
  if (paragraphs.length !== 1) {
    fail(`${filePath}: "唯一关键问题" must contain one paragraph and one question`);
  }
  const question = paragraphs[0].replace(/^[-*+]\s+/, '').trim();
  const questionMarks = (question.match(/[？?]/g) ?? []).length;
  if (questionMarks !== 1) {
    fail(`${filePath}: "唯一关键问题" must contain exactly one question mark; found ${questionMarks}`);
  }
  if (/^\d+[.)、]\s/.test(question) || /(?:^|\s)[A-Ca-c][.)、]\s/.test(question)) {
    fail(`${filePath}: "唯一关键问题" must not be a numbered or multi-part list`);
  }
  return normalizeInline(question);
}

function validateSteelmanShape(body, filePath) {
  const lines = normalizeNewlines(body).split('\n').map((line) => line.trim());
  const steelmen = lines.filter((line) => /^###\s+钢人\s+[A-ZＡ-Ｚ]/u.test(line));
  if (steelmen.length >= 2) return;

  const optionIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^###\s+选项\s+/u.test(lines[index])) optionIndexes.push(index);
  }
  if (optionIndexes.length < 2) {
    fail(`${filePath}: "双向钢人" requires at least two steelman blocks, or at least two option blocks`);
  }
  optionIndexes.push(lines.length);
  for (let index = 0; index < optionIndexes.length - 1; index += 1) {
    const block = lines.slice(optionIndexes[index] + 1, optionIndexes[index + 1]);
    const required = ['#### 最强支持论证', '#### 最强反对论证', '#### 成立条件', '#### 失败条件'];
    const missing = required.filter((heading) => !block.includes(heading));
    if (missing.length > 0) {
      fail(`${filePath}: each option block is missing ${missing.join(', ')}`);
    }
  }
}

function validateDossier(text, filePath, expectedChange) {
  assertNoTodos(text, filePath);
  const { data, body } = parseFrontmatter(text, filePath);
  requireScalar(data, 'schema_version', 1, filePath);
  requireScalar(data, 'artifact', 'steelman-dossier', filePath);
  requireScalar(data, 'workflow', WORKFLOW, filePath);
  requireScalar(data, 'work_id', WORK_ID, filePath);
  requireScalar(data, 'change', expectedChange, filePath);
  requireScalar(data, 'status', 'awaiting-answer', filePath);
  requireIso(data.generated_at, `${filePath}: generated_at`);

  const sections = requireSections(body, DOSSIER_HEADINGS, filePath);
  validateSteelmanShape(sections.get('双向钢人'), filePath);
  const question = validateKeyQuestion(sections.get('唯一关键问题'), filePath);

  if (/^##\s+明确判断\s*$/m.test(body) || /^##\s+下一步行动\s*$/m.test(body)) {
    fail(`${filePath}: answer-before artifact must not contain a final judgment or next action section`);
  }
  return { question, sections, frontmatter: data };
}

function validateStatus(status, statusPath, expectedChange, phase, expectedQuestion) {
  if (!status || typeof status !== 'object' || Array.isArray(status)) {
    fail(`${statusPath}: status must be a JSON object`);
  }
  const expected = {
    schema_version: 1,
    artifact: 'person-work-status',
    workflow: WORKFLOW,
    change: expectedChange,
    work_id: WORK_ID,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (status[key] !== value) {
      fail(`${statusPath}: ${key} must be ${JSON.stringify(value)}; got ${JSON.stringify(status[key])}`);
    }
  }
  if (status.key_question !== expectedQuestion) {
    fail(`${statusPath}: key_question must exactly match the dossier question after whitespace normalization`);
  }
  if (!Array.isArray(status.blockers)) {
    fail(`${statusPath}: blockers must be an array`);
  }
  if (!['asked', 'already-answered'].includes(status.question_disposition)) {
    fail(`${statusPath}: question_disposition must be asked or already-answered`);
  }
  if (status.question_disposition === 'asked' && status.key_question_asked !== true) {
    fail(`${statusPath}: question_disposition=asked requires key_question_asked=true`);
  }
  if (status.question_disposition === 'already-answered' && status.key_question_asked !== false) {
    fail(`${statusPath}: question_disposition=already-answered requires key_question_asked=false`);
  }
  requireIso(status.created_at, `${statusPath}: created_at`);
  requireIso(status.updated_at, `${statusPath}: updated_at`);

  if (phase === 'awaiting-answer') {
    if (status.status !== 'active' || status.phase !== 'awaiting-answer') {
      fail(`${statusPath}: awaiting-answer requires status=active and phase=awaiting-answer`);
    }
    if (status.question_disposition !== 'asked') {
      fail(`${statusPath}: awaiting-answer requires question_disposition=asked`);
    }
    if (status.answer_received !== false) {
      fail(`${statusPath}: awaiting-answer requires answer_received=false`);
    }
    if (status.user_answer !== null && status.user_answer !== '') {
      fail(`${statusPath}: awaiting-answer requires an empty user_answer`);
    }
    if (status.completed_at !== null) {
      fail(`${statusPath}: awaiting-answer requires completed_at=null`);
    }
    return;
  }

  if (status.status !== 'completed' || status.phase !== 'completed') {
    fail(`${statusPath}: completed validation requires status=completed and phase=completed`);
  }
  if (status.answer_received !== true) {
    fail(`${statusPath}: completed validation requires answer_received=true`);
  }
  if (typeof status.user_answer !== 'string' || !normalizeInline(status.user_answer)) {
    fail(`${statusPath}: completed validation requires a non-empty user_answer`);
  }
  requireIso(status.completed_at, `${statusPath}: completed_at`);
  if (status.blockers.length !== 0) {
    fail(`${statusPath}: completed validation requires blockers=[]`);
  }
}

function isEvasiveOnly(value) {
  const compact = normalizeInline(value)
    .replace(/[，。；、,.!！?？:："“”'‘’()（）\-—]/g, '')
    .replace(/\s+/g, '');
  const evasive = [
    '两边都有道理',
    '具体情况具体分析',
    '你可以综合考虑',
    '最终还是看你自己',
    '这取决于你',
  ];
  return evasive.some((phrase) => compact === phrase.replace(/\s+/g, ''));
}

function validateActionTable(section, filePath) {
  const rows = normalizeNewlines(section)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'));
  const dataRows = rows.filter((row) => {
    if (/^\|\s*:?-{3,}/.test(row)) return false;
    const normalized = row.replace(/\s+/g, '');
    if (normalized.includes('|动作|责任人|时机/截止|完成证据|')) return false;
    return true;
  });
  if (dataRows.length < 1) {
    fail(`${filePath}: "下一步行动" requires at least one concrete table row`);
  }
}

function validateDecision(text, filePath, expectedChange, dossierQuestion, statusAnswer) {
  assertNoTodos(text, filePath);
  const { data, body } = parseFrontmatter(text, filePath);
  requireScalar(data, 'schema_version', 1, filePath);
  requireScalar(data, 'artifact', 'steelman-decision', filePath);
  requireScalar(data, 'workflow', WORKFLOW, filePath);
  requireScalar(data, 'work_id', WORK_ID, filePath);
  requireScalar(data, 'change', expectedChange, filePath);
  requireScalar(data, 'status', 'completed', filePath);
  if (!ALLOWED_DECISIONS.has(data.decision_type)) {
    fail(`${filePath}: decision_type must be one of ${[...ALLOWED_DECISIONS].join(', ')}`);
  }
  requireIso(data.generated_at, `${filePath}: generated_at`);

  const sections = requireSections(body, DECISION_HEADINGS, filePath);
  const decisionQuestion = validateKeyQuestion(sections.get('唯一关键问题'), filePath);
  if (decisionQuestion !== dossierQuestion) {
    fail(`${filePath}: decision question must exactly match the frozen dossier question`);
  }

  const userAnswer = normalizeInline(sections.get('用户回答'));
  if (userAnswer !== normalizeInline(statusAnswer)) {
    fail(`${filePath}: user answer must exactly match .status.json user_answer after whitespace normalization`);
  }

  const judgment = normalizeInline(sections.get('明确判断'));
  if (isEvasiveOnly(judgment)) {
    fail(`${filePath}: "明确判断" contains only an evasive non-decision`);
  }
  validateActionTable(sections.get('下一步行动'), filePath);

  const confidence = normalizeInline(sections.get('置信度与剩余不确定性'));
  if (!/[高中低]/u.test(confidence)) {
    fail(`${filePath}: confidence section must state 高, 中, or 低`);
  }

  return { decisionType: data.decision_type, sections, frontmatter: data };
}

async function readJson(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    fail(`${filePath}: cannot read (${error.message})`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`${filePath}: invalid JSON (${error.message})`);
  }
}

async function readText(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    fail(`${filePath}: cannot read (${error.message})`);
  }
}

async function validateChange(options) {
  const changeDir = path.resolve(options.changeDir);
  const expectedChange = path.basename(changeDir);
  const statusPath = path.resolve(options.statusFile ?? path.join(changeDir, '.status.json'));
  const dossierPath = path.resolve(options.dossierFile ?? path.join(changeDir, 'steelman-dossier.md'));
  const decisionPath = path.resolve(options.decisionFile ?? path.join(changeDir, 'decision.md'));

  const [status, dossierText] = await Promise.all([
    readJson(statusPath),
    readText(dossierPath),
  ]);
  const dossier = validateDossier(dossierText, dossierPath, expectedChange);
  validateStatus(status, statusPath, expectedChange, options.phase, dossier.question);

  if (options.phase === 'awaiting-answer') {
    if (!options.decisionFile) {
      try {
        await readFile(decisionPath, 'utf8');
        fail(`${decisionPath}: decision.md must not exist while awaiting an answer`);
      } catch (error) {
        if (error instanceof ValidationError) throw error;
        if (error.code !== 'ENOENT') {
          fail(`${decisionPath}: cannot verify absence (${error.message})`);
        }
      }
    }
    return {
      phase: options.phase,
      change: expectedChange,
      question: dossier.question,
      decisionType: null,
    };
  }

  const decisionText = await readText(decisionPath);
  const decision = validateDecision(
    decisionText,
    decisionPath,
    expectedChange,
    dossier.question,
    status.user_answer,
  );
  return {
    phase: options.phase,
    change: expectedChange,
    question: dossier.question,
    decisionType: decision.decisionType,
  };
}

function fixtureDossier(change, question = '假设十年以后多数成员都不了解创业起点，你最希望他们共同纪念的究竟是什么？') {
  return `---\nschema_version: 1\nartifact: steelman-dossier\nworkflow: person\nwork_id: person/steelman-deliberation\nchange: "${change}"\nstatus: awaiting-answer\ngenerated_at: "2026-08-18T00:00:00.000Z"\n---\n\n# 双向钢人论证\n\n## 原始问题\n\n公司应选择哪个日期作为司庆日。\n\n## 真正问题重述\n\n真正决策是定义组织未来共同纪念的起点。\n\n## 决策目标与成功标准\n\n选择能被未来成员理解并长期复述的组织叙事。\n\n## 已知事实、推断、价值与未知\n\n事实与价值已分开记录，未来成员的认同仍未知。\n\n## 双向钢人\n\n### 钢人 A：支持理念起点\n\n理念起点最能解释组织为何存在，并能连接长期文化。\n\n### 钢人 B：支持公司成立日\n\n法律实体成立日最清晰、可验证，也最容易形成制度。\n\n## 共同基础\n\n双方都希望日期可长期解释并形成共同认同。\n\n## 真正分歧\n\n分歧是纪念思想起点还是组织实体起点。\n\n## 关键变量\n\n| 变量 | 当前假设 | 改变结论的阈值 | 当前不确定性 | 可外部发现 | 用户特异性 |\n|---|---|---|---|---|---|\n| 共同纪念对象 | 尚未确定 | 未来成员更应认同的起点 | 高 | 否 | 高 |\n\n## 唯一关键问题\n\n${question}\n\n## 证据缺口与适用边界\n\n无决定性事实缺口。\n`;
}

function fixtureMultiOptionDossier(change, question) {
  const options = `### 选项 A：理念公开表达日

#### 最强支持论证

它最能解释组织为何存在。

#### 最强反对论证

早期日期可能无法被后来员工识别。

#### 成立条件

组织长期使命仍承接该理念。

#### 失败条件

组织使命已经实质改变。

### 选项 B：IP 公司成立日

#### 最强支持论证

它是组织化经营开始的可验证节点。

#### 最强反对论证

它可能只代表法律容器，而非共同使命。

#### 成立条件

成员更重视法律与制度连续性。

#### 失败条件

多数成员不把该实体视为当前组织起点。

### 选项 C：主要团队成立日

#### 最强支持论证

它最接近多数员工共同工作的现实起点。

#### 最强反对论证

它会抹去更早形成的理念与积累。

#### 成立条件

共同劳动经历是组织身份的主要来源。

#### 失败条件

未来团队结构变化使这一节点失去代表性。
`;
  return fixtureDossier(change, question).replace(
    /### 钢人 A：支持理念起点[\s\S]*?(?=\n## 共同基础)/,
    options,
  );
}

function fixtureStatus(change, question, completed = false) {
  return {
    schema_version: 1,
    artifact: 'person-work-status',
    workflow: 'person',
    change,
    work_id: WORK_ID,
    status: completed ? 'completed' : 'active',
    phase: completed ? 'completed' : 'awaiting-answer',
    key_question: question,
    key_question_asked: true,
    question_disposition: 'asked',
    answer_received: completed,
    user_answer: completed ? '希望大家纪念人与人真诚链接这一最初理念。' : null,
    created_at: '2026-08-18T00:00:00.000Z',
    updated_at: '2026-08-18T01:00:00.000Z',
    completed_at: completed ? '2026-08-18T01:00:00.000Z' : null,
    blockers: [],
  };
}

function fixtureDecision(change, question) {
  return `---\nschema_version: 1\nartifact: steelman-decision\nworkflow: person\nwork_id: person/steelman-deliberation\nchange: "${change}"\nstatus: completed\ndecision_type: recommend\ngenerated_at: "2026-08-18T01:00:00.000Z"\n---\n\n# 决策结论\n\n## 唯一关键问题\n\n${question}\n\n## 用户回答\n\n希望大家纪念人与人真诚链接这一最初理念。\n\n## 明确判断\n\n选择最初公开表达该理念的日期作为司庆日。\n\n## 决定性理由\n\n用户明确把长期共同纪念对象定义为理念，而不是法律实体。\n\n## 为什么另一边没有赢\n\n公司成立日更清晰，但不能像理念起点一样解释组织长期存在的理由；若未来改以制度连续性为首要目标，结论会反转。\n\n## 下一步行动\n\n| 动作 | 责任人 | 时机/截止 | 完成证据 |\n|---|---|---|---|\n| 将司庆日期与理念叙事写入公司制度 | 创始人与行政负责人 | 本月内 | 制度文件获批准并发布 |\n\n## 反转条件\n\n若组织正式使命不再承接该理念，改用法律实体成立日。\n\n## 置信度与剩余不确定性\n\n- **置信度**：高\n- **剩余不确定性**：未来成员对叙事的实际接受度仍需周年活动验证。\n`;
}

async function expectFailure(label, fn, expectedFragment) {
  try {
    await fn();
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    if (!error.message.includes(expectedFragment)) {
      fail(`self-check ${label}: expected error containing ${JSON.stringify(expectedFragment)}, got ${JSON.stringify(error.message)}`);
    }
    return;
  }
  fail(`self-check ${label}: expected validation failure`);
}

async function runSelfCheck() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'speculo-steelman-validator-'));
  try {
    const change = '2026-08-18-steelman-company-anniversary';
    const changeDir = path.join(root, change);
    await mkdir(changeDir, { recursive: true });
    const question = '假设十年以后多数成员都不了解创业起点，你最希望他们共同纪念的究竟是什么？';
    const stageDir = path.join(changeDir, '.steelman-stage');
    await mkdir(stageDir, { recursive: true });
    await writeFile(path.join(stageDir, 'steelman-dossier.md'), fixtureDossier(change, question));
    await writeFile(path.join(stageDir, '.status.json'), `${JSON.stringify(fixtureStatus(change, question), null, 2)}\n`);
    await validateChange({
      phase: 'awaiting-answer',
      changeDir,
      statusFile: path.join(stageDir, '.status.json'),
      dossierFile: path.join(stageDir, 'steelman-dossier.md'),
      decisionFile: null,
    });
    console.log('PASS staged awaiting-answer fixture');

    await writeFile(path.join(changeDir, 'steelman-dossier.md'), fixtureDossier(change, question));
    await writeFile(path.join(changeDir, '.status.json'), `${JSON.stringify(fixtureStatus(change, question), null, 2)}\n`);

    const awaiting = await validateChange({
      phase: 'awaiting-answer',
      changeDir,
      statusFile: null,
      dossierFile: null,
      decisionFile: null,
    });
    if (awaiting.question !== question) fail('self-check awaiting: question mismatch');
    console.log('PASS awaiting-answer fixture');

    await writeFile(path.join(stageDir, 'decision.md'), fixtureDecision(change, question));
    await writeFile(path.join(stageDir, '.status.json'), `${JSON.stringify(fixtureStatus(change, question, true), null, 2)}\n`);
    await validateChange({
      phase: 'completed',
      changeDir,
      statusFile: path.join(stageDir, '.status.json'),
      dossierFile: null,
      decisionFile: path.join(stageDir, 'decision.md'),
    });
    console.log('PASS staged completed fixture');

    await writeFile(path.join(changeDir, 'decision.md'), fixtureDecision(change, question));
    await writeFile(path.join(changeDir, '.status.json'), `${JSON.stringify(fixtureStatus(change, question, true), null, 2)}\n`);
    const completed = await validateChange({
      phase: 'completed',
      changeDir,
      statusFile: null,
      dossierFile: null,
      decisionFile: null,
    });
    if (completed.decisionType !== 'recommend') fail('self-check completed: decision type mismatch');
    console.log('PASS completed fixture');

    const alreadyAnswered = fixtureStatus(change, question, true);
    alreadyAnswered.key_question_asked = false;
    alreadyAnswered.question_disposition = 'already-answered';
    await writeFile(path.join(changeDir, '.status.json'), `${JSON.stringify(alreadyAnswered, null, 2)}\n`);
    await validateChange({
      phase: 'completed',
      changeDir,
      statusFile: null,
      dossierFile: null,
      decisionFile: null,
    });
    console.log('PASS completed fixture with already-answered question');

    validateDossier(fixtureMultiOptionDossier(change, question), 'valid-multi-option-dossier.md', change);
    console.log('PASS multi-option steelman fixture');

    await expectFailure(
      'incomplete multi-option block',
      async () => validateDossier(
        fixtureMultiOptionDossier(change, question).replace('#### 失败条件', '#### 缺失的失败条件'),
        'invalid-multi-option-dossier.md',
        change,
      ),
      'each option block is missing',
    );
    console.log('PASS rejects incomplete multi-option steelman');

    await expectFailure(
      'multiple questions',
      async () => validateDossier(fixtureDossier(change, '你更重视理念吗？还是更重视法律实体吗？'), 'invalid-dossier.md', change),
      'exactly one question mark',
    );
    console.log('PASS rejects multiple questions');

    await expectFailure(
      'evasive judgment',
      async () => validateDecision(
        fixtureDecision(change, question).replace('选择最初公开表达该理念的日期作为司庆日。', '两边都有道理。'),
        'invalid-decision.md',
        change,
        question,
        '希望大家纪念人与人真诚链接这一最初理念。',
      ),
      'evasive non-decision',
    );
    console.log('PASS rejects evasive judgment');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfCheck) {
    await runSelfCheck();
    console.log('Steelman validator self-check passed.');
    return;
  }
  const result = await validateChange(options);
  const suffix = result.decisionType ? ` decision_type=${result.decisionType}` : '';
  console.log(`PASS ${result.phase} change=${result.change}${suffix}`);
}

main().catch((error) => {
  const prefix = error instanceof ValidationError ? 'VALIDATION ERROR' : 'ERROR';
  console.error(`${prefix}: ${error.message}`);
  process.exitCode = 1;
});
