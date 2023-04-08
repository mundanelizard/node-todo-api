import { type CookieOptions, type Request, type Response } from 'express'
import logger from './logger'

/**
 * Represents a service error in a requestHandler controller.
 */
export class ServiceError extends Error {
  constructor (message: string, private readonly status = 500, private readonly data = {}) {
    super(message)
  }

  /**
   * Converts the error details into a simple format.
   * @returns error details
   */
  getDetails () {
    return {
      status: this.status,
      message: this.message,
      data: this.data
    }
  }
}

export interface HandlerResponse {
  data?: any
  status?: any
  cookie?: {
    name: string
    value: string
    options: CookieOptions
  }
}

type Handler = (...param: any) => Promise<HandlerResponse>
type HandlerWrapper = (req: Request) => ReturnType<Handler>

/**
 * Handles a request and resolves responses.
 * @param wrapper a wrapper around a handler or controller.
 * @returns an express request handler.
 */
export function requestHandler (wrapper: HandlerWrapper) {
  return async function (req: Request, res: Response) {
    const handler = wrapper(req)

    // throws an error is the function isn't async.
    if (!handler?.then) {
      throw new Error('Invalid handler for route ' + req.url)
    }

    await handler
      .then((details) => {
        // Extracting the response from the function return value
        const status = details.status || 200
        const data = details.data
        const cookie = details.cookie

        // saving cookies if it exists.
        if (cookie != null) {
          res.cookie(cookie.name, cookie.value, cookie.options)
        }

        res.status(status).send(data)
      })
      .catch((error: any) => {
        // default response if the error isn't of type ServiceError
        let status = 500
        const body = { message: 'Internal Service Error', details: {} }
        const isServiceError = error instanceof ServiceError

        if (!isServiceError) {
          res.status(status).send(body)
          logger.error(error)
          return
        }

        // extracting the error details from ServiceError
        const details = error.getDetails()
        status = details.status
        body.details = details.data
        body.message = details.message

        // logging the error if it is a server error.
        if (status >= 500) {
          logger.error(error)
        }

        res.status(status).send(body)
      })
  }
}

type Fields = string[]

/**
 * Forward request fields to handler and resolves the response.
 * @param handler the controller
 * @param field the name of field of the request object to forward
 * @returns an express request handler.
 */
export function requestHandlerForward (handler: Handler, ...fields: Fields) {
  return requestHandler(async function (req) {
    const args: any[] = []

    // extracing the arguments fields from the request
    fields.map((field: string) => args.push((req as any)[field]))

    return await handler(...args)
  })
}
