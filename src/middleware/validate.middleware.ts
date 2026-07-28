import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate =
  (schema: ZodSchema) =>
  (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const parsed: any = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Only overwrite what the schema actually validated - a schema that
      // only declares e.g. `body` strips `params`/`query` from its output,
      // so blindly reassigning all three would wipe out the ones it didn't
      // touch. This is what makes z.coerce/.transform() (dates, numbers)
      // actually take effect on req.body/req.params/req.query, instead of
      // the parsed-but-discarded value silently being thrown away.
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined) req.params = parsed.params;
      if (parsed.query !== undefined) req.query = parsed.query;

      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message:
          error.errors?.[0]?.message ||
          "Validation failed",
      });
    }
  };