import {
  ServiceError,
  requestHandler,
  requestHandlerForward
} from '../request'
import logger from '../logger'

jest.mock('../logger')

describe('Express request utilities', () => {
  let req: any, res: any

  beforeEach(() => {
    req = {}
    res = {}
    res.status = jest.fn(() => res)
    res.send = jest.fn()
    res.cookie = jest.fn()
  })

  describe('ServiceError', () => {
    it('returns error details that matches the input', () => {
      const message = 'MESSAGE'
      const status = 400
      const data = {}

      const error = new ServiceError(message, status, data)
      const details = error.getDetails()

      expect(details.data).toBe(data)
      expect(details.status).toBe(status)
      expect(details.message).toBe(message)
    })

    it("sets status to '500' and data to '{}' when they are not set", () => {
      const message = 'MESSAGE'

      const error = new ServiceError(message)
      const details = error.getDetails()

      expect(details.data).toMatchObject({})
      expect(details.status).toBe(500)
      expect(details.message).toBe(message)
    })
  })

  describe('requestHandler', () => {
    it('forwards request to handler and resolves responses', async () => {
      const data = { status: 200, data: {} }
      const controller = jest.fn().mockResolvedValue(data)
      const handler = requestHandler(controller)

      await handler(req, res)

      expect(controller).toHaveBeenCalledWith(req)
      expect(controller).toHaveBeenCalledTimes(1)
      expect(res.status).toHaveBeenCalledWith(data.status)
      expect(res.send).toHaveBeenCalledWith(data.data)
      expect(res.status).toHaveBeenCalledTimes(1)
      expect(res.send).toHaveBeenCalledTimes(1)
    })

    it('throws an error when provided a non async controller', async () => {
      const controller = jest.fn()
      const handler = requestHandler(controller)

      expect(handler(req, res)).rejects.toThrowErrorMatchingInlineSnapshot(
        '"Invalid handler for route undefined"'
      )
    })

    it('send cookie to user if provided in the controller response object', async () => {
      const cookie = { name: 'test', value: 'test', options: {} }
      const data = { status: 200, data: {}, cookie }
      const controller = jest.fn().mockResolvedValue(data)
      const handler = requestHandler(controller)

      await handler(req, res)

      expect(res.cookie).toHaveBeenCalledWith(
        cookie.name,
        cookie.value,
        cookie.options
      )
      expect(res.cookie).toHaveBeenCalledTimes(1)
      expect(controller).toHaveBeenCalledWith(req)
      expect(controller).toHaveBeenCalledTimes(1)
      expect(res.status).toHaveBeenCalledWith(data.status)
      expect(res.send).toHaveBeenCalledWith(data.data)
      expect(res.status).toHaveBeenCalledTimes(1)
      expect(res.send).toHaveBeenCalledTimes(1)
    })

    it("resolves 'ServiceError' thrown inside controllers", async () => {
      const error = new ServiceError('MESSAGE')
      const controller = jest.fn().mockRejectedValue(error)
      const handler = requestHandler(controller)

      await handler(req, res)

      const errorDetails = error.getDetails()

      const body = {
        details: errorDetails.data,
        message: errorDetails.message
      }

      expect(logger.error).toHaveBeenCalledWith(error)
      expect(controller).toHaveBeenCalledWith(req)
      expect(controller).toHaveBeenCalledTimes(1)
      expect(res.status).toHaveBeenCalledWith(errorDetails.status)
      expect(res.send).toHaveBeenCalledWith(body)
      expect(res.status).toHaveBeenCalledTimes(1)
      expect(res.send).toHaveBeenCalledTimes(1)
    })

    it("resolves 'ServiceError' thrown inside controllers", async () => {
      const error = {}
      const controller = jest.fn().mockRejectedValue(error)
      const handler = requestHandler(controller)

      await handler(req, res)

      expect(logger.error).toHaveBeenCalledWith(error)
      expect(controller).toHaveBeenCalledWith(req)
      expect(controller).toHaveBeenCalledTimes(1)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.send.mock.calls[0][0]).toMatchInlineSnapshot(`
        {
          "details": {},
          "message": "Internal Service Error",
        }
      `)
      expect(res.status).toHaveBeenCalledTimes(1)
      expect(res.send).toHaveBeenCalledTimes(1)
    })
  })

  describe('requestHandlerForward', () => {
    it('fowards value of provide req field name to the controller as arguments', async () => {
      req.body = { content: true }
      req.params = { id: 'id' }

      const controller = jest.fn().mockResolvedValue({})
      const handler = requestHandlerForward(controller, 'body', 'params')

      await handler(req, res)

      expect(controller).toHaveBeenCalledWith(req.body, req.params)
    })
  })
})
