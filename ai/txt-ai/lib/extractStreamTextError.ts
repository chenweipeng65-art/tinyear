/** 从 AI SDK / 网关错误中取出可读文案 */
export function extractStreamTextErrorMessage(error: unknown): string {
  let errorMessage = "未知错误";
  const err = error as Record<string, unknown>;

  if (error instanceof Error && error.message) {
    errorMessage = error.message;
  } else if (err.responseBody) {
    try {
      const responseBody =
        typeof err.responseBody === "string"
          ? JSON.parse(err.responseBody)
          : err.responseBody;
      if (
        responseBody &&
        typeof responseBody === "object" &&
        "error" in responseBody &&
        responseBody.error &&
        typeof (responseBody.error as { message?: string }).message === "string"
      ) {
        errorMessage = (responseBody.error as { message: string }).message;
      } else if (typeof err.responseBody === "string") {
        errorMessage = err.responseBody;
      }
    } catch {
      errorMessage = String(err.responseBody);
    }
  } else if (typeof err.message === "string") {
    errorMessage = err.message;
  } else if (
    err.error &&
    typeof err.error === "object" &&
    "message" in err.error &&
    typeof (err.error as { message?: string }).message === "string"
  ) {
    errorMessage = (err.error as { message: string }).message;
  } else if (error instanceof Error) {
    errorMessage = error.toString();
  } else {
    errorMessage = String(error);
  }
  return errorMessage;
}
