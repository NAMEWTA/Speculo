import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { parseFrontmatter } from "../../../../lib/speculo-runtime.mjs";

const digest = (text) => createHash("sha256").update(text).digest("hex");
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const isoDate = (value) => {
  if (typeof value !== "string") return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  return Boolean(parts && Number(parts[2]) >= 1 && Number(parts[2]) <= 12 && Number(parts[3]) >= 1 && Number(parts[3]) <= new Date(Date.UTC(Number(parts[1]), Number(parts[2]), 0)).getUTCDate() && Number(parts[4]) < 24 && Number(parts[5]) < 60 && Number(parts[6]) < 60 && Number.isFinite(Date.parse(value)));
};
const filled = (value) => typeof value === "string" && Boolean(value.trim()) && !/\[TODO|^<[^>]+>$/.test(value.trim());

export function learningPath(root, locator) {
  if (typeof locator !== "string" || !locator || locator.includes("\\") || locator.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("invalid Learning locator: " + locator);
  const base = resolve(root), target = resolve(base, ...locator.split("/"));
  if (!target.startsWith(base + sep)) throw new Error("Learning path escapes state root");
  let current = base;
  if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("linked Learning root");
  for (const part of locator.split("/")) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("linked Learning path: " + locator);
  }
  return target;
}

function markdowns(root) {
  if (!existsSync(root)) return [];
  if (lstatSync(root).isSymbolicLink()) throw new Error("linked Learning directory: " + root);
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = join(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error("linked Learning artifact: " + file);
    if (entry.isDirectory()) result.push(...markdowns(file));
    else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "INDEX.md") result.push(file);
  }
  return result;
}

function section(text, heading) {
  const lines = text.split(/\r?\n/), index = lines.findIndex((line) => line === "## " + heading);
  if (index < 0) return "";
  const end = lines.findIndex((line, current) => current > index && /^## /.test(line));
  return lines.slice(index + 1, end < 0 ? lines.length : end).join("\n").trim();
}

function declaredIds(text, prefix, label, errors) {
  const ids = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|") || !line.endsWith("|")) continue;
    const id = line.split("|")[1].trim().replace(/^\x60|\x60$/g, "");
    if (prefix.test(id)) ids.push(id);
  }
  if (new Set(ids).size !== ids.length) errors.push(label + ": duplicate declared IDs");
  return new Set(ids);
}

function checkIds(value, declared, label, errors, required = true) {
  if (!Array.isArray(value) || required && !value.length || value.some((id) => typeof id !== "string" || !idPattern.test(id)) || new Set(value).size !== value.length) {
    errors.push(label + ": requires unique declared IDs");
    return;
  }
  for (const id of value) if (!declared.has(id)) errors.push(label + ": unresolved ID " + id);
}

function loadMarkdown(file, errors) {
  try {
    const text = readFileSync(file, "utf8"), parsed = parseFrontmatter(text);
    return { text, meta: parsed.fields, body: parsed.body, file };
  } catch (error) { errors.push(file + ": " + error.message); return null; }
}

function checkLessonScope(meta, registry, label, errors) {
  if (!Array.isArray(meta.lesson_ids) || !Array.isArray(meta.objective_ids)) return;
  const objectives = new Set(meta.lesson_ids.flatMap((id) => registry.lessons.get(id)?.meta.objective_ids ?? []));
  if (meta.objective_ids.some((id) => !objectives.has(id))) errors.push(label + ": objectives are outside the referenced Lesson scope");
}

function referenceFile(changeRoot, reference) {
  if (typeof reference !== "string") throw new Error("artifact reference must be a string");
  const [locator, anchor, ...extra] = reference.split("#");
  if (extra.length || anchor !== undefined && !anchor) throw new Error("invalid artifact anchor");
  const file = learningPath(changeRoot, locator);
  if (!existsSync(file) || !lstatSync(file).isFile()) throw new Error("artifact is missing: " + reference);
  const text = readFileSync(file, "utf8");
  if (anchor) {
    const headings = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].trim());
    const slug = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
    if (!headings.some((heading) => heading === anchor || slug(heading) === anchor) && !text.includes('id="' + anchor + '"')) throw new Error("artifact anchor is missing: " + reference);
  }
  return { file, text, meta: parseFrontmatter(text).fields };
}

