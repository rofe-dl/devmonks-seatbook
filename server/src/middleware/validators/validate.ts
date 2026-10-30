import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Middleware factory: validates `req.body` against the given Zod schema.
 *
 * On success, `req.body` is replaced with the parsed data (coercions and
 * defaults applied) and the request continues.
 * On failure, responds with 400 and the list of validation issues.
 */
export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues[0].message,
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
}
