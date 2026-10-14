// Generated from the frozen SpecDev change-status v6 schema. Do not edit.
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/ucs2length.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports2.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// legacy-status-validator.generated.cjs
module.exports = validate20;
module.exports.default = validate20;
var schema31 = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "urn:speculo:specdev:change-status:v6", "title": "SpecDev Change Status", "type": "object", "required": ["schema_version", "artifact", "change", "change_status", "current_work", "works_run", "claimed_investigations", "execution_authorization", "leadership", "created_at", "updated_at", "completed_at", "archived", "archive_path", "blockers", "deviations", "worktrees"], "properties": { "schema_version": { "const": 6 }, "artifact": { "const": "change-status" }, "change": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$" }, "change_status": { "enum": ["active", "blocked", "completed", "archived"] }, "current_work": { "type": ["string", "null"], "pattern": "^specdev/" }, "works_run": { "type": "array", "items": { "type": "string", "pattern": "^specdev/" }, "uniqueItems": true }, "claimed_investigations": { "type": "array", "items": { "$ref": "#/$defs/claim" } }, "execution_authorization": { "$ref": "#/$defs/authorization" }, "leadership": { "$ref": "#/$defs/leadership" }, "created_at": { "type": "string", "minLength": 1 }, "updated_at": { "type": "string", "minLength": 1 }, "completed_at": { "type": ["string", "null"] }, "archived": { "type": "boolean" }, "archive_path": { "anyOf": [{ "type": "null" }, { "type": "string", "pattern": "^<Path>\\{roots\\.state\\}/specdev/archive/[^<]+</Path>$" }] }, "blockers": { "type": "array", "items": { "type": "string" } }, "deviations": { "type": "array", "items": { "type": "string" } }, "worktrees": { "type": "array", "items": { "$ref": "#/$defs/worktree" } } }, "$defs": { "claim": { "type": "object", "required": ["id", "owner", "session", "claimed_at"], "properties": { "id": { "type": "string", "minLength": 1 }, "owner": { "type": "string", "minLength": 1 }, "session": { "type": ["string", "null"] }, "claimed_at": { "type": "string", "minLength": 1 } }, "additionalProperties": false }, "authorization-entry": { "type": "object", "required": ["status", "source", "granted_at", "scope"], "properties": { "status": { "enum": ["authorized", "not-authorized", "revoked"] }, "source": { "type": ["string", "null"] }, "granted_at": { "type": ["string", "null"] }, "scope": { "type": "string", "minLength": 1 } }, "allOf": [{ "if": { "properties": { "status": { "const": "authorized" } }, "required": ["status"] }, "then": { "properties": { "source": { "type": "string", "minLength": 1 }, "granted_at": { "type": "string", "minLength": 1 } } } }], "additionalProperties": false }, "authorization": { "type": "object", "required": ["implementation_commit", "local_candidate_integration", "source_cleanup"], "properties": { "implementation_commit": { "$ref": "#/$defs/authorization-entry" }, "local_candidate_integration": { "$ref": "#/$defs/authorization-entry" }, "source_cleanup": { "$ref": "#/$defs/authorization-entry" } }, "additionalProperties": false }, "leadership-history": { "type": "object", "required": ["owner", "epoch", "assigned_at", "ended_at"], "properties": { "owner": { "type": "string", "minLength": 1 }, "epoch": { "type": "integer", "minimum": 1 }, "assigned_at": { "type": "string", "minLength": 1 }, "ended_at": { "type": "string", "minLength": 1 } }, "additionalProperties": false }, "leadership": { "type": "object", "required": ["current", "epoch", "assigned_at", "history"], "properties": { "current": { "type": "string", "minLength": 1 }, "epoch": { "type": "integer", "minimum": 1 }, "assigned_at": { "type": "string", "minLength": 1 }, "history": { "type": "array", "items": { "$ref": "#/$defs/leadership-history" } } }, "additionalProperties": false }, "full-suite": { "type": "object", "required": ["required", "status", "reason", "evidence"], "properties": { "required": { "type": "boolean" }, "status": { "enum": ["not-required", "pending", "passed", "failed"] }, "reason": { "type": ["string", "null"] }, "evidence": { "type": ["string", "null"] } }, "allOf": [{ "if": { "properties": { "required": { "const": false } }, "required": ["required"] }, "then": { "properties": { "status": { "const": "not-required" }, "reason": { "type": "string", "minLength": 1 } } } }], "additionalProperties": false }, "worktree": { "type": "object", "required": ["ticket_id", "owner", "implementation_owner", "integration_owner", "provider", "base_sha", "parent_branch", "branch", "workspace_ref", "source_checkpoint", "integration", "status", "updated_at"], "properties": { "ticket_id": { "type": "string", "pattern": "^T-[0-9]{2,}$" }, "owner": { "type": "string", "minLength": 1 }, "implementation_owner": { "type": "string", "minLength": 1 }, "integration_owner": { "type": "string", "minLength": 1 }, "provider": { "const": "git" }, "base_sha": { "type": "string", "minLength": 1 }, "parent_branch": { "type": "string", "minLength": 1 }, "branch": { "type": "string", "minLength": 1 }, "workspace_ref": { "type": "string", "pattern": "^(?:current|specdev-worktree/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,})$" }, "source_checkpoint": { "type": ["string", "null"] }, "integration": { "$ref": "#/$defs/integration" }, "status": { "enum": ["planned", "active", "review", "integrating", "integrated", "removed", "blocked"] }, "updated_at": { "type": "string", "minLength": 1 } }, "allOf": [{ "if": { "properties": { "workspace_ref": { "const": "current" } }, "required": ["workspace_ref"] }, "then": { "properties": { "integration": { "allOf": [{ "properties": { "candidate_sha": { "const": null }, "candidate_tree_sha": { "const": null }, "candidate_branch": { "const": null }, "candidate_workspace_ref": { "const": null }, "method": { "enum": [null, "direct-parent"] } } }] } } }, "else": { "properties": { "integration": { "allOf": [{ "properties": { "method": { "enum": [null, "fast-forward", "merge-commit"] } } }] } } } }], "additionalProperties": false }, "integration": { "type": "object", "required": ["status", "parent_ref", "parent_before_sha", "source_sha", "candidate_sha", "candidate_tree_sha", "candidate_branch", "candidate_workspace_ref", "result_sha", "method", "conflict_paths", "verification", "full_suite", "e2e", "evidence", "attempts", "promotion_status"], "properties": { "status": { "enum": ["pending", "candidate", "passed", "failed", "stale"] }, "parent_ref": { "type": ["string", "null"] }, "parent_before_sha": { "type": ["string", "null"] }, "source_sha": { "type": ["string", "null"] }, "candidate_sha": { "type": ["string", "null"] }, "candidate_tree_sha": { "type": ["string", "null"] }, "candidate_branch": { "type": ["string", "null"] }, "candidate_workspace_ref": { "anyOf": [{ "type": "null" }, { "type": "string", "pattern": "^specdev-worktree/\\.integration/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,}$" }] }, "result_sha": { "type": ["string", "null"] }, "method": { "enum": [null, "direct-parent", "fast-forward", "merge-commit"] }, "conflict_paths": { "type": "array", "items": { "type": "string" } }, "verification": { "enum": ["pending", "passed", "failed"] }, "full_suite": { "$ref": "#/$defs/full-suite" }, "e2e": { "$ref": "#/$defs/full-suite" }, "evidence": { "type": "string", "pattern": "^<Path>\\{roots\\.state\\}/specdev/changes/[^<]+/evidence/T-[0-9]{2,}\\.md</Path>$" }, "attempts": { "type": "integer", "minimum": 0 }, "promotion_status": { "enum": ["pending", "applying", "applied", "failed", "stale"] } }, "additionalProperties": false } }, "allOf": [{ "if": { "properties": { "change_status": { "const": "archived" } }, "required": ["change_status"] }, "then": { "properties": { "archived": { "const": true }, "archive_path": { "type": "string", "pattern": "^<Path>\\{roots\\.state\\}/specdev/archive/[^<]+</Path>$" } } } }], "additionalProperties": false };
var schema32 = { "type": "object", "required": ["id", "owner", "session", "claimed_at"], "properties": { "id": { "type": "string", "minLength": 1 }, "owner": { "type": "string", "minLength": 1 }, "session": { "type": ["string", "null"] }, "claimed_at": { "type": "string", "minLength": 1 } }, "additionalProperties": false };
var pattern4 = new RegExp("^<Path>\\{roots\\.state\\}/specdev/archive/[^<]+</Path>$", "u");
var pattern5 = new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$", "u");
var pattern6 = new RegExp("^specdev/", "u");
var func1 = Object.prototype.hasOwnProperty;
var func2 = require_ucs2length().default;
var schema34 = { "type": "object", "required": ["status", "source", "granted_at", "scope"], "properties": { "status": { "enum": ["authorized", "not-authorized", "revoked"] }, "source": { "type": ["string", "null"] }, "granted_at": { "type": ["string", "null"] }, "scope": { "type": "string", "minLength": 1 } }, "allOf": [{ "if": { "properties": { "status": { "const": "authorized" } }, "required": ["status"] }, "then": { "properties": { "source": { "type": "string", "minLength": 1 }, "granted_at": { "type": "string", "minLength": 1 } } } }], "additionalProperties": false };
function validate21(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate21.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.implementation_commit === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "implementation_commit" }, message: "must have required property 'implementation_commit'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.local_candidate_integration === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "local_candidate_integration" }, message: "must have required property 'local_candidate_integration'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.source_cleanup === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "source_cleanup" }, message: "must have required property 'source_cleanup'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "implementation_commit" || key0 === "local_candidate_integration" || key0 === "source_cleanup")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.implementation_commit !== void 0) {
      let data0 = data.implementation_commit;
      const _errs6 = errors;
      let valid3 = true;
      const _errs7 = errors;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        let missing0;
        if (data0.status === void 0 && (missing0 = "status")) {
          const err4 = {};
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        } else {
          if (data0.status !== void 0) {
            if ("authorized" !== data0.status) {
              const err5 = {};
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          }
        }
      }
      var _valid0 = _errs7 === errors;
      errors = _errs6;
      if (vErrors !== null) {
        if (_errs6) {
          vErrors.length = _errs6;
        } else {
          vErrors = null;
        }
      }
      if (_valid0) {
        const _errs9 = errors;
        if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
          if (data0.source !== void 0) {
            let data2 = data0.source;
            if (typeof data2 === "string") {
              if (func2(data2) < 1) {
                const err6 = { instancePath: instancePath + "/implementation_commit/source", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/source/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err6];
                } else {
                  vErrors.push(err6);
                }
                errors++;
              }
            } else {
              const err7 = { instancePath: instancePath + "/implementation_commit/source", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/source/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err7];
              } else {
                vErrors.push(err7);
              }
              errors++;
            }
          }
          if (data0.granted_at !== void 0) {
            let data3 = data0.granted_at;
            if (typeof data3 === "string") {
              if (func2(data3) < 1) {
                const err8 = { instancePath: instancePath + "/implementation_commit/granted_at", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/granted_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err8];
                } else {
                  vErrors.push(err8);
                }
                errors++;
              }
            } else {
              const err9 = { instancePath: instancePath + "/implementation_commit/granted_at", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/granted_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
          }
        }
        var _valid0 = _errs9 === errors;
        valid3 = _valid0;
        if (valid3) {
          var props0 = {};
          props0.source = true;
          props0.granted_at = true;
          props0.status = true;
        }
      }
      if (!valid3) {
        const err10 = { instancePath: instancePath + "/implementation_commit", schemaPath: "#/$defs/authorization-entry/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        if (data0.status === void 0) {
          const err11 = { instancePath: instancePath + "/implementation_commit", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        if (data0.source === void 0) {
          const err12 = { instancePath: instancePath + "/implementation_commit", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        if (data0.granted_at === void 0) {
          const err13 = { instancePath: instancePath + "/implementation_commit", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "granted_at" }, message: "must have required property 'granted_at'" };
          if (vErrors === null) {
            vErrors = [err13];
          } else {
            vErrors.push(err13);
          }
          errors++;
        }
        if (data0.scope === void 0) {
          const err14 = { instancePath: instancePath + "/implementation_commit", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "scope" }, message: "must have required property 'scope'" };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
        for (const key1 in data0) {
          if (!(key1 === "status" || key1 === "source" || key1 === "granted_at" || key1 === "scope")) {
            const err15 = { instancePath: instancePath + "/implementation_commit", schemaPath: "#/$defs/authorization-entry/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
        if (data0.status !== void 0) {
          let data4 = data0.status;
          if (!(data4 === "authorized" || data4 === "not-authorized" || data4 === "revoked")) {
            const err16 = { instancePath: instancePath + "/implementation_commit/status", schemaPath: "#/$defs/authorization-entry/properties/status/enum", keyword: "enum", params: { allowedValues: schema34.properties.status.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
        if (data0.source !== void 0) {
          let data5 = data0.source;
          if (typeof data5 !== "string" && data5 !== null) {
            const err17 = { instancePath: instancePath + "/implementation_commit/source", schemaPath: "#/$defs/authorization-entry/properties/source/type", keyword: "type", params: { type: schema34.properties.source.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
        }
        if (data0.granted_at !== void 0) {
          let data6 = data0.granted_at;
          if (typeof data6 !== "string" && data6 !== null) {
            const err18 = { instancePath: instancePath + "/implementation_commit/granted_at", schemaPath: "#/$defs/authorization-entry/properties/granted_at/type", keyword: "type", params: { type: schema34.properties.granted_at.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err18];
            } else {
              vErrors.push(err18);
            }
            errors++;
          }
        }
        if (data0.scope !== void 0) {
          let data7 = data0.scope;
          if (typeof data7 === "string") {
            if (func2(data7) < 1) {
              const err19 = { instancePath: instancePath + "/implementation_commit/scope", schemaPath: "#/$defs/authorization-entry/properties/scope/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
          } else {
            const err20 = { instancePath: instancePath + "/implementation_commit/scope", schemaPath: "#/$defs/authorization-entry/properties/scope/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
      } else {
        const err21 = { instancePath: instancePath + "/implementation_commit", schemaPath: "#/$defs/authorization-entry/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.local_candidate_integration !== void 0) {
      let data8 = data.local_candidate_integration;
      const _errs26 = errors;
      let valid9 = true;
      const _errs27 = errors;
      if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
        let missing1;
        if (data8.status === void 0 && (missing1 = "status")) {
          const err22 = {};
          if (vErrors === null) {
            vErrors = [err22];
          } else {
            vErrors.push(err22);
          }
          errors++;
        } else {
          if (data8.status !== void 0) {
            if ("authorized" !== data8.status) {
              const err23 = {};
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
          }
        }
      }
      var _valid1 = _errs27 === errors;
      errors = _errs26;
      if (vErrors !== null) {
        if (_errs26) {
          vErrors.length = _errs26;
        } else {
          vErrors = null;
        }
      }
      if (_valid1) {
        const _errs29 = errors;
        if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
          if (data8.source !== void 0) {
            let data10 = data8.source;
            if (typeof data10 === "string") {
              if (func2(data10) < 1) {
                const err24 = { instancePath: instancePath + "/local_candidate_integration/source", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/source/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err24];
                } else {
                  vErrors.push(err24);
                }
                errors++;
              }
            } else {
              const err25 = { instancePath: instancePath + "/local_candidate_integration/source", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/source/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
          }
          if (data8.granted_at !== void 0) {
            let data11 = data8.granted_at;
            if (typeof data11 === "string") {
              if (func2(data11) < 1) {
                const err26 = { instancePath: instancePath + "/local_candidate_integration/granted_at", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/granted_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            } else {
              const err27 = { instancePath: instancePath + "/local_candidate_integration/granted_at", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/granted_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err27];
              } else {
                vErrors.push(err27);
              }
              errors++;
            }
          }
        }
        var _valid1 = _errs29 === errors;
        valid9 = _valid1;
        if (valid9) {
          var props1 = {};
          props1.source = true;
          props1.granted_at = true;
          props1.status = true;
        }
      }
      if (!valid9) {
        const err28 = { instancePath: instancePath + "/local_candidate_integration", schemaPath: "#/$defs/authorization-entry/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
      if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
        if (data8.status === void 0) {
          const err29 = { instancePath: instancePath + "/local_candidate_integration", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
          if (vErrors === null) {
            vErrors = [err29];
          } else {
            vErrors.push(err29);
          }
          errors++;
        }
        if (data8.source === void 0) {
          const err30 = { instancePath: instancePath + "/local_candidate_integration", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
          if (vErrors === null) {
            vErrors = [err30];
          } else {
            vErrors.push(err30);
          }
          errors++;
        }
        if (data8.granted_at === void 0) {
          const err31 = { instancePath: instancePath + "/local_candidate_integration", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "granted_at" }, message: "must have required property 'granted_at'" };
          if (vErrors === null) {
            vErrors = [err31];
          } else {
            vErrors.push(err31);
          }
          errors++;
        }
        if (data8.scope === void 0) {
          const err32 = { instancePath: instancePath + "/local_candidate_integration", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "scope" }, message: "must have required property 'scope'" };
          if (vErrors === null) {
            vErrors = [err32];
          } else {
            vErrors.push(err32);
          }
          errors++;
        }
        for (const key2 in data8) {
          if (!(key2 === "status" || key2 === "source" || key2 === "granted_at" || key2 === "scope")) {
            const err33 = { instancePath: instancePath + "/local_candidate_integration", schemaPath: "#/$defs/authorization-entry/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err33];
            } else {
              vErrors.push(err33);
            }
            errors++;
          }
        }
        if (data8.status !== void 0) {
          let data12 = data8.status;
          if (!(data12 === "authorized" || data12 === "not-authorized" || data12 === "revoked")) {
            const err34 = { instancePath: instancePath + "/local_candidate_integration/status", schemaPath: "#/$defs/authorization-entry/properties/status/enum", keyword: "enum", params: { allowedValues: schema34.properties.status.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err34];
            } else {
              vErrors.push(err34);
            }
            errors++;
          }
        }
        if (data8.source !== void 0) {
          let data13 = data8.source;
          if (typeof data13 !== "string" && data13 !== null) {
            const err35 = { instancePath: instancePath + "/local_candidate_integration/source", schemaPath: "#/$defs/authorization-entry/properties/source/type", keyword: "type", params: { type: schema34.properties.source.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err35];
            } else {
              vErrors.push(err35);
            }
            errors++;
          }
        }
        if (data8.granted_at !== void 0) {
          let data14 = data8.granted_at;
          if (typeof data14 !== "string" && data14 !== null) {
            const err36 = { instancePath: instancePath + "/local_candidate_integration/granted_at", schemaPath: "#/$defs/authorization-entry/properties/granted_at/type", keyword: "type", params: { type: schema34.properties.granted_at.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err36];
            } else {
              vErrors.push(err36);
            }
            errors++;
          }
        }
        if (data8.scope !== void 0) {
          let data15 = data8.scope;
          if (typeof data15 === "string") {
            if (func2(data15) < 1) {
              const err37 = { instancePath: instancePath + "/local_candidate_integration/scope", schemaPath: "#/$defs/authorization-entry/properties/scope/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err37];
              } else {
                vErrors.push(err37);
              }
              errors++;
            }
          } else {
            const err38 = { instancePath: instancePath + "/local_candidate_integration/scope", schemaPath: "#/$defs/authorization-entry/properties/scope/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err38];
            } else {
              vErrors.push(err38);
            }
            errors++;
          }
        }
      } else {
        const err39 = { instancePath: instancePath + "/local_candidate_integration", schemaPath: "#/$defs/authorization-entry/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err39];
        } else {
          vErrors.push(err39);
        }
        errors++;
      }
    }
    if (data.source_cleanup !== void 0) {
      let data16 = data.source_cleanup;
      const _errs46 = errors;
      let valid15 = true;
      const _errs47 = errors;
      if (data16 && typeof data16 == "object" && !Array.isArray(data16)) {
        let missing2;
        if (data16.status === void 0 && (missing2 = "status")) {
          const err40 = {};
          if (vErrors === null) {
            vErrors = [err40];
          } else {
            vErrors.push(err40);
          }
          errors++;
        } else {
          if (data16.status !== void 0) {
            if ("authorized" !== data16.status) {
              const err41 = {};
              if (vErrors === null) {
                vErrors = [err41];
              } else {
                vErrors.push(err41);
              }
              errors++;
            }
          }
        }
      }
      var _valid2 = _errs47 === errors;
      errors = _errs46;
      if (vErrors !== null) {
        if (_errs46) {
          vErrors.length = _errs46;
        } else {
          vErrors = null;
        }
      }
      if (_valid2) {
        const _errs49 = errors;
        if (data16 && typeof data16 == "object" && !Array.isArray(data16)) {
          if (data16.source !== void 0) {
            let data18 = data16.source;
            if (typeof data18 === "string") {
              if (func2(data18) < 1) {
                const err42 = { instancePath: instancePath + "/source_cleanup/source", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/source/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err42];
                } else {
                  vErrors.push(err42);
                }
                errors++;
              }
            } else {
              const err43 = { instancePath: instancePath + "/source_cleanup/source", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/source/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err43];
              } else {
                vErrors.push(err43);
              }
              errors++;
            }
          }
          if (data16.granted_at !== void 0) {
            let data19 = data16.granted_at;
            if (typeof data19 === "string") {
              if (func2(data19) < 1) {
                const err44 = { instancePath: instancePath + "/source_cleanup/granted_at", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/granted_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err44];
                } else {
                  vErrors.push(err44);
                }
                errors++;
              }
            } else {
              const err45 = { instancePath: instancePath + "/source_cleanup/granted_at", schemaPath: "#/$defs/authorization-entry/allOf/0/then/properties/granted_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err45];
              } else {
                vErrors.push(err45);
              }
              errors++;
            }
          }
        }
        var _valid2 = _errs49 === errors;
        valid15 = _valid2;
        if (valid15) {
          var props2 = {};
          props2.source = true;
          props2.granted_at = true;
          props2.status = true;
        }
      }
      if (!valid15) {
        const err46 = { instancePath: instancePath + "/source_cleanup", schemaPath: "#/$defs/authorization-entry/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
        if (vErrors === null) {
          vErrors = [err46];
        } else {
          vErrors.push(err46);
        }
        errors++;
      }
      if (data16 && typeof data16 == "object" && !Array.isArray(data16)) {
        if (data16.status === void 0) {
          const err47 = { instancePath: instancePath + "/source_cleanup", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
          if (vErrors === null) {
            vErrors = [err47];
          } else {
            vErrors.push(err47);
          }
          errors++;
        }
        if (data16.source === void 0) {
          const err48 = { instancePath: instancePath + "/source_cleanup", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
          if (vErrors === null) {
            vErrors = [err48];
          } else {
            vErrors.push(err48);
          }
          errors++;
        }
        if (data16.granted_at === void 0) {
          const err49 = { instancePath: instancePath + "/source_cleanup", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "granted_at" }, message: "must have required property 'granted_at'" };
          if (vErrors === null) {
            vErrors = [err49];
          } else {
            vErrors.push(err49);
          }
          errors++;
        }
        if (data16.scope === void 0) {
          const err50 = { instancePath: instancePath + "/source_cleanup", schemaPath: "#/$defs/authorization-entry/required", keyword: "required", params: { missingProperty: "scope" }, message: "must have required property 'scope'" };
          if (vErrors === null) {
            vErrors = [err50];
          } else {
            vErrors.push(err50);
          }
          errors++;
        }
        for (const key3 in data16) {
          if (!(key3 === "status" || key3 === "source" || key3 === "granted_at" || key3 === "scope")) {
            const err51 = { instancePath: instancePath + "/source_cleanup", schemaPath: "#/$defs/authorization-entry/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err51];
            } else {
              vErrors.push(err51);
            }
            errors++;
          }
        }
        if (data16.status !== void 0) {
          let data20 = data16.status;
          if (!(data20 === "authorized" || data20 === "not-authorized" || data20 === "revoked")) {
            const err52 = { instancePath: instancePath + "/source_cleanup/status", schemaPath: "#/$defs/authorization-entry/properties/status/enum", keyword: "enum", params: { allowedValues: schema34.properties.status.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err52];
            } else {
              vErrors.push(err52);
            }
            errors++;
          }
        }
        if (data16.source !== void 0) {
          let data21 = data16.source;
          if (typeof data21 !== "string" && data21 !== null) {
            const err53 = { instancePath: instancePath + "/source_cleanup/source", schemaPath: "#/$defs/authorization-entry/properties/source/type", keyword: "type", params: { type: schema34.properties.source.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err53];
            } else {
              vErrors.push(err53);
            }
            errors++;
          }
        }
        if (data16.granted_at !== void 0) {
          let data22 = data16.granted_at;
          if (typeof data22 !== "string" && data22 !== null) {
            const err54 = { instancePath: instancePath + "/source_cleanup/granted_at", schemaPath: "#/$defs/authorization-entry/properties/granted_at/type", keyword: "type", params: { type: schema34.properties.granted_at.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err54];
            } else {
              vErrors.push(err54);
            }
            errors++;
          }
        }
        if (data16.scope !== void 0) {
          let data23 = data16.scope;
          if (typeof data23 === "string") {
            if (func2(data23) < 1) {
              const err55 = { instancePath: instancePath + "/source_cleanup/scope", schemaPath: "#/$defs/authorization-entry/properties/scope/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err55];
              } else {
                vErrors.push(err55);
              }
              errors++;
            }
          } else {
            const err56 = { instancePath: instancePath + "/source_cleanup/scope", schemaPath: "#/$defs/authorization-entry/properties/scope/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err56];
            } else {
              vErrors.push(err56);
            }
            errors++;
          }
        }
      } else {
        const err57 = { instancePath: instancePath + "/source_cleanup", schemaPath: "#/$defs/authorization-entry/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err57];
        } else {
          vErrors.push(err57);
        }
        errors++;
      }
    }
  } else {
    const err58 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err58];
    } else {
      vErrors.push(err58);
    }
    errors++;
  }
  validate21.errors = vErrors;
  return errors === 0;
}
validate21.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate23(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate23.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.current === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "current" }, message: "must have required property 'current'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.epoch === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "epoch" }, message: "must have required property 'epoch'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.assigned_at === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "assigned_at" }, message: "must have required property 'assigned_at'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.history === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "history" }, message: "must have required property 'history'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "current" || key0 === "epoch" || key0 === "assigned_at" || key0 === "history")) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.current !== void 0) {
      let data0 = data.current;
      if (typeof data0 === "string") {
        if (func2(data0) < 1) {
          const err5 = { instancePath: instancePath + "/current", schemaPath: "#/properties/current/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      } else {
        const err6 = { instancePath: instancePath + "/current", schemaPath: "#/properties/current/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.epoch !== void 0) {
      let data1 = data.epoch;
      if (!(typeof data1 == "number" && (!(data1 % 1) && !isNaN(data1)) && isFinite(data1))) {
        const err7 = { instancePath: instancePath + "/epoch", schemaPath: "#/properties/epoch/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (typeof data1 == "number" && isFinite(data1)) {
        if (data1 < 1 || isNaN(data1)) {
          const err8 = { instancePath: instancePath + "/epoch", schemaPath: "#/properties/epoch/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      }
    }
    if (data.assigned_at !== void 0) {
      let data2 = data.assigned_at;
      if (typeof data2 === "string") {
        if (func2(data2) < 1) {
          const err9 = { instancePath: instancePath + "/assigned_at", schemaPath: "#/properties/assigned_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      } else {
        const err10 = { instancePath: instancePath + "/assigned_at", schemaPath: "#/properties/assigned_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.history !== void 0) {
      let data3 = data.history;
      if (Array.isArray(data3)) {
        const len0 = data3.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data4 = data3[i0];
          if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
            if (data4.owner === void 0) {
              const err11 = { instancePath: instancePath + "/history/" + i0, schemaPath: "#/$defs/leadership-history/required", keyword: "required", params: { missingProperty: "owner" }, message: "must have required property 'owner'" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
            if (data4.epoch === void 0) {
              const err12 = { instancePath: instancePath + "/history/" + i0, schemaPath: "#/$defs/leadership-history/required", keyword: "required", params: { missingProperty: "epoch" }, message: "must have required property 'epoch'" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
            if (data4.assigned_at === void 0) {
              const err13 = { instancePath: instancePath + "/history/" + i0, schemaPath: "#/$defs/leadership-history/required", keyword: "required", params: { missingProperty: "assigned_at" }, message: "must have required property 'assigned_at'" };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
            if (data4.ended_at === void 0) {
              const err14 = { instancePath: instancePath + "/history/" + i0, schemaPath: "#/$defs/leadership-history/required", keyword: "required", params: { missingProperty: "ended_at" }, message: "must have required property 'ended_at'" };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
            for (const key1 in data4) {
              if (!(key1 === "owner" || key1 === "epoch" || key1 === "assigned_at" || key1 === "ended_at")) {
                const err15 = { instancePath: instancePath + "/history/" + i0, schemaPath: "#/$defs/leadership-history/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
              }
            }
            if (data4.owner !== void 0) {
              let data5 = data4.owner;
              if (typeof data5 === "string") {
                if (func2(data5) < 1) {
                  const err16 = { instancePath: instancePath + "/history/" + i0 + "/owner", schemaPath: "#/$defs/leadership-history/properties/owner/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err16];
                  } else {
                    vErrors.push(err16);
                  }
                  errors++;
                }
              } else {
                const err17 = { instancePath: instancePath + "/history/" + i0 + "/owner", schemaPath: "#/$defs/leadership-history/properties/owner/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data4.epoch !== void 0) {
              let data6 = data4.epoch;
              if (!(typeof data6 == "number" && (!(data6 % 1) && !isNaN(data6)) && isFinite(data6))) {
                const err18 = { instancePath: instancePath + "/history/" + i0 + "/epoch", schemaPath: "#/$defs/leadership-history/properties/epoch/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
              if (typeof data6 == "number" && isFinite(data6)) {
                if (data6 < 1 || isNaN(data6)) {
                  const err19 = { instancePath: instancePath + "/history/" + i0 + "/epoch", schemaPath: "#/$defs/leadership-history/properties/epoch/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
                  if (vErrors === null) {
                    vErrors = [err19];
                  } else {
                    vErrors.push(err19);
                  }
                  errors++;
                }
              }
            }
            if (data4.assigned_at !== void 0) {
              let data7 = data4.assigned_at;
              if (typeof data7 === "string") {
                if (func2(data7) < 1) {
                  const err20 = { instancePath: instancePath + "/history/" + i0 + "/assigned_at", schemaPath: "#/$defs/leadership-history/properties/assigned_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err20];
                  } else {
                    vErrors.push(err20);
                  }
                  errors++;
                }
              } else {
                const err21 = { instancePath: instancePath + "/history/" + i0 + "/assigned_at", schemaPath: "#/$defs/leadership-history/properties/assigned_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
            if (data4.ended_at !== void 0) {
              let data8 = data4.ended_at;
              if (typeof data8 === "string") {
                if (func2(data8) < 1) {
                  const err22 = { instancePath: instancePath + "/history/" + i0 + "/ended_at", schemaPath: "#/$defs/leadership-history/properties/ended_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err22];
                  } else {
                    vErrors.push(err22);
                  }
                  errors++;
                }
              } else {
                const err23 = { instancePath: instancePath + "/history/" + i0 + "/ended_at", schemaPath: "#/$defs/leadership-history/properties/ended_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
            }
          } else {
            const err24 = { instancePath: instancePath + "/history/" + i0, schemaPath: "#/$defs/leadership-history/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err24];
            } else {
              vErrors.push(err24);
            }
            errors++;
          }
        }
      } else {
        const err25 = { instancePath: instancePath + "/history", schemaPath: "#/properties/history/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
  } else {
    const err26 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err26];
    } else {
      vErrors.push(err26);
    }
    errors++;
  }
  validate23.errors = vErrors;
  return errors === 0;
}
validate23.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema39 = { "type": "object", "required": ["ticket_id", "owner", "implementation_owner", "integration_owner", "provider", "base_sha", "parent_branch", "branch", "workspace_ref", "source_checkpoint", "integration", "status", "updated_at"], "properties": { "ticket_id": { "type": "string", "pattern": "^T-[0-9]{2,}$" }, "owner": { "type": "string", "minLength": 1 }, "implementation_owner": { "type": "string", "minLength": 1 }, "integration_owner": { "type": "string", "minLength": 1 }, "provider": { "const": "git" }, "base_sha": { "type": "string", "minLength": 1 }, "parent_branch": { "type": "string", "minLength": 1 }, "branch": { "type": "string", "minLength": 1 }, "workspace_ref": { "type": "string", "pattern": "^(?:current|specdev-worktree/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,})$" }, "source_checkpoint": { "type": ["string", "null"] }, "integration": { "$ref": "#/$defs/integration" }, "status": { "enum": ["planned", "active", "review", "integrating", "integrated", "removed", "blocked"] }, "updated_at": { "type": "string", "minLength": 1 } }, "allOf": [{ "if": { "properties": { "workspace_ref": { "const": "current" } }, "required": ["workspace_ref"] }, "then": { "properties": { "integration": { "allOf": [{ "properties": { "candidate_sha": { "const": null }, "candidate_tree_sha": { "const": null }, "candidate_branch": { "const": null }, "candidate_workspace_ref": { "const": null }, "method": { "enum": [null, "direct-parent"] } } }] } } }, "else": { "properties": { "integration": { "allOf": [{ "properties": { "method": { "enum": [null, "fast-forward", "merge-commit"] } } }] } } } }], "additionalProperties": false };
var pattern9 = new RegExp("^T-[0-9]{2,}$", "u");
var pattern10 = new RegExp("^(?:current|specdev-worktree/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,})$", "u");
var schema40 = { "type": "object", "required": ["status", "parent_ref", "parent_before_sha", "source_sha", "candidate_sha", "candidate_tree_sha", "candidate_branch", "candidate_workspace_ref", "result_sha", "method", "conflict_paths", "verification", "full_suite", "e2e", "evidence", "attempts", "promotion_status"], "properties": { "status": { "enum": ["pending", "candidate", "passed", "failed", "stale"] }, "parent_ref": { "type": ["string", "null"] }, "parent_before_sha": { "type": ["string", "null"] }, "source_sha": { "type": ["string", "null"] }, "candidate_sha": { "type": ["string", "null"] }, "candidate_tree_sha": { "type": ["string", "null"] }, "candidate_branch": { "type": ["string", "null"] }, "candidate_workspace_ref": { "anyOf": [{ "type": "null" }, { "type": "string", "pattern": "^specdev-worktree/\\.integration/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,}$" }] }, "result_sha": { "type": ["string", "null"] }, "method": { "enum": [null, "direct-parent", "fast-forward", "merge-commit"] }, "conflict_paths": { "type": "array", "items": { "type": "string" } }, "verification": { "enum": ["pending", "passed", "failed"] }, "full_suite": { "$ref": "#/$defs/full-suite" }, "e2e": { "$ref": "#/$defs/full-suite" }, "evidence": { "type": "string", "pattern": "^<Path>\\{roots\\.state\\}/specdev/changes/[^<]+/evidence/T-[0-9]{2,}\\.md</Path>$" }, "attempts": { "type": "integer", "minimum": 0 }, "promotion_status": { "enum": ["pending", "applying", "applied", "failed", "stale"] } }, "additionalProperties": false };
var schema41 = { "type": "object", "required": ["required", "status", "reason", "evidence"], "properties": { "required": { "type": "boolean" }, "status": { "enum": ["not-required", "pending", "passed", "failed"] }, "reason": { "type": ["string", "null"] }, "evidence": { "type": ["string", "null"] } }, "allOf": [{ "if": { "properties": { "required": { "const": false } }, "required": ["required"] }, "then": { "properties": { "status": { "const": "not-required" }, "reason": { "type": "string", "minLength": 1 } } } }], "additionalProperties": false };
var pattern11 = new RegExp("^specdev-worktree/\\.integration/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,}$", "u");
var pattern12 = new RegExp("^<Path>\\{roots\\.state\\}/specdev/changes/[^<]+/evidence/T-[0-9]{2,}\\.md</Path>$", "u");
function validate26(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate26.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.status === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.parent_ref === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "parent_ref" }, message: "must have required property 'parent_ref'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.parent_before_sha === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "parent_before_sha" }, message: "must have required property 'parent_before_sha'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.source_sha === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "source_sha" }, message: "must have required property 'source_sha'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.candidate_sha === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "candidate_sha" }, message: "must have required property 'candidate_sha'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.candidate_tree_sha === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "candidate_tree_sha" }, message: "must have required property 'candidate_tree_sha'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.candidate_branch === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "candidate_branch" }, message: "must have required property 'candidate_branch'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.candidate_workspace_ref === void 0) {
      const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "candidate_workspace_ref" }, message: "must have required property 'candidate_workspace_ref'" };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data.result_sha === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "result_sha" }, message: "must have required property 'result_sha'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.method === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "method" }, message: "must have required property 'method'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (data.conflict_paths === void 0) {
      const err10 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "conflict_paths" }, message: "must have required property 'conflict_paths'" };
      if (vErrors === null) {
        vErrors = [err10];
      } else {
        vErrors.push(err10);
      }
      errors++;
    }
    if (data.verification === void 0) {
      const err11 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "verification" }, message: "must have required property 'verification'" };
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
    if (data.full_suite === void 0) {
      const err12 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "full_suite" }, message: "must have required property 'full_suite'" };
      if (vErrors === null) {
        vErrors = [err12];
      } else {
        vErrors.push(err12);
      }
      errors++;
    }
    if (data.e2e === void 0) {
      const err13 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "e2e" }, message: "must have required property 'e2e'" };
      if (vErrors === null) {
        vErrors = [err13];
      } else {
        vErrors.push(err13);
      }
      errors++;
    }
    if (data.evidence === void 0) {
      const err14 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
      if (vErrors === null) {
        vErrors = [err14];
      } else {
        vErrors.push(err14);
      }
      errors++;
    }
    if (data.attempts === void 0) {
      const err15 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "attempts" }, message: "must have required property 'attempts'" };
      if (vErrors === null) {
        vErrors = [err15];
      } else {
        vErrors.push(err15);
      }
      errors++;
    }
    if (data.promotion_status === void 0) {
      const err16 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "promotion_status" }, message: "must have required property 'promotion_status'" };
      if (vErrors === null) {
        vErrors = [err16];
      } else {
        vErrors.push(err16);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func1.call(schema40.properties, key0)) {
        const err17 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.status !== void 0) {
      let data0 = data.status;
      if (!(data0 === "pending" || data0 === "candidate" || data0 === "passed" || data0 === "failed" || data0 === "stale")) {
        const err18 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/enum", keyword: "enum", params: { allowedValues: schema40.properties.status.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.parent_ref !== void 0) {
      let data1 = data.parent_ref;
      if (typeof data1 !== "string" && data1 !== null) {
        const err19 = { instancePath: instancePath + "/parent_ref", schemaPath: "#/properties/parent_ref/type", keyword: "type", params: { type: schema40.properties.parent_ref.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
    if (data.parent_before_sha !== void 0) {
      let data2 = data.parent_before_sha;
      if (typeof data2 !== "string" && data2 !== null) {
        const err20 = { instancePath: instancePath + "/parent_before_sha", schemaPath: "#/properties/parent_before_sha/type", keyword: "type", params: { type: schema40.properties.parent_before_sha.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
    }
    if (data.source_sha !== void 0) {
      let data3 = data.source_sha;
      if (typeof data3 !== "string" && data3 !== null) {
        const err21 = { instancePath: instancePath + "/source_sha", schemaPath: "#/properties/source_sha/type", keyword: "type", params: { type: schema40.properties.source_sha.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.candidate_sha !== void 0) {
      let data4 = data.candidate_sha;
      if (typeof data4 !== "string" && data4 !== null) {
        const err22 = { instancePath: instancePath + "/candidate_sha", schemaPath: "#/properties/candidate_sha/type", keyword: "type", params: { type: schema40.properties.candidate_sha.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
    if (data.candidate_tree_sha !== void 0) {
      let data5 = data.candidate_tree_sha;
      if (typeof data5 !== "string" && data5 !== null) {
        const err23 = { instancePath: instancePath + "/candidate_tree_sha", schemaPath: "#/properties/candidate_tree_sha/type", keyword: "type", params: { type: schema40.properties.candidate_tree_sha.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
    if (data.candidate_branch !== void 0) {
      let data6 = data.candidate_branch;
      if (typeof data6 !== "string" && data6 !== null) {
        const err24 = { instancePath: instancePath + "/candidate_branch", schemaPath: "#/properties/candidate_branch/type", keyword: "type", params: { type: schema40.properties.candidate_branch.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.candidate_workspace_ref !== void 0) {
      let data7 = data.candidate_workspace_ref;
      const _errs16 = errors;
      let valid1 = false;
      const _errs17 = errors;
      if (data7 !== null) {
        const err25 = { instancePath: instancePath + "/candidate_workspace_ref", schemaPath: "#/properties/candidate_workspace_ref/anyOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
      var _valid0 = _errs17 === errors;
      valid1 = valid1 || _valid0;
      const _errs19 = errors;
      if (typeof data7 === "string") {
        if (!pattern11.test(data7)) {
          const err26 = { instancePath: instancePath + "/candidate_workspace_ref", schemaPath: "#/properties/candidate_workspace_ref/anyOf/1/pattern", keyword: "pattern", params: { pattern: "^specdev-worktree/\\.integration/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,}$" }, message: 'must match pattern "^specdev-worktree/\\.integration/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,}$"' };
          if (vErrors === null) {
            vErrors = [err26];
          } else {
            vErrors.push(err26);
          }
          errors++;
        }
      } else {
        const err27 = { instancePath: instancePath + "/candidate_workspace_ref", schemaPath: "#/properties/candidate_workspace_ref/anyOf/1/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err27];
        } else {
          vErrors.push(err27);
        }
        errors++;
      }
      var _valid0 = _errs19 === errors;
      valid1 = valid1 || _valid0;
      if (!valid1) {
        const err28 = { instancePath: instancePath + "/candidate_workspace_ref", schemaPath: "#/properties/candidate_workspace_ref/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      } else {
        errors = _errs16;
        if (vErrors !== null) {
          if (_errs16) {
            vErrors.length = _errs16;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.result_sha !== void 0) {
      let data8 = data.result_sha;
      if (typeof data8 !== "string" && data8 !== null) {
        const err29 = { instancePath: instancePath + "/result_sha", schemaPath: "#/properties/result_sha/type", keyword: "type", params: { type: schema40.properties.result_sha.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err29];
        } else {
          vErrors.push(err29);
        }
        errors++;
      }
    }
    if (data.method !== void 0) {
      let data9 = data.method;
      if (!(data9 === null || data9 === "direct-parent" || data9 === "fast-forward" || data9 === "merge-commit")) {
        const err30 = { instancePath: instancePath + "/method", schemaPath: "#/properties/method/enum", keyword: "enum", params: { allowedValues: schema40.properties.method.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err30];
        } else {
          vErrors.push(err30);
        }
        errors++;
      }
    }
    if (data.conflict_paths !== void 0) {
      let data10 = data.conflict_paths;
      if (Array.isArray(data10)) {
        const len0 = data10.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data10[i0] !== "string") {
            const err31 = { instancePath: instancePath + "/conflict_paths/" + i0, schemaPath: "#/properties/conflict_paths/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
      } else {
        const err32 = { instancePath: instancePath + "/conflict_paths", schemaPath: "#/properties/conflict_paths/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
    }
    if (data.verification !== void 0) {
      let data12 = data.verification;
      if (!(data12 === "pending" || data12 === "passed" || data12 === "failed")) {
        const err33 = { instancePath: instancePath + "/verification", schemaPath: "#/properties/verification/enum", keyword: "enum", params: { allowedValues: schema40.properties.verification.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err33];
        } else {
          vErrors.push(err33);
        }
        errors++;
      }
    }
    if (data.full_suite !== void 0) {
      let data13 = data.full_suite;
      const _errs33 = errors;
      let valid6 = true;
      const _errs34 = errors;
      if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
        let missing0;
        if (data13.required === void 0 && (missing0 = "required")) {
          const err34 = {};
          if (vErrors === null) {
            vErrors = [err34];
          } else {
            vErrors.push(err34);
          }
          errors++;
        } else {
          if (data13.required !== void 0) {
            if (false !== data13.required) {
              const err35 = {};
              if (vErrors === null) {
                vErrors = [err35];
              } else {
                vErrors.push(err35);
              }
              errors++;
            }
          }
        }
      }
      var _valid1 = _errs34 === errors;
      errors = _errs33;
      if (vErrors !== null) {
        if (_errs33) {
          vErrors.length = _errs33;
        } else {
          vErrors = null;
        }
      }
      if (_valid1) {
        const _errs36 = errors;
        if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
          if (data13.status !== void 0) {
            if ("not-required" !== data13.status) {
              const err36 = { instancePath: instancePath + "/full_suite/status", schemaPath: "#/$defs/full-suite/allOf/0/then/properties/status/const", keyword: "const", params: { allowedValue: "not-required" }, message: "must be equal to constant" };
              if (vErrors === null) {
                vErrors = [err36];
              } else {
                vErrors.push(err36);
              }
              errors++;
            }
          }
          if (data13.reason !== void 0) {
            let data16 = data13.reason;
            if (typeof data16 === "string") {
              if (func2(data16) < 1) {
                const err37 = { instancePath: instancePath + "/full_suite/reason", schemaPath: "#/$defs/full-suite/allOf/0/then/properties/reason/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err37];
                } else {
                  vErrors.push(err37);
                }
                errors++;
              }
            } else {
              const err38 = { instancePath: instancePath + "/full_suite/reason", schemaPath: "#/$defs/full-suite/allOf/0/then/properties/reason/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err38];
              } else {
                vErrors.push(err38);
              }
              errors++;
            }
          }
        }
        var _valid1 = _errs36 === errors;
        valid6 = _valid1;
        if (valid6) {
          var props0 = {};
          props0.status = true;
          props0.reason = true;
          props0.required = true;
        }
      }
      if (!valid6) {
        const err39 = { instancePath: instancePath + "/full_suite", schemaPath: "#/$defs/full-suite/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
        if (vErrors === null) {
          vErrors = [err39];
        } else {
          vErrors.push(err39);
        }
        errors++;
      }
      if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
        if (data13.required === void 0) {
          const err40 = { instancePath: instancePath + "/full_suite", schemaPath: "#/$defs/full-suite/required", keyword: "required", params: { missingProperty: "required" }, message: "must have required property 'required'" };
          if (vErrors === null) {
            vErrors = [err40];
          } else {
            vErrors.push(err40);
          }
          errors++;
        }
        if (data13.status === void 0) {
          const err41 = { instancePath: instancePath + "/full_suite", schemaPath: "#/$defs/full-suite/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
          if (vErrors === null) {
            vErrors = [err41];
          } else {
            vErrors.push(err41);
          }
          errors++;
        }
        if (data13.reason === void 0) {
          const err42 = { instancePath: instancePath + "/full_suite", schemaPath: "#/$defs/full-suite/required", keyword: "required", params: { missingProperty: "reason" }, message: "must have required property 'reason'" };
          if (vErrors === null) {
            vErrors = [err42];
          } else {
            vErrors.push(err42);
          }
          errors++;
        }
        if (data13.evidence === void 0) {
          const err43 = { instancePath: instancePath + "/full_suite", schemaPath: "#/$defs/full-suite/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
          if (vErrors === null) {
            vErrors = [err43];
          } else {
            vErrors.push(err43);
          }
          errors++;
        }
        for (const key1 in data13) {
          if (!(key1 === "required" || key1 === "status" || key1 === "reason" || key1 === "evidence")) {
            const err44 = { instancePath: instancePath + "/full_suite", schemaPath: "#/$defs/full-suite/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          }
        }
        if (data13.required !== void 0) {
          if (typeof data13.required !== "boolean") {
            const err45 = { instancePath: instancePath + "/full_suite/required", schemaPath: "#/$defs/full-suite/properties/required/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
            if (vErrors === null) {
              vErrors = [err45];
            } else {
              vErrors.push(err45);
            }
            errors++;
          }
        }
        if (data13.status !== void 0) {
          let data18 = data13.status;
          if (!(data18 === "not-required" || data18 === "pending" || data18 === "passed" || data18 === "failed")) {
            const err46 = { instancePath: instancePath + "/full_suite/status", schemaPath: "#/$defs/full-suite/properties/status/enum", keyword: "enum", params: { allowedValues: schema41.properties.status.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err46];
            } else {
              vErrors.push(err46);
            }
            errors++;
          }
        }
        if (data13.reason !== void 0) {
          let data19 = data13.reason;
          if (typeof data19 !== "string" && data19 !== null) {
            const err47 = { instancePath: instancePath + "/full_suite/reason", schemaPath: "#/$defs/full-suite/properties/reason/type", keyword: "type", params: { type: schema41.properties.reason.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err47];
            } else {
              vErrors.push(err47);
            }
            errors++;
          }
        }
        if (data13.evidence !== void 0) {
          let data20 = data13.evidence;
          if (typeof data20 !== "string" && data20 !== null) {
            const err48 = { instancePath: instancePath + "/full_suite/evidence", schemaPath: "#/$defs/full-suite/properties/evidence/type", keyword: "type", params: { type: schema41.properties.evidence.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err48];
            } else {
              vErrors.push(err48);
            }
            errors++;
          }
        }
      } else {
        const err49 = { instancePath: instancePath + "/full_suite", schemaPath: "#/$defs/full-suite/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err49];
        } else {
          vErrors.push(err49);
        }
        errors++;
      }
    }
    if (data.e2e !== void 0) {
      let data21 = data.e2e;
      const _errs52 = errors;
      let valid12 = true;
      const _errs53 = errors;
      if (data21 && typeof data21 == "object" && !Array.isArray(data21)) {
        let missing1;
        if (data21.required === void 0 && (missing1 = "required")) {
          const err50 = {};
          if (vErrors === null) {
            vErrors = [err50];
          } else {
            vErrors.push(err50);
          }
          errors++;
        } else {
          if (data21.required !== void 0) {
            if (false !== data21.required) {
              const err51 = {};
              if (vErrors === null) {
                vErrors = [err51];
              } else {
                vErrors.push(err51);
              }
              errors++;
            }
          }
        }
      }
      var _valid2 = _errs53 === errors;
      errors = _errs52;
      if (vErrors !== null) {
        if (_errs52) {
          vErrors.length = _errs52;
        } else {
          vErrors = null;
        }
      }
      if (_valid2) {
        const _errs55 = errors;
        if (data21 && typeof data21 == "object" && !Array.isArray(data21)) {
          if (data21.status !== void 0) {
            if ("not-required" !== data21.status) {
              const err52 = { instancePath: instancePath + "/e2e/status", schemaPath: "#/$defs/full-suite/allOf/0/then/properties/status/const", keyword: "const", params: { allowedValue: "not-required" }, message: "must be equal to constant" };
              if (vErrors === null) {
                vErrors = [err52];
              } else {
                vErrors.push(err52);
              }
              errors++;
            }
          }
          if (data21.reason !== void 0) {
            let data24 = data21.reason;
            if (typeof data24 === "string") {
              if (func2(data24) < 1) {
                const err53 = { instancePath: instancePath + "/e2e/reason", schemaPath: "#/$defs/full-suite/allOf/0/then/properties/reason/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err53];
                } else {
                  vErrors.push(err53);
                }
                errors++;
              }
            } else {
              const err54 = { instancePath: instancePath + "/e2e/reason", schemaPath: "#/$defs/full-suite/allOf/0/then/properties/reason/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err54];
              } else {
                vErrors.push(err54);
              }
              errors++;
            }
          }
        }
        var _valid2 = _errs55 === errors;
        valid12 = _valid2;
        if (valid12) {
          var props1 = {};
          props1.status = true;
          props1.reason = true;
          props1.required = true;
        }
      }
      if (!valid12) {
        const err55 = { instancePath: instancePath + "/e2e", schemaPath: "#/$defs/full-suite/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
        if (vErrors === null) {
          vErrors = [err55];
        } else {
          vErrors.push(err55);
        }
        errors++;
      }
      if (data21 && typeof data21 == "object" && !Array.isArray(data21)) {
        if (data21.required === void 0) {
          const err56 = { instancePath: instancePath + "/e2e", schemaPath: "#/$defs/full-suite/required", keyword: "required", params: { missingProperty: "required" }, message: "must have required property 'required'" };
          if (vErrors === null) {
            vErrors = [err56];
          } else {
            vErrors.push(err56);
          }
          errors++;
        }
        if (data21.status === void 0) {
          const err57 = { instancePath: instancePath + "/e2e", schemaPath: "#/$defs/full-suite/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
          if (vErrors === null) {
            vErrors = [err57];
          } else {
            vErrors.push(err57);
          }
          errors++;
        }
        if (data21.reason === void 0) {
          const err58 = { instancePath: instancePath + "/e2e", schemaPath: "#/$defs/full-suite/required", keyword: "required", params: { missingProperty: "reason" }, message: "must have required property 'reason'" };
          if (vErrors === null) {
            vErrors = [err58];
          } else {
            vErrors.push(err58);
          }
          errors++;
        }
        if (data21.evidence === void 0) {
          const err59 = { instancePath: instancePath + "/e2e", schemaPath: "#/$defs/full-suite/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
          if (vErrors === null) {
            vErrors = [err59];
          } else {
            vErrors.push(err59);
          }
          errors++;
        }
        for (const key2 in data21) {
          if (!(key2 === "required" || key2 === "status" || key2 === "reason" || key2 === "evidence")) {
            const err60 = { instancePath: instancePath + "/e2e", schemaPath: "#/$defs/full-suite/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err60];
            } else {
              vErrors.push(err60);
            }
            errors++;
          }
        }
        if (data21.required !== void 0) {
          if (typeof data21.required !== "boolean") {
            const err61 = { instancePath: instancePath + "/e2e/required", schemaPath: "#/$defs/full-suite/properties/required/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
            if (vErrors === null) {
              vErrors = [err61];
            } else {
              vErrors.push(err61);
            }
            errors++;
          }
        }
        if (data21.status !== void 0) {
          let data26 = data21.status;
          if (!(data26 === "not-required" || data26 === "pending" || data26 === "passed" || data26 === "failed")) {
            const err62 = { instancePath: instancePath + "/e2e/status", schemaPath: "#/$defs/full-suite/properties/status/enum", keyword: "enum", params: { allowedValues: schema41.properties.status.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err62];
            } else {
              vErrors.push(err62);
            }
            errors++;
          }
        }
        if (data21.reason !== void 0) {
          let data27 = data21.reason;
          if (typeof data27 !== "string" && data27 !== null) {
            const err63 = { instancePath: instancePath + "/e2e/reason", schemaPath: "#/$defs/full-suite/properties/reason/type", keyword: "type", params: { type: schema41.properties.reason.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err63];
            } else {
              vErrors.push(err63);
            }
            errors++;
          }
        }
        if (data21.evidence !== void 0) {
          let data28 = data21.evidence;
          if (typeof data28 !== "string" && data28 !== null) {
            const err64 = { instancePath: instancePath + "/e2e/evidence", schemaPath: "#/$defs/full-suite/properties/evidence/type", keyword: "type", params: { type: schema41.properties.evidence.type }, message: "must be string,null" };
            if (vErrors === null) {
              vErrors = [err64];
            } else {
              vErrors.push(err64);
            }
            errors++;
          }
        }
      } else {
        const err65 = { instancePath: instancePath + "/e2e", schemaPath: "#/$defs/full-suite/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err65];
        } else {
          vErrors.push(err65);
        }
        errors++;
      }
    }
    if (data.evidence !== void 0) {
      let data29 = data.evidence;
      if (typeof data29 === "string") {
        if (!pattern12.test(data29)) {
          const err66 = { instancePath: instancePath + "/evidence", schemaPath: "#/properties/evidence/pattern", keyword: "pattern", params: { pattern: "^<Path>\\{roots\\.state\\}/specdev/changes/[^<]+/evidence/T-[0-9]{2,}\\.md</Path>$" }, message: 'must match pattern "^<Path>\\{roots\\.state\\}/specdev/changes/[^<]+/evidence/T-[0-9]{2,}\\.md</Path>$"' };
          if (vErrors === null) {
            vErrors = [err66];
          } else {
            vErrors.push(err66);
          }
          errors++;
        }
      } else {
        const err67 = { instancePath: instancePath + "/evidence", schemaPath: "#/properties/evidence/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err67];
        } else {
          vErrors.push(err67);
        }
        errors++;
      }
    }
    if (data.attempts !== void 0) {
      let data30 = data.attempts;
      if (!(typeof data30 == "number" && (!(data30 % 1) && !isNaN(data30)) && isFinite(data30))) {
        const err68 = { instancePath: instancePath + "/attempts", schemaPath: "#/properties/attempts/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err68];
        } else {
          vErrors.push(err68);
        }
        errors++;
      }
      if (typeof data30 == "number" && isFinite(data30)) {
        if (data30 < 0 || isNaN(data30)) {
          const err69 = { instancePath: instancePath + "/attempts", schemaPath: "#/properties/attempts/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err69];
          } else {
            vErrors.push(err69);
          }
          errors++;
        }
      }
    }
    if (data.promotion_status !== void 0) {
      let data31 = data.promotion_status;
      if (!(data31 === "pending" || data31 === "applying" || data31 === "applied" || data31 === "failed" || data31 === "stale")) {
        const err70 = { instancePath: instancePath + "/promotion_status", schemaPath: "#/properties/promotion_status/enum", keyword: "enum", params: { allowedValues: schema40.properties.promotion_status.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err70];
        } else {
          vErrors.push(err70);
        }
        errors++;
      }
    }
  } else {
    const err71 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err71];
    } else {
      vErrors.push(err71);
    }
    errors++;
  }
  validate26.errors = vErrors;
  return errors === 0;
}
validate26.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate25(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate25.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    let missing0;
    if (data.workspace_ref === void 0 && (missing0 = "workspace_ref")) {
      const err0 = {};
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    } else {
      if (data.workspace_ref !== void 0) {
        if ("current" !== data.workspace_ref) {
          const err1 = {};
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  let ifClause0;
  if (_valid0) {
    const _errs5 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.integration !== void 0) {
        let data1 = data.integration;
        if (data1 && typeof data1 == "object" && !Array.isArray(data1)) {
          if (data1.candidate_sha !== void 0) {
            if (null !== data1.candidate_sha) {
              const err2 = { instancePath: instancePath + "/integration/candidate_sha", schemaPath: "#/allOf/0/then/properties/integration/allOf/0/properties/candidate_sha/const", keyword: "const", params: { allowedValue: schema39.allOf[0].then.properties.integration.allOf[0].properties.candidate_sha.const }, message: "must be equal to constant" };
              if (vErrors === null) {
                vErrors = [err2];
              } else {
                vErrors.push(err2);
              }
              errors++;
            }
          }
          if (data1.candidate_tree_sha !== void 0) {
            if (null !== data1.candidate_tree_sha) {
              const err3 = { instancePath: instancePath + "/integration/candidate_tree_sha", schemaPath: "#/allOf/0/then/properties/integration/allOf/0/properties/candidate_tree_sha/const", keyword: "const", params: { allowedValue: schema39.allOf[0].then.properties.integration.allOf[0].properties.candidate_tree_sha.const }, message: "must be equal to constant" };
              if (vErrors === null) {
                vErrors = [err3];
              } else {
                vErrors.push(err3);
              }
              errors++;
            }
          }
          if (data1.candidate_branch !== void 0) {
            if (null !== data1.candidate_branch) {
              const err4 = { instancePath: instancePath + "/integration/candidate_branch", schemaPath: "#/allOf/0/then/properties/integration/allOf/0/properties/candidate_branch/const", keyword: "const", params: { allowedValue: schema39.allOf[0].then.properties.integration.allOf[0].properties.candidate_branch.const }, message: "must be equal to constant" };
              if (vErrors === null) {
                vErrors = [err4];
              } else {
                vErrors.push(err4);
              }
              errors++;
            }
          }
          if (data1.candidate_workspace_ref !== void 0) {
            if (null !== data1.candidate_workspace_ref) {
              const err5 = { instancePath: instancePath + "/integration/candidate_workspace_ref", schemaPath: "#/allOf/0/then/properties/integration/allOf/0/properties/candidate_workspace_ref/const", keyword: "const", params: { allowedValue: schema39.allOf[0].then.properties.integration.allOf[0].properties.candidate_workspace_ref.const }, message: "must be equal to constant" };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          }
          if (data1.method !== void 0) {
            let data6 = data1.method;
            if (!(data6 === null || data6 === "direct-parent")) {
              const err6 = { instancePath: instancePath + "/integration/method", schemaPath: "#/allOf/0/then/properties/integration/allOf/0/properties/method/enum", keyword: "enum", params: { allowedValues: schema39.allOf[0].then.properties.integration.allOf[0].properties.method.enum }, message: "must be equal to one of the allowed values" };
              if (vErrors === null) {
                vErrors = [err6];
              } else {
                vErrors.push(err6);
              }
              errors++;
            }
          }
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
    if (valid1) {
      var props0 = {};
      props0.integration = true;
      props0.workspace_ref = true;
    }
    ifClause0 = "then";
  } else {
    const _errs13 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.integration !== void 0) {
        let data7 = data.integration;
        if (data7 && typeof data7 == "object" && !Array.isArray(data7)) {
          if (data7.method !== void 0) {
            let data8 = data7.method;
            if (!(data8 === null || data8 === "fast-forward" || data8 === "merge-commit")) {
              const err7 = { instancePath: instancePath + "/integration/method", schemaPath: "#/allOf/0/else/properties/integration/allOf/0/properties/method/enum", keyword: "enum", params: { allowedValues: schema39.allOf[0].else.properties.integration.allOf[0].properties.method.enum }, message: "must be equal to one of the allowed values" };
              if (vErrors === null) {
                vErrors = [err7];
              } else {
                vErrors.push(err7);
              }
              errors++;
            }
          }
        }
      }
    }
    var _valid0 = _errs13 === errors;
    valid1 = _valid0;
    if (valid1) {
      if (props0 !== true) {
        props0 = props0 || {};
        props0.integration = true;
      }
    }
    ifClause0 = "else";
  }
  if (!valid1) {
    const err8 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
    if (vErrors === null) {
      vErrors = [err8];
    } else {
      vErrors.push(err8);
    }
    errors++;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.ticket_id === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "ticket_id" }, message: "must have required property 'ticket_id'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (data.owner === void 0) {
      const err10 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "owner" }, message: "must have required property 'owner'" };
      if (vErrors === null) {
        vErrors = [err10];
      } else {
        vErrors.push(err10);
      }
      errors++;
    }
    if (data.implementation_owner === void 0) {
      const err11 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "implementation_owner" }, message: "must have required property 'implementation_owner'" };
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
    if (data.integration_owner === void 0) {
      const err12 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "integration_owner" }, message: "must have required property 'integration_owner'" };
      if (vErrors === null) {
        vErrors = [err12];
      } else {
        vErrors.push(err12);
      }
      errors++;
    }
    if (data.provider === void 0) {
      const err13 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "provider" }, message: "must have required property 'provider'" };
      if (vErrors === null) {
        vErrors = [err13];
      } else {
        vErrors.push(err13);
      }
      errors++;
    }
    if (data.base_sha === void 0) {
      const err14 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "base_sha" }, message: "must have required property 'base_sha'" };
      if (vErrors === null) {
        vErrors = [err14];
      } else {
        vErrors.push(err14);
      }
      errors++;
    }
    if (data.parent_branch === void 0) {
      const err15 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "parent_branch" }, message: "must have required property 'parent_branch'" };
      if (vErrors === null) {
        vErrors = [err15];
      } else {
        vErrors.push(err15);
      }
      errors++;
    }
    if (data.branch === void 0) {
      const err16 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
      if (vErrors === null) {
        vErrors = [err16];
      } else {
        vErrors.push(err16);
      }
      errors++;
    }
    if (data.workspace_ref === void 0) {
      const err17 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "workspace_ref" }, message: "must have required property 'workspace_ref'" };
      if (vErrors === null) {
        vErrors = [err17];
      } else {
        vErrors.push(err17);
      }
      errors++;
    }
    if (data.source_checkpoint === void 0) {
      const err18 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "source_checkpoint" }, message: "must have required property 'source_checkpoint'" };
      if (vErrors === null) {
        vErrors = [err18];
      } else {
        vErrors.push(err18);
      }
      errors++;
    }
    if (data.integration === void 0) {
      const err19 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "integration" }, message: "must have required property 'integration'" };
      if (vErrors === null) {
        vErrors = [err19];
      } else {
        vErrors.push(err19);
      }
      errors++;
    }
    if (data.status === void 0) {
      const err20 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
      if (vErrors === null) {
        vErrors = [err20];
      } else {
        vErrors.push(err20);
      }
      errors++;
    }
    if (data.updated_at === void 0) {
      const err21 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "updated_at" }, message: "must have required property 'updated_at'" };
      if (vErrors === null) {
        vErrors = [err21];
      } else {
        vErrors.push(err21);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func1.call(schema39.properties, key0)) {
        const err22 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
    if (data.ticket_id !== void 0) {
      let data9 = data.ticket_id;
      if (typeof data9 === "string") {
        if (!pattern9.test(data9)) {
          const err23 = { instancePath: instancePath + "/ticket_id", schemaPath: "#/properties/ticket_id/pattern", keyword: "pattern", params: { pattern: "^T-[0-9]{2,}$" }, message: 'must match pattern "^T-[0-9]{2,}$"' };
          if (vErrors === null) {
            vErrors = [err23];
          } else {
            vErrors.push(err23);
          }
          errors++;
        }
      } else {
        const err24 = { instancePath: instancePath + "/ticket_id", schemaPath: "#/properties/ticket_id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.owner !== void 0) {
      let data10 = data.owner;
      if (typeof data10 === "string") {
        if (func2(data10) < 1) {
          const err25 = { instancePath: instancePath + "/owner", schemaPath: "#/properties/owner/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err25];
          } else {
            vErrors.push(err25);
          }
          errors++;
        }
      } else {
        const err26 = { instancePath: instancePath + "/owner", schemaPath: "#/properties/owner/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err26];
        } else {
          vErrors.push(err26);
        }
        errors++;
      }
    }
    if (data.implementation_owner !== void 0) {
      let data11 = data.implementation_owner;
      if (typeof data11 === "string") {
        if (func2(data11) < 1) {
          const err27 = { instancePath: instancePath + "/implementation_owner", schemaPath: "#/properties/implementation_owner/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
      } else {
        const err28 = { instancePath: instancePath + "/implementation_owner", schemaPath: "#/properties/implementation_owner/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
    }
    if (data.integration_owner !== void 0) {
      let data12 = data.integration_owner;
      if (typeof data12 === "string") {
        if (func2(data12) < 1) {
          const err29 = { instancePath: instancePath + "/integration_owner", schemaPath: "#/properties/integration_owner/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err29];
          } else {
            vErrors.push(err29);
          }
          errors++;
        }
      } else {
        const err30 = { instancePath: instancePath + "/integration_owner", schemaPath: "#/properties/integration_owner/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err30];
        } else {
          vErrors.push(err30);
        }
        errors++;
      }
    }
    if (data.provider !== void 0) {
      if ("git" !== data.provider) {
        const err31 = { instancePath: instancePath + "/provider", schemaPath: "#/properties/provider/const", keyword: "const", params: { allowedValue: "git" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err31];
        } else {
          vErrors.push(err31);
        }
        errors++;
      }
    }
    if (data.base_sha !== void 0) {
      let data14 = data.base_sha;
      if (typeof data14 === "string") {
        if (func2(data14) < 1) {
          const err32 = { instancePath: instancePath + "/base_sha", schemaPath: "#/properties/base_sha/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err32];
          } else {
            vErrors.push(err32);
          }
          errors++;
        }
      } else {
        const err33 = { instancePath: instancePath + "/base_sha", schemaPath: "#/properties/base_sha/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err33];
        } else {
          vErrors.push(err33);
        }
        errors++;
      }
    }
    if (data.parent_branch !== void 0) {
      let data15 = data.parent_branch;
      if (typeof data15 === "string") {
        if (func2(data15) < 1) {
          const err34 = { instancePath: instancePath + "/parent_branch", schemaPath: "#/properties/parent_branch/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err34];
          } else {
            vErrors.push(err34);
          }
          errors++;
        }
      } else {
        const err35 = { instancePath: instancePath + "/parent_branch", schemaPath: "#/properties/parent_branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err35];
        } else {
          vErrors.push(err35);
        }
        errors++;
      }
    }
    if (data.branch !== void 0) {
      let data16 = data.branch;
      if (typeof data16 === "string") {
        if (func2(data16) < 1) {
          const err36 = { instancePath: instancePath + "/branch", schemaPath: "#/properties/branch/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err36];
          } else {
            vErrors.push(err36);
          }
          errors++;
        }
      } else {
        const err37 = { instancePath: instancePath + "/branch", schemaPath: "#/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err37];
        } else {
          vErrors.push(err37);
        }
        errors++;
      }
    }
    if (data.workspace_ref !== void 0) {
      let data17 = data.workspace_ref;
      if (typeof data17 === "string") {
        if (!pattern10.test(data17)) {
          const err38 = { instancePath: instancePath + "/workspace_ref", schemaPath: "#/properties/workspace_ref/pattern", keyword: "pattern", params: { pattern: "^(?:current|specdev-worktree/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,})$" }, message: 'must match pattern "^(?:current|specdev-worktree/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,})$"' };
          if (vErrors === null) {
            vErrors = [err38];
          } else {
            vErrors.push(err38);
          }
          errors++;
        }
      } else {
        const err39 = { instancePath: instancePath + "/workspace_ref", schemaPath: "#/properties/workspace_ref/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err39];
        } else {
          vErrors.push(err39);
        }
        errors++;
      }
    }
    if (data.source_checkpoint !== void 0) {
      let data18 = data.source_checkpoint;
      if (typeof data18 !== "string" && data18 !== null) {
        const err40 = { instancePath: instancePath + "/source_checkpoint", schemaPath: "#/properties/source_checkpoint/type", keyword: "type", params: { type: schema39.properties.source_checkpoint.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err40];
        } else {
          vErrors.push(err40);
        }
        errors++;
      }
    }
    if (data.integration !== void 0) {
      if (!validate26(data.integration, { instancePath: instancePath + "/integration", parentData: data, parentDataProperty: "integration", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
    if (data.status !== void 0) {
      let data20 = data.status;
      if (!(data20 === "planned" || data20 === "active" || data20 === "review" || data20 === "integrating" || data20 === "integrated" || data20 === "removed" || data20 === "blocked")) {
        const err41 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/enum", keyword: "enum", params: { allowedValues: schema39.properties.status.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err41];
        } else {
          vErrors.push(err41);
        }
        errors++;
      }
    }
    if (data.updated_at !== void 0) {
      let data21 = data.updated_at;
      if (typeof data21 === "string") {
        if (func2(data21) < 1) {
          const err42 = { instancePath: instancePath + "/updated_at", schemaPath: "#/properties/updated_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err42];
          } else {
            vErrors.push(err42);
          }
          errors++;
        }
      } else {
        const err43 = { instancePath: instancePath + "/updated_at", schemaPath: "#/properties/updated_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err43];
        } else {
          vErrors.push(err43);
        }
        errors++;
      }
    }
  } else {
    const err44 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err44];
    } else {
      vErrors.push(err44);
    }
    errors++;
  }
  validate25.errors = vErrors;
  return errors === 0;
}
validate25.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate20(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  ;
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate20.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    let missing0;
    if (data.change_status === void 0 && (missing0 = "change_status")) {
      const err0 = {};
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    } else {
      if (data.change_status !== void 0) {
        if ("archived" !== data.change_status) {
          const err1 = {};
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.archived !== void 0) {
        if (true !== data.archived) {
          const err2 = { instancePath: instancePath + "/archived", schemaPath: "#/allOf/0/then/properties/archived/const", keyword: "const", params: { allowedValue: true }, message: "must be equal to constant" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      }
      if (data.archive_path !== void 0) {
        let data2 = data.archive_path;
        if (typeof data2 === "string") {
          if (!pattern4.test(data2)) {
            const err3 = { instancePath: instancePath + "/archive_path", schemaPath: "#/allOf/0/then/properties/archive_path/pattern", keyword: "pattern", params: { pattern: "^<Path>\\{roots\\.state\\}/specdev/archive/[^<]+</Path>$" }, message: 'must match pattern "^<Path>\\{roots\\.state\\}/specdev/archive/[^<]+</Path>$"' };
            if (vErrors === null) {
              vErrors = [err3];
            } else {
              vErrors.push(err3);
            }
            errors++;
          }
        } else {
          const err4 = { instancePath: instancePath + "/archive_path", schemaPath: "#/allOf/0/then/properties/archive_path/type", keyword: "type", params: { type: "string" }, message: "must be string" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
    if (valid1) {
      var props0 = {};
      props0.archived = true;
      props0.archive_path = true;
      props0.change_status = true;
    }
  }
  if (!valid1) {
    const err5 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err5];
    } else {
      vErrors.push(err5);
    }
    errors++;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.schema_version === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "schema_version" }, message: "must have required property 'schema_version'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.artifact === void 0) {
      const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "artifact" }, message: "must have required property 'artifact'" };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data.change === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "change" }, message: "must have required property 'change'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.change_status === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "change_status" }, message: "must have required property 'change_status'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (data.current_work === void 0) {
      const err10 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "current_work" }, message: "must have required property 'current_work'" };
      if (vErrors === null) {
        vErrors = [err10];
      } else {
        vErrors.push(err10);
      }
      errors++;
    }
    if (data.works_run === void 0) {
      const err11 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "works_run" }, message: "must have required property 'works_run'" };
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
    if (data.claimed_investigations === void 0) {
      const err12 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "claimed_investigations" }, message: "must have required property 'claimed_investigations'" };
      if (vErrors === null) {
        vErrors = [err12];
      } else {
        vErrors.push(err12);
      }
      errors++;
    }
    if (data.execution_authorization === void 0) {
      const err13 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "execution_authorization" }, message: "must have required property 'execution_authorization'" };
      if (vErrors === null) {
        vErrors = [err13];
      } else {
        vErrors.push(err13);
      }
      errors++;
    }
    if (data.leadership === void 0) {
      const err14 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "leadership" }, message: "must have required property 'leadership'" };
      if (vErrors === null) {
        vErrors = [err14];
      } else {
        vErrors.push(err14);
      }
      errors++;
    }
    if (data.created_at === void 0) {
      const err15 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "created_at" }, message: "must have required property 'created_at'" };
      if (vErrors === null) {
        vErrors = [err15];
      } else {
        vErrors.push(err15);
      }
      errors++;
    }
    if (data.updated_at === void 0) {
      const err16 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "updated_at" }, message: "must have required property 'updated_at'" };
      if (vErrors === null) {
        vErrors = [err16];
      } else {
        vErrors.push(err16);
      }
      errors++;
    }
    if (data.completed_at === void 0) {
      const err17 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "completed_at" }, message: "must have required property 'completed_at'" };
      if (vErrors === null) {
        vErrors = [err17];
      } else {
        vErrors.push(err17);
      }
      errors++;
    }
    if (data.archived === void 0) {
      const err18 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "archived" }, message: "must have required property 'archived'" };
      if (vErrors === null) {
        vErrors = [err18];
      } else {
        vErrors.push(err18);
      }
      errors++;
    }
    if (data.archive_path === void 0) {
      const err19 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "archive_path" }, message: "must have required property 'archive_path'" };
      if (vErrors === null) {
        vErrors = [err19];
      } else {
        vErrors.push(err19);
      }
      errors++;
    }
    if (data.blockers === void 0) {
      const err20 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "blockers" }, message: "must have required property 'blockers'" };
      if (vErrors === null) {
        vErrors = [err20];
      } else {
        vErrors.push(err20);
      }
      errors++;
    }
    if (data.deviations === void 0) {
      const err21 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "deviations" }, message: "must have required property 'deviations'" };
      if (vErrors === null) {
        vErrors = [err21];
      } else {
        vErrors.push(err21);
      }
      errors++;
    }
    if (data.worktrees === void 0) {
      const err22 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "worktrees" }, message: "must have required property 'worktrees'" };
      if (vErrors === null) {
        vErrors = [err22];
      } else {
        vErrors.push(err22);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func1.call(schema31.properties, key0)) {
        const err23 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
    if (data.schema_version !== void 0) {
      if (6 !== data.schema_version) {
        const err24 = { instancePath: instancePath + "/schema_version", schemaPath: "#/properties/schema_version/const", keyword: "const", params: { allowedValue: 6 }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.artifact !== void 0) {
      if ("change-status" !== data.artifact) {
        const err25 = { instancePath: instancePath + "/artifact", schemaPath: "#/properties/artifact/const", keyword: "const", params: { allowedValue: "change-status" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
    if (data.change !== void 0) {
      let data5 = data.change;
      if (typeof data5 === "string") {
        if (!pattern5.test(data5)) {
          const err26 = { instancePath: instancePath + "/change", schemaPath: "#/properties/change/pattern", keyword: "pattern", params: { pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$" }, message: 'must match pattern "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"' };
          if (vErrors === null) {
            vErrors = [err26];
          } else {
            vErrors.push(err26);
          }
          errors++;
        }
      } else {
        const err27 = { instancePath: instancePath + "/change", schemaPath: "#/properties/change/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err27];
        } else {
          vErrors.push(err27);
        }
        errors++;
      }
    }
    if (data.change_status !== void 0) {
      let data6 = data.change_status;
      if (!(data6 === "active" || data6 === "blocked" || data6 === "completed" || data6 === "archived")) {
        const err28 = { instancePath: instancePath + "/change_status", schemaPath: "#/properties/change_status/enum", keyword: "enum", params: { allowedValues: schema31.properties.change_status.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
    }
    if (data.current_work !== void 0) {
      let data7 = data.current_work;
      if (typeof data7 !== "string" && data7 !== null) {
        const err29 = { instancePath: instancePath + "/current_work", schemaPath: "#/properties/current_work/type", keyword: "type", params: { type: schema31.properties.current_work.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err29];
        } else {
          vErrors.push(err29);
        }
        errors++;
      }
      if (typeof data7 === "string") {
        if (!pattern6.test(data7)) {
          const err30 = { instancePath: instancePath + "/current_work", schemaPath: "#/properties/current_work/pattern", keyword: "pattern", params: { pattern: "^specdev/" }, message: 'must match pattern "^specdev/"' };
          if (vErrors === null) {
            vErrors = [err30];
          } else {
            vErrors.push(err30);
          }
          errors++;
        }
      }
    }
    if (data.works_run !== void 0) {
      let data8 = data.works_run;
      if (Array.isArray(data8)) {
        const len0 = data8.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data9 = data8[i0];
          if (typeof data9 === "string") {
            if (!pattern6.test(data9)) {
              const err31 = { instancePath: instancePath + "/works_run/" + i0, schemaPath: "#/properties/works_run/items/pattern", keyword: "pattern", params: { pattern: "^specdev/" }, message: 'must match pattern "^specdev/"' };
              if (vErrors === null) {
                vErrors = [err31];
              } else {
                vErrors.push(err31);
              }
              errors++;
            }
          } else {
            const err32 = { instancePath: instancePath + "/works_run/" + i0, schemaPath: "#/properties/works_run/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err32];
            } else {
              vErrors.push(err32);
            }
            errors++;
          }
        }
        let i1 = data8.length;
        let j0;
        if (i1 > 1) {
          const indices0 = {};
          for (; i1--; ) {
            let item0 = data8[i1];
            if (typeof item0 !== "string") {
              continue;
            }
            if (typeof indices0[item0] == "number") {
              j0 = indices0[item0];
              const err33 = { instancePath: instancePath + "/works_run", schemaPath: "#/properties/works_run/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
              if (vErrors === null) {
                vErrors = [err33];
              } else {
                vErrors.push(err33);
              }
              errors++;
              break;
            }
            indices0[item0] = i1;
          }
        }
      } else {
        const err34 = { instancePath: instancePath + "/works_run", schemaPath: "#/properties/works_run/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err34];
        } else {
          vErrors.push(err34);
        }
        errors++;
      }
    }
    if (data.claimed_investigations !== void 0) {
      let data10 = data.claimed_investigations;
      if (Array.isArray(data10)) {
        const len1 = data10.length;
        for (let i2 = 0; i2 < len1; i2++) {
          let data11 = data10[i2];
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            if (data11.id === void 0) {
              const err35 = { instancePath: instancePath + "/claimed_investigations/" + i2, schemaPath: "#/$defs/claim/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err35];
              } else {
                vErrors.push(err35);
              }
              errors++;
            }
            if (data11.owner === void 0) {
              const err36 = { instancePath: instancePath + "/claimed_investigations/" + i2, schemaPath: "#/$defs/claim/required", keyword: "required", params: { missingProperty: "owner" }, message: "must have required property 'owner'" };
              if (vErrors === null) {
                vErrors = [err36];
              } else {
                vErrors.push(err36);
              }
              errors++;
            }
            if (data11.session === void 0) {
              const err37 = { instancePath: instancePath + "/claimed_investigations/" + i2, schemaPath: "#/$defs/claim/required", keyword: "required", params: { missingProperty: "session" }, message: "must have required property 'session'" };
              if (vErrors === null) {
                vErrors = [err37];
              } else {
                vErrors.push(err37);
              }
              errors++;
            }
            if (data11.claimed_at === void 0) {
              const err38 = { instancePath: instancePath + "/claimed_investigations/" + i2, schemaPath: "#/$defs/claim/required", keyword: "required", params: { missingProperty: "claimed_at" }, message: "must have required property 'claimed_at'" };
              if (vErrors === null) {
                vErrors = [err38];
              } else {
                vErrors.push(err38);
              }
              errors++;
            }
            for (const key1 in data11) {
              if (!(key1 === "id" || key1 === "owner" || key1 === "session" || key1 === "claimed_at")) {
                const err39 = { instancePath: instancePath + "/claimed_investigations/" + i2, schemaPath: "#/$defs/claim/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err39];
                } else {
                  vErrors.push(err39);
                }
                errors++;
              }
            }
            if (data11.id !== void 0) {
              let data12 = data11.id;
              if (typeof data12 === "string") {
                if (func2(data12) < 1) {
                  const err40 = { instancePath: instancePath + "/claimed_investigations/" + i2 + "/id", schemaPath: "#/$defs/claim/properties/id/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err40];
                  } else {
                    vErrors.push(err40);
                  }
                  errors++;
                }
              } else {
                const err41 = { instancePath: instancePath + "/claimed_investigations/" + i2 + "/id", schemaPath: "#/$defs/claim/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err41];
                } else {
                  vErrors.push(err41);
                }
                errors++;
              }
            }
            if (data11.owner !== void 0) {
              let data13 = data11.owner;
              if (typeof data13 === "string") {
                if (func2(data13) < 1) {
                  const err42 = { instancePath: instancePath + "/claimed_investigations/" + i2 + "/owner", schemaPath: "#/$defs/claim/properties/owner/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err42];
                  } else {
                    vErrors.push(err42);
                  }
                  errors++;
                }
              } else {
                const err43 = { instancePath: instancePath + "/claimed_investigations/" + i2 + "/owner", schemaPath: "#/$defs/claim/properties/owner/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err43];
                } else {
                  vErrors.push(err43);
                }
                errors++;
              }
            }
            if (data11.session !== void 0) {
              let data14 = data11.session;
              if (typeof data14 !== "string" && data14 !== null) {
                const err44 = { instancePath: instancePath + "/claimed_investigations/" + i2 + "/session", schemaPath: "#/$defs/claim/properties/session/type", keyword: "type", params: { type: schema32.properties.session.type }, message: "must be string,null" };
                if (vErrors === null) {
                  vErrors = [err44];
                } else {
                  vErrors.push(err44);
                }
                errors++;
              }
            }
            if (data11.claimed_at !== void 0) {
              let data15 = data11.claimed_at;
              if (typeof data15 === "string") {
                if (func2(data15) < 1) {
                  const err45 = { instancePath: instancePath + "/claimed_investigations/" + i2 + "/claimed_at", schemaPath: "#/$defs/claim/properties/claimed_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err45];
                  } else {
                    vErrors.push(err45);
                  }
                  errors++;
                }
              } else {
                const err46 = { instancePath: instancePath + "/claimed_investigations/" + i2 + "/claimed_at", schemaPath: "#/$defs/claim/properties/claimed_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err46];
                } else {
                  vErrors.push(err46);
                }
                errors++;
              }
            }
          } else {
            const err47 = { instancePath: instancePath + "/claimed_investigations/" + i2, schemaPath: "#/$defs/claim/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err47];
            } else {
              vErrors.push(err47);
            }
            errors++;
          }
        }
      } else {
        const err48 = { instancePath: instancePath + "/claimed_investigations", schemaPath: "#/properties/claimed_investigations/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err48];
        } else {
          vErrors.push(err48);
        }
        errors++;
      }
    }
    if (data.execution_authorization !== void 0) {
      if (!validate21(data.execution_authorization, { instancePath: instancePath + "/execution_authorization", parentData: data, parentDataProperty: "execution_authorization", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
        errors = vErrors.length;
      }
    }
    if (data.leadership !== void 0) {
      if (!validate23(data.leadership, { instancePath: instancePath + "/leadership", parentData: data, parentDataProperty: "leadership", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
        errors = vErrors.length;
      }
    }
    if (data.created_at !== void 0) {
      let data18 = data.created_at;
      if (typeof data18 === "string") {
        if (func2(data18) < 1) {
          const err49 = { instancePath: instancePath + "/created_at", schemaPath: "#/properties/created_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err49];
          } else {
            vErrors.push(err49);
          }
          errors++;
        }
      } else {
        const err50 = { instancePath: instancePath + "/created_at", schemaPath: "#/properties/created_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err50];
        } else {
          vErrors.push(err50);
        }
        errors++;
      }
    }
    if (data.updated_at !== void 0) {
      let data19 = data.updated_at;
      if (typeof data19 === "string") {
        if (func2(data19) < 1) {
          const err51 = { instancePath: instancePath + "/updated_at", schemaPath: "#/properties/updated_at/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err51];
          } else {
            vErrors.push(err51);
          }
          errors++;
        }
      } else {
        const err52 = { instancePath: instancePath + "/updated_at", schemaPath: "#/properties/updated_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err52];
        } else {
          vErrors.push(err52);
        }
        errors++;
      }
    }
    if (data.completed_at !== void 0) {
      let data20 = data.completed_at;
      if (typeof data20 !== "string" && data20 !== null) {
        const err53 = { instancePath: instancePath + "/completed_at", schemaPath: "#/properties/completed_at/type", keyword: "type", params: { type: schema31.properties.completed_at.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err53];
        } else {
          vErrors.push(err53);
        }
        errors++;
      }
    }
    if (data.archived !== void 0) {
      if (typeof data.archived !== "boolean") {
        const err54 = { instancePath: instancePath + "/archived", schemaPath: "#/properties/archived/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err54];
        } else {
          vErrors.push(err54);
        }
        errors++;
      }
    }
    if (data.archive_path !== void 0) {
      let data22 = data.archive_path;
      const _errs46 = errors;
      let valid12 = false;
      const _errs47 = errors;
      if (data22 !== null) {
        const err55 = { instancePath: instancePath + "/archive_path", schemaPath: "#/properties/archive_path/anyOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err55];
        } else {
          vErrors.push(err55);
        }
        errors++;
      }
      var _valid1 = _errs47 === errors;
      valid12 = valid12 || _valid1;
      const _errs49 = errors;
      if (typeof data22 === "string") {
        if (!pattern4.test(data22)) {
          const err56 = { instancePath: instancePath + "/archive_path", schemaPath: "#/properties/archive_path/anyOf/1/pattern", keyword: "pattern", params: { pattern: "^<Path>\\{roots\\.state\\}/specdev/archive/[^<]+</Path>$" }, message: 'must match pattern "^<Path>\\{roots\\.state\\}/specdev/archive/[^<]+</Path>$"' };
          if (vErrors === null) {
            vErrors = [err56];
          } else {
            vErrors.push(err56);
          }
          errors++;
        }
      } else {
        const err57 = { instancePath: instancePath + "/archive_path", schemaPath: "#/properties/archive_path/anyOf/1/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err57];
        } else {
          vErrors.push(err57);
        }
        errors++;
      }
      var _valid1 = _errs49 === errors;
      valid12 = valid12 || _valid1;
      if (!valid12) {
        const err58 = { instancePath: instancePath + "/archive_path", schemaPath: "#/properties/archive_path/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
        if (vErrors === null) {
          vErrors = [err58];
        } else {
          vErrors.push(err58);
        }
        errors++;
      } else {
        errors = _errs46;
        if (vErrors !== null) {
          if (_errs46) {
            vErrors.length = _errs46;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.blockers !== void 0) {
      let data23 = data.blockers;
      if (Array.isArray(data23)) {
        const len2 = data23.length;
        for (let i3 = 0; i3 < len2; i3++) {
          if (typeof data23[i3] !== "string") {
            const err59 = { instancePath: instancePath + "/blockers/" + i3, schemaPath: "#/properties/blockers/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err59];
            } else {
              vErrors.push(err59);
            }
            errors++;
          }
        }
      } else {
        const err60 = { instancePath: instancePath + "/blockers", schemaPath: "#/properties/blockers/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err60];
        } else {
          vErrors.push(err60);
        }
        errors++;
      }
    }
    if (data.deviations !== void 0) {
      let data25 = data.deviations;
      if (Array.isArray(data25)) {
        const len3 = data25.length;
        for (let i4 = 0; i4 < len3; i4++) {
          if (typeof data25[i4] !== "string") {
            const err61 = { instancePath: instancePath + "/deviations/" + i4, schemaPath: "#/properties/deviations/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err61];
            } else {
              vErrors.push(err61);
            }
            errors++;
          }
        }
      } else {
        const err62 = { instancePath: instancePath + "/deviations", schemaPath: "#/properties/deviations/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err62];
        } else {
          vErrors.push(err62);
        }
        errors++;
      }
    }
    if (data.worktrees !== void 0) {
      let data27 = data.worktrees;
      if (Array.isArray(data27)) {
        const len4 = data27.length;
        for (let i5 = 0; i5 < len4; i5++) {
          if (!validate25(data27[i5], { instancePath: instancePath + "/worktrees/" + i5, parentData: data27, parentDataProperty: i5, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err63 = { instancePath: instancePath + "/worktrees", schemaPath: "#/properties/worktrees/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err63];
        } else {
          vErrors.push(err63);
        }
        errors++;
      }
    }
  } else {
    const err64 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err64];
    } else {
      vErrors.push(err64);
    }
    errors++;
  }
  validate20.errors = vErrors;
  return errors === 0;
}
validate20.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
