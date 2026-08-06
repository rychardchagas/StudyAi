import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { disciplinePatchSchema } from "./schemas";
import { handleApiError } from "./respond";

describe("handleApiError", () => {
  it("maps a ZodError to 400 with issue details, without logging it as a server error", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let zodError: ZodError | undefined;
    try {
      disciplinePatchSchema.parse({ id: "not-allowed" });
    } catch (error) {
      zodError = error as ZodError;
    }
    expect(zodError).toBeInstanceOf(ZodError);

    const res = handleApiError(zodError, "Failed to update discipline");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation_error");
    expect(body.issues.length).toBeGreaterThan(0);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("maps a SyntaxError (invalid JSON body) to 400", async () => {
    const res = handleApiError(new SyntaxError("Unexpected token"), "Failed to update discipline");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_json");
  });

  it("logs unexpected errors with context and returns a generic 500", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleApiError(new Error("db is locked"), "Failed to update discipline");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("internal_error");
    expect(logSpy).toHaveBeenCalledWith("Failed to update discipline:", expect.any(Error));
    logSpy.mockRestore();
  });
});