export function homeworkSubmissionDigest(text) {
  const review = /^## Review\r?$/m.exec(text);
  const submitted = review ? text.slice(0, review.index) : text;
  const markers = submitted.split(/\r?\n/).filter((line) => /^Submission:/i.test(line.trim()));
  if (markers.length !== 1 || markers[0] !== "Submission: ready") throw new Error("requires exactly one literal Submission: ready line");
  return digest(submitted);
}

function checkHomework(document, registry, errors) {
  const start = errors.length, { text, meta, file } = document;
  checkIds(meta.lesson_ids, registry.lessons, file + ": lesson_ids", errors);
  checkIds(meta.objective_ids, registry.objectives, file + ": objective_ids", errors);
  checkLessonScope(meta, registry, file, errors);
  if (meta.source_ids !== undefined) checkIds(meta.source_ids, registry.sources, file + ": source_ids", errors);
  if (!/^HW-\d{3}(?:-[a-z0-9]+)*$/.test(meta.homework_id ?? "") || !Number.isInteger(meta.attempt) || meta.attempt < 1) errors.push(file + ": invalid homework identity/attempt");
  if (meta.attempt > 1) {
    try {
      if (typeof meta.previous_attempt !== "string" || !meta.previous_attempt.startsWith("homework/")) throw new Error("previous_attempt requires a Homework artifact reference");
      const previous = referenceFile(registry.root, meta.previous_attempt);
      if (previous.file === file || previous.meta.homework_id !== meta.homework_id || previous.meta.attempt !== meta.attempt - 1) throw new Error("previous attempt identity/order mismatch");
    } catch (error) { errors.push(file + ": " + error.message); }
  }
  const review = /^## Review\r?$/m.exec(text);
  if (!review) return { reviewed: false, passed: false };
  let immediateResult;
  try {
    const reviewText = text.slice(review.index), fingerprint = /^Submitted content sha256: ([a-f0-9]{64})\r?$/m.exec(reviewText)?.[1];
    if ([...text.matchAll(/^## Review\r?$/gm)].length !== 1) throw new Error("Homework requires one append-only Review");
    if (fingerprint !== homeworkSubmissionDigest(text)) throw new Error("submitted Q/A bytes differ from Review fingerprint");
    const reviewedAt = /^Reviewed at: (.+)\r?$/m.exec(reviewText)?.[1]?.trim();
    if (!isoDate(reviewedAt) || Date.parse(reviewedAt) > Date.now()) throw new Error("Review requires its actual Reviewed at timestamp");
    const results = [...reviewText.matchAll(/^Immediate result: (.*)\r?$/gm)];
    immediateResult = results[0]?.[1]?.trim();
    if (results.length !== 1 || !["passed", "needs_review"].includes(immediateResult)) throw new Error("Review requires one explicit Immediate result: passed or needs_review");
    const rationales = [...reviewText.matchAll(/^Immediate rationale: (.*)\r?$/gm)];
    if (rationales.length !== 1 || !filled(rationales[0][1])) throw new Error("Review requires an Immediate rationale tied to its learning objectives");
    const questions = [...section(text.slice(0, review.index), "Questions").matchAll(/^###\s+Q(\d+)\b/gm)].map((match) => Number(match[1]));
    const items = [...reviewText.matchAll(/^### Review Q(\d+)\r?$/gm)];
    if (!questions.length || items.length !== questions.length || items.some((item, index) => Number(item[1]) !== questions[index])) throw new Error("Review must assess every submitted question once in order using ### Review Q<n>");
    const verdicts = items.map((item, index) => {
      const body = reviewText.slice(item.index + item[0].length, items[index + 1]?.index ?? reviewText.length);
      const values = [...body.matchAll(/^verdict: (.*)\r?$/gm)];
      const verdict = values[0]?.[1]?.trim();
      if (values.length !== 1 || !["correct", "partial", "incorrect", "uncertain"].includes(verdict)) throw new Error("Review Q" + item[1] + " requires one explicit verdict");
      if (!/Explain \(English\)/.test(body)) throw new Error("Review Q" + item[1] + " requires Explain (English)");
      return verdict;
    });
    if (immediateResult === "passed" && (!verdicts.some((verdict) => ["correct", "partial"].includes(verdict)) || verdicts.includes("uncertain"))) throw new Error("Immediate result passed lacks positive resolved Q/A evidence");
  } catch (error) { errors.push(file + ": " + error.message); }
  const reviewed = errors.length === start;
  return { reviewed, passed: reviewed && immediateResult === "passed" };
}

function checkReview(document, registry, errors) {
  const start = errors.length, { meta, text, file } = document;
  if (meta.artifact !== "learning-retention-review" || meta.owner_work !== "learning/review" || meta.change_id !== registry.id || !/^RV-[a-zA-Z0-9-]+$/.test(meta.review_id ?? "")) errors.push(file + ": invalid retention Review identity/owner");
  checkIds(meta.lesson_ids, registry.lessons, file + ": lesson_ids", errors);
  checkIds(meta.objective_ids, registry.objectives, file + ": objective_ids", errors);
  checkIds(meta.source_ids, registry.sources, file + ": source_ids", errors);
  checkLessonScope(meta, registry, file, errors);
  if (!["due", "passed", "needs_review"].includes(meta.retention)) errors.push(file + ": invalid retention result");
  if (meta.retention === "due" && meta.occurred_at !== null) errors.push(file + ": a scheduled Review must leave occurred_at null");
  try {
    if (typeof meta.previous_evidence !== "string" || !/^(?:lessons|homework|review)\//.test(meta.previous_evidence)) throw new Error("previous_evidence must name an actual Lesson/Homework/Review artifact");
    const prior = referenceFile(registry.root, meta.previous_evidence);
    if (prior.file === file) throw new Error("Review cannot cite itself as previous evidence");
    const priorLessons = prior.meta.lesson_id ? [prior.meta.lesson_id] : prior.meta.lesson_ids;
    if (!Array.isArray(priorLessons) || !Array.isArray(meta.lesson_ids) || meta.lesson_ids.some((id) => !priorLessons.includes(id)) || !Array.isArray(prior.meta.objective_ids) || !Array.isArray(meta.objective_ids) || meta.objective_ids.some((id) => !prior.meta.objective_ids.includes(id))) throw new Error("previous evidence does not cover this Review's Lessons/objectives");
    const recordedAt = prior.meta.occurred_at ?? /^Reviewed at: (.+)\r?$/m.exec(prior.text)?.[1]?.trim() ?? prior.meta.delivered_at;
    if (!isoDate(meta.previous_at) || meta.previous_at !== recordedAt) throw new Error("previous_at must match the actual referenced learning/review record");
  } catch (error) { errors.push(file + ": " + error.message); }
  if (!isoDate(meta.due_at) || !isoDate(meta.previous_at) || Date.parse(meta.due_at) <= Date.parse(meta.previous_at)) errors.push(file + ": due_at must establish a positive declared retention interval");
  if (meta.retention !== "due") {
    if (!isoDate(meta.occurred_at) || Date.parse(meta.occurred_at) > Date.now() || Date.parse(meta.occurred_at) <= Date.parse(meta.previous_at)) errors.push(file + ": actual review time must follow previous evidence and cannot be future");
    for (const heading of ["新回忆与迁移题", "学习者原始回答", "评审与证据"]) if (!filled(section(text, heading))) errors.push(file + ": missing actual " + heading);
    if (meta.retention === "passed" && Date.parse(meta.occurred_at) < Date.parse(meta.due_at)) errors.push(file + ": retention passed before the declared due time");
  }
  return errors.length === start && meta.retention === "passed";
}

function checkManifest(file, registries, errors) {
  const start = errors.length;
  let manifest;
  try { manifest = JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { errors.push(file + ": invalid source manifest: " + error.message); return null; }
  if (manifest.schema_version !== 1 || manifest.artifact !== "learning-synthesis-manifest" || !Array.isArray(manifest.claims) || !manifest.claims.length) {
    errors.push(file + ": expected learning-synthesis-manifest schema v1");
    return null;
  }
  const ids = new Set();
  for (const claim of manifest.claims) {
    if (!claim || typeof claim !== "object" || Array.isArray(claim)) { errors.push(file + ": each claim must be an object"); continue; }
    const label = file + ": " + claim.claim_id;
    if (!/^CLM-[A-Za-z0-9-]+$/.test(claim.claim_id ?? "") || ids.has(claim.claim_id)) errors.push(label + ": invalid/duplicate claim ID");
    ids.add(claim.claim_id);
    if (!["draft", "supported", "contested", "unresolved"].includes(claim.evidence_status) || !["unverified", "retention_verified", "mastered"].includes(claim.mastery)) errors.push(label + ": invalid evidence/mastery status");
    if (!Array.isArray(claim.sources) || !claim.sources.length || !Array.isArray(claim.unknowns) || claim.unknowns.some((item) => typeof item !== "string") || !(claim.verified_at === null || isoDate(claim.verified_at) && Date.parse(claim.verified_at) <= Date.now())) errors.push(label + ": sources, unknowns and actual verification time are required");
    for (const source of Array.isArray(claim.sources) ? claim.sources : []) {
      if (!source || typeof source !== "object") { errors.push(label + ": invalid source object"); continue; }
      const registry = registries.get(source.change_id);
      if (!registry) { errors.push(label + ": unresolved source Change " + source.change_id); continue; }
      try {
        const artifact = referenceFile(registry.root, source.artifact);
        if (!registry.sources.has(source.source_id)) throw new Error("unresolved external source " + source.source_id);
        checkIds(source.objective_ids, registry.objectives, label + ": source objective_ids", errors);
        if (Array.isArray(artifact.meta.objective_ids) && Array.isArray(source.objective_ids) && source.objective_ids.some((id) => !artifact.meta.objective_ids.includes(id))) throw new Error("source objectives are outside the referenced artifact scope");
      } catch (error) { errors.push(label + ": " + error.message); }
    }
    if (claim.mastery !== "unverified") {
      if (!Array.isArray(claim.retention_evidence) || !claim.retention_evidence.length) errors.push(label + ": mastery requires actual R evidence");
      const coverage = new Map();
      for (const evidence of Array.isArray(claim.retention_evidence) ? claim.retention_evidence : []) {
        if (!evidence || typeof evidence !== "object") { errors.push(label + ": invalid retention reference"); continue; }
        const registry = registries.get(evidence.change_id);
        try {
          if (!registry) throw new Error("unresolved retention Change");
          const reference = referenceFile(registry.root, evidence.artifact);
          if (!registry.passedReviews.has(reference.file)) throw new Error("mastery reference is not a verified R record");
          if (!Array.isArray(claim.sources) || !claim.sources.some((source) => source.change_id === evidence.change_id)) throw new Error("retention evidence belongs to an unrelated source Change");
          const objectives = coverage.get(evidence.change_id) ?? new Set();
          for (const id of reference.meta.objective_ids) objectives.add(id);
          coverage.set(evidence.change_id, objectives);
        } catch (error) { errors.push(label + ": " + error.message); }
      }
      for (const source of Array.isArray(claim.sources) ? claim.sources : []) if (Array.isArray(source?.objective_ids) && source.objective_ids.some((id) => !coverage.get(source.change_id)?.has(id))) errors.push(label + ": R evidence does not cover the claim's source objectives");
    }
  }
  return errors.length === start ? manifest : null;
}

export function validateLearningEvidence(stateRoot, entries, states, errors) {
  const registries = new Map();
  for (const entry of entries) {
    if (!states.has(entry.change_id)) continue;
    try {
      const root = learningPath(stateRoot, entry.locator);
      const course = existsSync(join(root, "course.md")) ? readFileSync(learningPath(root, "course.md"), "utf8") : "";
      const sources = existsSync(join(root, "sources.md")) ? readFileSync(learningPath(root, "sources.md"), "utf8") : "";
      const objectives = declaredIds(course, /^OBJ-[A-Za-z0-9-]+$/, entry.change_id + "/course.md", errors), sourceIds = declaredIds(sources, /^(?:S|SRC)-[A-Za-z0-9-]+$/, entry.change_id + "/sources.md", errors);
      const registry = { id: entry.change_id, root, objectives, sources: sourceIds, lessons: new Map(), homework: [], reviewedHomeworks: new Set(), passedHomeworks: new Set(), reviews: [], passedReviews: new Set() };
      for (const file of markdowns(join(root, "lessons"))) {
        const document = loadMarkdown(file, errors);
        if (!document) continue;
        const { meta } = document;
        if (registry.lessons.has(meta.lesson_id)) errors.push(file + ": duplicate Lesson ID");
        registry.lessons.set(meta.lesson_id, document);
        checkIds(meta.objective_ids, objectives, file + ": objective_ids", errors);
        checkIds(meta.source_ids, sourceIds, file + ": source_ids", errors);
        const budget = meta.time_budget;
        if (!Array.isArray(budget) || !budget.length || budget.some((item) => !item || !filled(item.segment) || typeof item.minutes !== "number" || !Number.isFinite(item.minutes) || item.minutes <= 0)) errors.push(file + ": time_budget requires named segments with positive numeric minutes");
        else if (Math.abs(budget.reduce((sum, item) => sum + item.minutes, 0) - meta.estimated_minutes) > 0.000001) errors.push(file + ": time_budget total does not match estimated_minutes");
        if (!isoDate(meta.delivered_at) || Date.parse(meta.delivered_at) > Date.now()) errors.push(file + ": delivered_at must record actual Lesson delivery");
      }
      for (const file of markdowns(join(root, "homework"))) {
        const document = loadMarkdown(file, errors);
        if (document) {
          registry.homework.push(document);
          const result = checkHomework(document, registry, errors);
          if (result.reviewed) registry.reviewedHomeworks.add(file);
          if (result.passed) registry.passedHomeworks.add(file);
        }
      }
      const reviewIds = new Set();
      for (const file of markdowns(join(root, "review"))) {
        const document = loadMarkdown(file, errors);
        if (!document) continue;
        if (reviewIds.has(document.meta.review_id)) errors.push(file + ": duplicate Review ID");
        reviewIds.add(document.meta.review_id);
        registry.reviews.push(document);
        if (checkReview(document, registry, errors)) registry.passedReviews.add(file);
      }
      const state = states.get(entry.change_id), evidence = state.mastery?.evidence;
      if (Array.isArray(evidence)) {
        let passed = 0, immediate = 0;
        for (const reference of evidence) {
          try {
            const file = referenceFile(root, reference).file;
            if (registry.passedReviews.has(file)) passed += 1;
            if (registry.passedHomeworks.has(file)) immediate += 1;
          }
          catch (error) { errors.push(entry.change_id + ": mastery evidence: " + error.message); }
        }
        if ((state.mastery.overall === "retention_verified" || state.mastery.retention === "passed") && !passed) errors.push(entry.change_id + ": retention_verified requires a real passed R Review");
        if ((state.mastery.overall === "immediate" || state.mastery.immediate === "passed") && !immediate) errors.push(entry.change_id + ": immediate requires an actual passed Homework Review, without requiring R");
      }
      if (state.homework?.status !== "none") {
        const homework = registry.homework.filter((document) => document.meta.homework_id === state.homework?.latest_id);
        if (!homework.length) errors.push(entry.change_id + ": homework projection has no actual latest_id");
        const latest = homework.sort((a, b) => b.meta.attempt - a.meta.attempt)[0];
        if (["reviewed", "needs_revision"].includes(state.homework?.status) && (!latest || !registry.reviewedHomeworks.has(latest.file))) errors.push(entry.change_id + ": homework projection requires actual Review evidence for the latest attempt");
        if (state.homework?.status === "needs_revision" && latest && registry.passedHomeworks.has(latest.file)) errors.push(entry.change_id + ": homework needs_revision contradicts its latest passed Review");
      }
      registries.set(entry.change_id, registry);
    } catch (error) { errors.push(entry.change_id + ": " + error.message); }
  }
  for (const registry of registries.values()) {
    const file = learningPath(registry.root, "synthesis/source-manifest.json");
    if (existsSync(file)) checkManifest(file, registries, errors);
  }
  const context = learningPath(stateRoot, "context/domains");
  if (!existsSync(context)) return;
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isSymbolicLink()) { errors.push("linked context entry: " + file); continue; }
      if (!entry.isDirectory()) continue;
      if (directory.endsWith(sep + "topics")) {
        const pointer = join(file, "provenance.json");
        if (!existsSync(pointer)) { errors.push(file + ": topic requires provenance.json"); continue; }
        try {
          if (lstatSync(pointer).isSymbolicLink()) throw new Error("linked topic provenance");
          const value = JSON.parse(readFileSync(pointer, "utf8")), source = registries.get(value.source_change_id);
          if (value.schema_version !== 1 || !source || value.source_manifest !== "synthesis/source-manifest.json") throw new Error("invalid topic source manifest reference");
          checkManifest(learningPath(source.root, value.source_manifest), registries, errors);
        } catch (error) { errors.push(file + ": " + error.message); }
      } else visit(file);
    }
  }
  visit(context);
}
