/**
 * M4：`POST /api/action` 统一响应与错误码（§9.2）。
 */

export type ActionErrorCode =
  | "unknown_action"
  | "invalid_body"
  | "validation_error"
  | "bad_request"
  | "not_found"
  | "database_unavailable";

export type ActionSuccess<T> = { ok: true; data: T };
export type ActionFailure = {
  ok: false;
  error: ActionErrorCode;
  message?: string;
  details?: unknown;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;
