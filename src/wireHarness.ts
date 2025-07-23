/**
 * spike for a utility to define API calls in Ion
 */

import { Request, Response, Next, Server, RequestHandlerType } from "restify";
import {
  HttpError,
  InternalServerError,
  ResourceNotFoundError,
  RestError,
} from "restify-errors";


type HarnessSpec<T extends any[], R, I = R> = {
  method: "get" | "put" | "post" | "del" | "opts" | "head";
  uri: string;
  guards: RequestHandlerType[];
  args?: (req: Request) => T;
  execute: (...args: T) => Promise<I>;
  marshall: (result: Awaited<I>) => Promise<R>;
  headers?: (req: Request, result: Awaited<R>) => Record<string, string>;
};

type ErrorConstructor<T extends Error = Error> = new (...args: any[]) => T;
type ErrorHandler<T extends Error = Error, R = any> = (err: T) => R;
type ErrorHandlerPair<T extends Error = Error, R = any> = [ErrorConstructor<T>, ErrorHandler<T, R>];
wireHarness.errorHandlers = [] as (ErrorHandlerPair[]);

wireHarness.addErrorHandler = <T extends Error, R = any>(Type: ErrorConstructor<T>, handle: ErrorHandler<T, R>) => {
  wireHarness.errorHandlers.push([Type, handle as unknown as ErrorHandler]);
};

function wireHarness<T extends any[], R, I>({
  method, uri, guards, args, execute, marshall, headers,
}: HarnessSpec<T, R, I>) {
  const main = async (req: Request, res: Response, next: Next) => {
    const args = getArgs?.(req) ?? ([] as unknown as T);
    try {
      let data: Awaited<I | R> = await execute(...args);
      if (data === undefined || data === null) {
        throw new ResourceNotFoundError();
      }
      if (marshall) {
        data = await marshall(data);
      }
      const headers = {
        "content-type": "application/json",
        ...headers?.(req, data as Awaited<R>)
      };
      res.json(data, headers);
      next();
    } catch (err) {
      const { url } = req;
      if (!err) {
          console.warn(`Unknown error with url: ${url}`);
          return new InternalServerError("Internal server error");
        }

        // Check for errors we raise ourselves via internal error handling.
        if (err instanceof RestError || err instanceof HttpError) {
          if (err instanceof ResourceNotFoundError) {
            return new ResourceNotFoundError(`Resource Not Found: ${url ?? ""}`);
          }
          return err;
        }

        // Check for known error types
        for (const [Type, handler] of wireHarness.errorHandlers) {
          if (err instanceof Type) {
            try {
              const rv = handler(err);
              if (rv) {
                return rv;
              }
            } catch (e) {
              return e;
            }
          }
        }

        // Otherwise, this was an unexpected error, log it and send a default error.
        console.warn(err);
        return new InternalServerError("Internal server error");
    }

  };
  const register = (server: Server) => {
    server[method].call(server, uri, ...guards, main);
  };
  // Everything is included for testability
  Object.assign(main, {
    method,
    uri,
    guards,
    args,
    execute,
    marshall,
    headers,
    register,
  });
  return main;
}

/**
 * Example:
 * ```
 * export const getUserWidget = wireHarness({
 *   method: "get",
 *   uri: Endpoints.Widget,
 *   guards: [AuthorizationServices.admin],
 *   getArgs: (req: Request): [number, number, string] => [
 *     Number(req.params.userId),
 *   ],
 *   execute: Database.getUserWidget,
 *   marshall: widgetFromProps,
 * });
 * ```
 */
