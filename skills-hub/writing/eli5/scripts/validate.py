#!/usr/bin/env python3
"""Read-only checks for eli5 1.1.0. Python >=3.10; PyYAML 6.x.

Checks structure and selected workflow invariants, NOT factual accuracy, learner
identity, actual submission intent, evidence truth, permissions, or transactions.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    raise SystemExit('Missing PyYAML. This optional checker requires scripts/requirements.txt.')

MAX_BYTES = 2 * 1024 * 1024
PHASES = {'preparing', 'teaching', 'awaiting_answers', 'exploring', 'blocked', 'completed'}
MODES = {'lesson', 'explain', 'explore', 'tutor'}


def text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def choice(value: Any, options: set[str]) -> bool:
    return isinstance(value, str) and value in options


def matches(pattern: str, value: Any) -> bool:
    return isinstance(value, str) and re.fullmatch(pattern, value) is not None


def strings(value: Any, *, empty: bool = False, unique: bool = False) -> bool:
    return (isinstance(value, list) and (empty or bool(value))
            and all(text(x) for x in value) and (not unique or len(value) == len(set(value))))


def positive_number(value: Any) -> bool:
    return type(value) in (int, float) and math.isfinite(value) and value > 0


def timestamp(value: Any) -> bool:
    if not text(value):
        return False
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return 'T' in value and parsed.tzinfo is not None and parsed.utcoffset() is not None
    except ValueError:
        return False


def safe_relative(value: Any) -> bool:
    return (text(value) and not value.startswith('/') and '\\' not in value and ':' not in value
            and not any(ord(c) < 32 or ord(c) == 127 for c in value)
            and all(part not in ('', '.', '..') for part in value.split('/')))


def own_path(value: Any) -> bool:
    return safe_relative(value) and value.startswith('eli5/')


def local_file(root: Path, relative: str) -> bool:
    if not safe_relative(relative):
        return False
    try:
        target = (root / relative).resolve(strict=True)
        target.relative_to(root.resolve(strict=True))
        return target.is_file()
    except (OSError, ValueError, RuntimeError):
        return False


def read_bytes(path: Path) -> bytes:
    with path.open('rb') as stream:
        content = stream.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise ValueError(f'Input exceeds {MAX_BYTES} bytes: {path}')
    return content


def unique_pairs(pairs: list[tuple[str, Any]]) -> dict:
    result = {}
    for key, value in pairs:
        if not isinstance(key, str) or key in result:
            raise ValueError(f'Duplicate or non-string mapping key: {key!r}')
        result[key] = value
    return result


class UniqueSafeLoader(yaml.SafeLoader):
    pass


def yaml_mapping(loader: UniqueSafeLoader, node: Any, deep: bool = False) -> dict:
    return unique_pairs([(loader.construct_object(k, deep=deep), loader.construct_object(v, deep=deep))
                         for k, v in node.value])


UniqueSafeLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, yaml_mapping)


def parse_document(content: str) -> tuple[dict, str]:
    if len(content.encode('utf-8')) > MAX_BYTES:
        raise ValueError('Markdown input exceeds size limit')
    m = re.match(r'\A---\r?\n(.*?)\r?\n---(?:\r?\n|\Z)', content, re.S)
    if not m:
        raise ValueError('Missing --- delimited YAML frontmatter')
    meta = yaml.load(m.group(1), Loader=UniqueSafeLoader)
    if not isinstance(meta, dict):
        raise ValueError('Frontmatter must be a mapping')
    return meta, content[m.end():]


def read_json(path: Path) -> Any:
    return json.loads(read_bytes(path).decode('utf-8'), object_pairs_hook=unique_pairs,
                      parse_constant=lambda x: (_ for _ in ()).throw(ValueError(f'Invalid JSON constant: {x}')))


def lines_outside_code(content: str) -> list[tuple[int, str]]:
    result, fence = [], None
    for index, line in enumerate(content.splitlines()):
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if marker:
            run = marker.group(1)
            if fence is None:
                fence = (run[0], len(run))
            elif run[0] == fence[0] and len(run) >= fence[1] and not line[marker.end():].strip():
                fence = None
            continue
        if fence is None:
            result.append((index, line))
    return result


def required(meta: dict, fields: list[str]) -> list[str]:
    return [f'Missing field: {field}' for field in fields if field not in meta]


def forbidden_fields(obj: Any) -> list[str]:
    pending, seen, errors = [obj], set(), []
    while pending:
        item = pending.pop()
        if not isinstance(item, (dict, list)) or id(item) in seen:
            continue
        seen.add(id(item))
        if isinstance(item, dict):
            errors.extend(f'Forbidden certification/scoring field: {k}' for k in item
                          if isinstance(k, str) and k.lower() in {'mastered', 'score', 'verdict'})
            pending.extend(item.values())
        else:
            pending.extend(item)
    return errors


def common(meta: dict) -> list[str]:
    errors = forbidden_fields(meta)
    for key in ('objective_ids', 'source_ids'):
        if not strings(meta.get(key), unique=True):
            errors.append(f'{key} must contain nonempty, unique string IDs')
    if strings(meta.get('objective_ids')) and any(not matches(r'O-\d{3,}', x) for x in meta['objective_ids']):
        errors.append('Invalid objective ID')
    if not choice(meta.get('expression_level'), {'eli5', 'plain'}):
        errors.append('Invalid expression_level')
    if not choice(meta.get('coverage_depth'), {'overview', 'standard', 'deep'}):
        errors.append('Invalid coverage_depth')
    return errors


def validate_skill(root: Path) -> list[str]:
    if not local_file(root, 'SKILL.md'):
        return ['Missing or unsafe SKILL.md']
    content = read_bytes(root / 'SKILL.md').decode('utf-8')
    meta, _ = parse_document(content)
    errors = required(meta, ['name', 'description'])
    allowed = {'name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'}
    errors += [f'Unknown skill frontmatter field: {key}' for key in meta if key not in allowed]
    name = meta.get('name')
    if not matches(r'[a-z0-9]+(?:-[a-z0-9]+)*', name) or len(name) > 64:
        errors.append('Invalid skill name')
    elif name != root.name:
        errors.append('Skill name must match directory name')
    if not text(meta.get('description')) or len(meta['description']) > 1024:
        errors.append('Description must contain 1..1024 characters')
    if 'compatibility' in meta and (not text(meta['compatibility']) or len(meta['compatibility']) > 500):
        errors.append('Invalid compatibility')
    if 'metadata' in meta and (not isinstance(meta['metadata'], dict)
            or not all(isinstance(k, str) and isinstance(v, str) for k, v in meta['metadata'].items())):
        errors.append('metadata must map strings to strings')
    if 'allowed-tools' in meta and not text(meta['allowed-tools']):
        errors.append('allowed-tools must be a nonempty string')
    if len(content.splitlines()) >= 500:
        errors.append('This package requires a main file under 500 lines')
    refs = set(re.findall(r'`((?:references|assets|scripts|examples|evals)/[\w./-]+\.(?:md|py|json))`', content))
    for ref in refs:
        if not local_file(root, ref):
            errors.append(f'Missing or unsafe local reference: {ref}')
    return errors


def validate_lesson(meta: Any, body: str) -> list[str]:
    if not isinstance(meta, dict):
        return ['Lesson metadata must be an object']
    errors = required(meta, ['lesson_id', 'objective_ids', 'estimated_minutes', 'time_budget',
                             'expression_level', 'coverage_depth', 'source_ids']) + common(meta)
    if not matches(r'LESSON-\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*', meta.get('lesson_id')):
        errors.append('Invalid lesson_id')
    estimate, budget = meta.get('estimated_minutes'), meta.get('time_budget')
    if not positive_number(estimate):
        errors.append('estimated_minutes must be a positive finite number')
    if not isinstance(budget, list) or not budget:
        errors.append('time_budget must be a nonempty list')
    else:
        valid = all(isinstance(x, dict) and text(x.get('activity')) and positive_number(x.get('minutes')) for x in budget)
        if not valid:
            errors.append('Each budget entry needs an activity and positive finite minutes')
        elif positive_number(estimate) and not math.isclose(sum(x['minutes'] for x in budget), estimate, rel_tol=0, abs_tol=1e-8):
            errors.append('Budget sum differs from estimated_minutes')
    if any(re.match(r'^## (Questions|Learner Answers|Inquiry Lesson)$|^### [QA]\d+$|^Response:', line)
           for _, line in lines_outside_code(body)):
        errors.append('Lesson must not contain learner Q/A or submission structures')
    return errors


def response_state(body: str) -> str | None:
    found = [line[len('Response: '):] for _, line in lines_outside_code(body) if line.startswith('Response: ')]
    return found[0] if len(found) == 1 else None


def validate_tutor(meta: Any, body: str) -> list[str]:
    if not isinstance(meta, dict):
        return ['Tutor metadata must be an object']
    errors = required(meta, ['inquiry_id', 'batch', 'lesson_unit_id', 'objective_ids', 'question_count',
                             'teaching_method', 'expression_level', 'coverage_depth', 'source_ids', 'created_at']) + common(meta)
    if not matches(r'IQ-\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*', meta.get('inquiry_id')):
        errors.append('Invalid inquiry_id')
    if type(meta.get('batch')) is not int or meta['batch'] < 1:
        errors.append('batch must be a positive integer')
    if not timestamp(meta.get('created_at')):
        errors.append('created_at needs an ISO timestamp with timezone')
    if not text(meta.get('teaching_method')):
        errors.append('teaching_method must be nonempty')
    n = meta.get('question_count')
    if type(n) is not int or n < 1:
        return errors + ['question_count must be a positive integer']
    lines = lines_outside_code(body)
    headings = {name: [i for i, line in lines if line == name] for name in
                ['## Questions', '## Learner Answers', '## Teaching', '## Inquiry Lesson']}
    if any(len(headings[h]) != 1 for h in ['## Questions', '## Learner Answers']):
        return errors + ['Questions and Learner Answers must each appear exactly once']
    q_start, a_start = headings['## Questions'][0], headings['## Learner Answers'][0]
    questions = [(i, int(m.group(1))) for i, line in lines if (m := re.fullmatch(r'### Q(\d+)', line))]
    answers = [(i, int(m.group(1))) for i, line in lines if (m := re.fullmatch(r'### A(\d+)', line))]
    for label, items in [('Q', questions), ('A', answers)]:
        if len(items) != n or any(value != index + 1 for index, (_, value) in enumerate(items)):
            errors.append(f'{label} headings must be exactly consecutive 1..question_count')
    responses = [(i, line) for i, line in lines if line.startswith('Response:')]
    if len(responses) != 1 or not matches(r'Response: (pending|ready|closed)', responses[0][1]):
        return errors + ['Exactly one valid unfenced Response line is required']
    r_index, r_line = responses[0]
    response = r_line.split(': ', 1)[1]
    if not q_start < a_start < r_index or any(not q_start < i < a_start for i, _ in questions) or any(not a_start < i < r_index for i, _ in answers):
        errors.append('Q/A sections or Response are out of order')
    for index, (start, number) in enumerate(questions):
        end = questions[index + 1][0] if index + 1 < len(questions) else a_start
        region = [line for row, line in lines if start < row < end]
        for field in ['objective_id', 'bloom_level', 'socratic_move', 'expected_evidence', 'difficulty']:
            values = [line[len(field) + 1:].strip() for line in region if line.startswith(field + ':')]
            if len(values) != 1 or not text(values[0]):
                errors.append(f'Q{number}: needs one nonempty {field}')
            elif field == 'objective_id' and (not strings(meta.get('objective_ids')) or values[0] not in meta['objective_ids']):
                errors.append(f'Q{number}: objective_id is not in objective_ids')
            elif field == 'bloom_level' and values[0] not in {'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'}:
                errors.append(f'Q{number}: invalid bloom_level')
    if response in {'ready', 'closed'}:
        raw = body.splitlines()
        answer_text = []
        for index, (start, _) in enumerate(answers):
            end = answers[index + 1][0] if index + 1 < len(answers) else r_index
            answer_text.extend(line for line in raw[start + 1:end] if line.strip() and not re.match(r'^\s*(`{3,}|~{3,})', line))
        if not answer_text:
            errors.append('Blank answers cannot be submitted or closed')
    teaching, inquiry = headings['## Teaching'], headings['## Inquiry Lesson']
    if response in {'pending', 'ready'} and (teaching or inquiry):
        errors.append('Pending/ready tutor must not contain Teaching or Inquiry Lesson')
    if response == 'closed' and not (len(teaching) == len(inquiry) == 1 and r_index < teaching[0] < inquiry[0]):
        errors.append('Closed tutor needs exactly one Teaching then Inquiry Lesson after Response')
    return errors


def validate_snapshot(ready: bytes, closed: bytes) -> list[str]:
    meta, body = parse_document(ready.decode('utf-8'))
    errors = validate_tutor(meta, body)
    if response_state(body) != 'ready':
        errors.append('Snapshot must be a ready tutor artifact')
    if errors:
        return ['Invalid ready snapshot: ' + x for x in errors]
    whole = ready.decode('utf-8')
    protocol = [i for i, line in lines_outside_code(whole) if line == 'Response: ready']
    if len(protocol) != 1:
        return ['Ready snapshot has ambiguous protocol line']
    pieces = ready.splitlines(keepends=True)
    row = protocol[0]
    pieces[row] = pieces[row].replace(b'Response: ready', b'Response: closed', 1)
    prefix = b''.join(pieces)
    if not closed.startswith(prefix):
        return ['Frozen metadata/Q/A bytes differ from ready snapshot']
    if not re.match(rb'\s*## Teaching(?:\r?\n|$)', closed[len(prefix):]):
        return ['Only appended Teaching content may follow the frozen prefix']
    return []


def validate_execution(meta: Any) -> list[str]:
    if not isinstance(meta, dict):
        return ['Execution metadata must be an object']
    errors = []
    if meta.get('record_type') != 'execution':
        errors.append('tested evidence must be an execution record, not a plan')
    if not timestamp(meta.get('executed_at')):
        errors.append('Execution record needs a timezone-aware executed_at')
    for field in ['environment', 'steps', 'inputs', 'observations', 'limitations']:
        if not text(meta.get(field)):
            errors.append(f'Execution record needs nonempty {field}')
    return errors


def validate_question_map(data: Any, root: Path | None = None) -> list[str]:
    if not isinstance(data, dict) or type(data.get('schema_version')) is not int or data['schema_version'] != 1 or not isinstance(data.get('questions'), list):
        return ['Question map requires schema_version=1 and a questions array']
    errors, nodes = [], {}
    fields = ['id', 'parent_id', 'origin', 'trigger', 'dimension', 'why_it_matters', 'gap_kind', 'status',
              'evidence_status', 'evidence', 'artifact', 'conclusion', 'verification']
    for pos, q in enumerate(data['questions']):
        tag = f'questions[{pos}]'
        if not isinstance(q, dict):
            errors.append(f'{tag}: must be an object')
            continue
        errors += [f'{tag}: {x}' for x in required(q, fields)]
        identifier = q.get('id')
        if not matches(r'P-\d{3,}', identifier):
            errors.append(f'{tag}: invalid id')
        elif identifier in nodes:
            errors.append(f'{tag}: duplicate id')
        else:
            nodes[identifier] = q
        for field in ['trigger', 'dimension', 'why_it_matters']:
            if not text(q.get(field)):
                errors.append(f'{tag}: nonempty {field} required')
        for field, options in [
            ('origin', {'user', 'answer', 'material', 'inference'}), ('gap_kind', {'potential', 'observed'}),
            ('status', {'open', 'exploring', 'resolved', 'needs_evidence', 'deferred'}),
            ('evidence_status', {'unverified', 'supported', 'tested'})]:
            if not choice(q.get(field), options):
                errors.append(f'{tag}: invalid {field}')
        evidence = q.get('evidence')
        if not strings(evidence, empty=True):
            errors.append(f'{tag}: evidence must be a string array')
        elif not evidence and (q.get('gap_kind') == 'observed' or choice(q.get('evidence_status'), {'supported', 'tested'})):
            errors.append(f'{tag}: evidence locations required')
        for field in ['conclusion', 'verification']:
            if not isinstance(q.get(field), str):
                errors.append(f'{tag}: {field} must be a string')
        if q.get('status') == 'resolved' and (not choice(q.get('evidence_status'), {'supported', 'tested'}) or not text(q.get('conclusion')) or not text(q.get('verification'))):
            errors.append(f'{tag}: resolved needs a supported conclusion and verification')
        artifact = q.get('artifact')
        if not safe_relative(artifact) or not matches(r'eli5/(?:inquiry/IQ-|explorations/EX-)[A-Za-z0-9-]+\.md', artifact):
            errors.append(f'{tag}: invalid artifact owner path')
        elif root is not None and not local_file(root, artifact):
            errors.append(f'{tag}: owner file missing or outside change root')
        if q.get('evidence_status') == 'tested':
            ref = q.get('test_evidence')
            if not safe_relative(ref) or not ref.startswith('eli5/evidence/') or not ref.endswith('.md'):
                errors.append(f'{tag}: tested requires a safe evidence Markdown path')
            elif root is not None:
                if not local_file(root, ref):
                    errors.append(f'{tag}: execution record missing or unsafe')
                else:
                    try:
                        meta, _ = parse_document(read_bytes(root / ref).decode('utf-8'))
                        errors += [f'{tag}: {x}' for x in validate_execution(meta)]
                    except (ValueError, OSError, yaml.YAMLError) as exc:
                        errors.append(f'{tag}: unreadable execution record: {exc}')
    for identifier, q in nodes.items():
        parent = q.get('parent_id')
        if parent is not None and (not isinstance(parent, str) or parent not in nodes):
            errors.append(f'{identifier}: parent_id does not exist')
    done = set()
    for identifier in nodes:
        trail, current = set(), identifier
        while isinstance(current, str) and current in nodes and current not in done:
            if current in trail:
                errors.append(f'{identifier}: parent cycle')
                break
            trail.add(current)
            current = nodes[current].get('parent_id')
        done.update(trail)
    return errors


def validate_exploration(meta: Any, body: str, qmap: Any = None, artifact_path: str | None = None) -> list[str]:
    if not isinstance(meta, dict):
        return ['Exploration metadata must be an object']
    errors = required(meta, ['exploration_id', 'mode', 'status', 'question_ids', 'focus_ids']) + forbidden_fields(meta)
    if not matches(r'EX-\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*', meta.get('exploration_id')):
        errors.append('Invalid exploration_id')
    if meta.get('mode') != 'explore' or not choice(meta.get('status'), {'active', 'blocked', 'closed'}):
        errors.append('Invalid exploration mode/status')
    qids, focus = meta.get('question_ids'), meta.get('focus_ids')
    if not strings(qids, unique=True) or not strings(focus, unique=True):
        errors.append('question_ids/focus_ids must contain unique nonempty string IDs')
    elif not set(focus).issubset(qids):
        errors.append('focus_ids must belong to question_ids')
    lines = [line for _, line in lines_outside_code(body)]
    needed = ['## Scope', '## Discovery', '## Deep Dive', '## Verification', '## Next']
    if any(lines.count(h) != 1 for h in needed):
        errors.append('Five exploration headings must each occur exactly once')
    elif [lines.index(h) for h in needed] != sorted(lines.index(h) for h in needed):
        errors.append('Exploration headings are out of order')
    if any(re.match(r'^Response:|^Submission:|^## Learner Answers$|^### A\d+$', line) for line in lines):
        errors.append('Exploration cannot contain learner answers/submission')
    if qmap is None:
        if meta.get('status') == 'closed':
            errors.append('Closed exploration requires its question map')
        return errors
    map_errors = validate_question_map(qmap)
    if map_errors:
        return errors + ['Invalid question map for exploration: ' + x for x in map_errors]
    if strings(qids) and strings(focus):
        nodes = {q['id']: q for q in qmap['questions']}
        owner = artifact_path or f"eli5/explorations/{meta.get('exploration_id')}.md"
        for identifier in qids:
            if identifier not in nodes:
                errors.append(f'Missing exploration question: {identifier}')
        for identifier in focus:
            q = nodes.get(identifier, {})
            if q.get('artifact') != owner:
                errors.append(f'Focus owner mismatch: {identifier}')
            if meta.get('status') == 'closed' and not choice(q.get('status'), {'resolved', 'needs_evidence', 'deferred'}):
                errors.append(f'Unfinished closed focus: {identifier}')
    return errors


def change_name(value: Any) -> bool:
    if not matches(r'\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*', value):
        return False
    try:
        date.fromisoformat(value[:10])
        return True
    except ValueError:
        return False


def validate_global(data: Any) -> list[str]:
    if not isinstance(data, dict) or type(data.get('schema_version')) is not int or data['schema_version'] != 1 or not isinstance(data.get('active'), list):
        return ['Global status requires schema_version=1 and active array']
    errors, seen = [], set()
    for item in data['active']:
        if not isinstance(item, dict):
            errors.append('Global active entry must be an object')
            continue
        if not change_name(item.get('change')) or not text(item.get('capability')) or not text(item.get('phase')) or not timestamp(item.get('updated_at')):
            errors.append('Invalid global active entry')
            continue
        key = (item['change'], item['capability'])
        if key in seen:
            errors.append('Duplicate global change/capability entry')
        seen.add(key)
        if item['capability'] == 'eli5' and not choice(item['phase'], PHASES - {'completed'}):
            errors.append('Invalid eli5 global phase; completed entries must be removed')
    return errors


def validate_state(data: Any, global_data: Any = None, root: Path | None = None) -> list[str]:
    if not isinstance(data, dict):
        return ['Change state must be an object']
    fields = ['schema_version', 'change', 'status', 'current_capability', 'phase', 'mode',
              'current_artifact', 'owned_artifacts', 'updated_at', 'blockers']
    errors = required(data, fields)
    if type(data.get('schema_version')) is not int or data.get('schema_version') != 1:
        errors.append('State schema_version must be integer 1')
    if not change_name(data.get('change')) or data.get('current_capability') != 'eli5':
        errors.append('Invalid change name or capability owner')
    status, phase, mode = data.get('status'), data.get('phase'), data.get('mode')
    if not choice(status, {'active', 'blocked', 'completed'}) or not choice(phase, PHASES) or not choice(mode, MODES):
        errors.append('Invalid state status, phase, or mode')
    else:
        expected = phase if phase in {'blocked', 'completed'} else 'active'
        if status != expected:
            errors.append('status and phase disagree')
        if phase == 'awaiting_answers' and mode != 'tutor' or phase == 'exploring' and mode != 'explore':
            errors.append('mode and phase disagree')
    if not timestamp(data.get('updated_at')):
        errors.append('updated_at needs a timezone-aware timestamp')
    blockers = data.get('blockers')
    if not strings(blockers, empty=True) or status == 'blocked' and not blockers:
        errors.append('blockers must be a string array, nonempty when blocked')
    owned = data.get('owned_artifacts')
    if not strings(owned, empty=True, unique=True) or any(not own_path(x) for x in owned):
        errors.append('owned_artifacts must be unique safe eli5 paths')
        owned = []
    current = data.get('current_artifact')
    if current is None:
        if not choice(phase, {'preparing', 'blocked'}):
            errors.append('current_artifact is required in this phase')
    elif not own_path(current) or current not in owned:
        errors.append('current_artifact must be an owned safe eli5 path')
    groups = {}
    for key in ['suspended_artifacts', 'abandoned_artifacts']:
        group = data.get(key, [])
        if not strings(group, empty=True, unique=True) or any(not own_path(x) or x not in owned for x in group):
            errors.append(f'{key} must contain owned unique safe paths')
            group = []
        groups[key] = group
    if set(groups['suspended_artifacts']) & set(groups['abandoned_artifacts']):
        errors.append('An artifact cannot be both suspended and abandoned')
    if isinstance(current, str) and current in groups['suspended_artifacts']:
        errors.append('Current artifact cannot simultaneously be suspended')
    if status == 'completed' and groups['suspended_artifacts']:
        errors.append('Cannot complete with suspended unanswered work')
    if root is not None:
        for ref in owned:
            if not local_file(root, ref):
                errors.append(f'Owned file missing or unsafe: {ref}')
        if status == 'completed':
            for ref in owned:
                if ref.startswith('eli5/inquiry/') and ref not in groups['abandoned_artifacts'] and local_file(root, ref):
                    try:
                        _, body = parse_document(read_bytes(root / ref).decode('utf-8'))
                        if response_state(body) in {'pending', 'ready'}:
                            errors.append(f'Cannot complete with unfinished tutor: {ref}')
                    except (ValueError, yaml.YAMLError, OSError) as exc:
                        errors.append(f'Cannot verify tutor completion: {exc}')
    if global_data is not None:
        ge = validate_global(global_data)
        errors += ge
        if not ge:
            current_entries = [x for x in global_data['active'] if x['change'] == data.get('change') and x['capability'] == 'eli5']
            if status == 'completed' and current_entries:
                errors.append('Completed change remains in global active index')
            elif status != 'completed':
                if len(current_entries) != 1:
                    errors.append('Active/blocked change needs exactly one global entry')
                elif current_entries[0]['phase'] != phase or current_entries[0]['updated_at'] != data.get('updated_at'):
                    errors.append('Global index and change state disagree')
                if any(x['change'] == data.get('change') and x['capability'] != 'eli5' for x in global_data['active']):
                    errors.append('Another capability is active on this change')
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['skill-dir', 'artifact', 'ready-snapshot', 'question-map', 'change-root', 'state', 'global-status']:
        parser.add_argument('--' + name, type=Path)
    args = parser.parse_args()
    if not any([args.skill_dir, args.artifact, args.question_map, args.state]):
        parser.error('Choose --skill-dir, --artifact, --question-map, or --state')
    if args.ready_snapshot and not args.artifact or args.global_status and not args.state:
        parser.error('--ready-snapshot requires --artifact; --global-status requires --state')
    errors, checks, not_checked = [], [], []
    try:
        qmap = read_json(args.question_map) if args.question_map else None
        if args.skill_dir:
            errors += validate_skill(args.skill_dir)
            checks.append('skill_metadata_and_local_references')
        if args.question_map:
            errors += validate_question_map(qmap, args.change_root)
            checks.append('question_map_types_evidence_paths_and_parent_graph')
            if not args.change_root:
                not_checked.append('question_map_reference_files_and_execution_record_contents')
        if args.state:
            global_data = read_json(args.global_status) if args.global_status else None
            errors += validate_state(read_json(args.state), global_data, args.change_root)
            checks.append('change_state_and_optional_global_index')
            if not args.global_status:
                not_checked.append('global_index_consistency')
            if not args.change_root:
                not_checked.append('owned_file_existence_and_unfinished_tutor_files')
        if args.artifact:
            raw = read_bytes(args.artifact)
            meta, body = parse_document(raw.decode('utf-8'))
            kinds = [key for key in ['lesson_id', 'inquiry_id', 'exploration_id'] if key in meta]
            if len(kinds) != 1:
                errors.append('Artifact must have exactly one supported type identifier')
            elif kinds[0] == 'lesson_id':
                errors += validate_lesson(meta, body)
                checks.append('lesson_metadata_budget_and_no_qa')
                if args.ready_snapshot:
                    errors.append('--ready-snapshot is only valid for a closed tutor artifact')
            elif kinds[0] == 'inquiry_id':
                errors += validate_tutor(meta, body)
                checks.append('tutor_metadata_questions_answers_and_response')
                if response_state(body) == 'closed':
                    if not args.ready_snapshot:
                        errors.append('Closed tutor requires --ready-snapshot for frozen-byte verification')
                    else:
                        errors += validate_snapshot(read_bytes(args.ready_snapshot), raw)
                        checks.append('frozen_ready_snapshot_bytes')
                elif args.ready_snapshot:
                    errors.append('--ready-snapshot is only valid for a closed tutor artifact')
            else:
                owner = None
                if args.change_root:
                    owner = args.artifact.resolve().relative_to(args.change_root.resolve()).as_posix()
                errors += validate_exploration(meta, body, qmap, owner)
                checks.append('exploration_structure_and_optional_question_map')
                if qmap is None:
                    not_checked.append('exploration_question_ids_ownership_and_statuses')
                if args.ready_snapshot:
                    errors.append('--ready-snapshot is only valid for a closed tutor artifact')
    except (ValueError, OSError, TypeError, OverflowError, RecursionError, yaml.YAMLError) as exc:
        errors.append(f'Input error: {exc}')
    result = {'ok': not errors, 'checks': checks, 'errors': errors, 'not_checked': not_checked,
              'limits': ['Structural checks are not teaching-quality or factual validation.',
                         'No authentication of learner intent, evidence truth, permissions, locks, or transactions.',
                         'No AI-host behavior or learning-effect evaluation is performed by this checker.']}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
