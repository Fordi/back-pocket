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


type HarnessSpec<T extends any[], R> = {
  method: "get" | "put" | "post" | "del" | "opts" | "head";
  uri: string;
  guards: RequestHandlerType[];
  getArgs?: (req: Request) => T;
  execute: (...args: T) => Promise<R>;
  addHeaders?: (req: Request, result: R) => Record<string, string>;
};

type ErrorConstructor<T extends Error = Error> = new (...args: any[]) => T;
type ErrorHandler<T extends Error = Error, R = any> = (err: T) => R;
type ErrorHandlerPair<T extends Error = Error, R = any> = [ErrorConstructor<T>, ErrorHandler<T, R>];
wireHarness.errorHandlers = [] as (ErrorHandlerPair[]);

wireHarness.addErrorHandler = <T extends Error, R = any>(Type: ErrorConstructor<T>, handle: ErrorHandler<T, R>) => {
  wireHarness.errorHandlers.push([Type, handle as unknown as ErrorHandler]);
};

function wireHarness<T extends any[], R>({
  method, uri, guards, getArgs, execute, addHeaders
}: HarnessSpec<T, R>) {
  const main = async (req: Request, res: Response, next: Next) => {
    const args = getArgs?.(req) ?? ([] as unknown as T);
    try {
      const data = await execute(...args);
      if (data === undefined || data === null) {
        throw new ResourceNotFoundError();
      }
      const headers = addHeaders?.(req, data) ?? {};
      res.json(data, headers);
      next();
    } catch (err) {
      const { url } = req;
      if (!err) {
          console.log(`Unknown error with url: ${url}`);
          return new InternalServerError("Internal server error");
        }

        // Check for errors we raise ourselves via internal error handling.
        if (err instanceof RestError || err instanceof HttpError) {
          if (err instanceof ResourceNotFoundError) {
            err = new ResourceNotFoundError(`Resource Not Found: ${url ?? ""}`);
          }
          return err;
        }

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
        console.log(err);
        console.log(err.stack);
        return new InternalServerError("Internal server error");
    }

  };
  const register = (server: Server) => {
    server[method].call(server, uri, ...guards, main);
  };
  Object.assign(main, {
    method,
    uri,
    guards,
    getArgs,
    execute,
    register,
  });
  return main;
}

/* Sample */
export const getUserNotes1 = wireHarness({
  method: "get",
  uri: '/userNotes',
  guards: [AuthorizationServices.admin],
  getArgs: (req: Request): [number, number, string] => [
    Number(req.params.userId),
    getOwnId(req) ?? 1,
    req.body.note ?? "",
  ],
  execute: Database.addUserNote,
});
