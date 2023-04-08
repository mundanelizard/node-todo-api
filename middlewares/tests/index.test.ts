import Joi from 'joi'
import { isAuthenticated, validateBodyAgainstSchema } from '..'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../../config'

describe('middlewares', () => {
  let req: any, res: any
  let next: any

  beforeEach(() => {
    next = jest.fn()
    req = {}
    res = {}
    res.status = jest.fn(() => res)
    res.send = jest.fn()
    res.cookie = jest.fn()
  })

  describe('validateBodyAgainstSchema', () => {
    it('allows function with valid req body to access next middleware', async () => {
      const schema = Joi.object({ name: Joi.string().required() })
      const handler = validateBodyAgainstSchema(schema)

      req.body = { name: 'NAME' }

      await handler(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })

    it("doesn't allow req with bad body to access the next middleware", async () => {
      const schema = Joi.object({ name: Joi.string().required() })
      const handler = validateBodyAgainstSchema(schema)

      req.body = { name: 1 }

      await handler(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.send.mock.calls[0][0]).toMatchInlineSnapshot(`
        {
          "details": ""name" must be a string",
          "message": "Bad Request",
        }
      `)
      expect(next).not.toHaveBeenCalled()
    })

    it('throws an error when given an invalid schema object', () => {
      expect(() =>
        validateBodyAgainstSchema({})
      ).toThrowErrorMatchingInlineSnapshot(
        '"Invalid schema type [object Object]"'
      )
    })
  })

  describe('isAuthenticated', () => {
    it('allows authorised request access the next middleware', async () => {
      const token = jwt.sign({}, JWT_SECRET, { expiresIn: '5m' })
      req.headers = {
        authorization: `Bearer ${token}`
      }

      const handler = isAuthenticated()

      await handler(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it("doesn't allow req without authorization header to access the next middleware", async () => {
      req.headers = {
        authorization: ''
      }

      const handler = isAuthenticated()

      await handler(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send.mock.calls[0][0]).toMatchInlineSnapshot(`
        {
          "details": {},
          "message": "Unauthorised",
        }
      `)
    })

    it("doesn't allow req with bad token to access the next middleware", async () => {
      const token = jwt.sign({}, JWT_SECRET, { expiresIn: '5m' })
      req.headers = {
        authorization: `Bear ${token}INVALID_SIG`
      }

      const handler = isAuthenticated()

      await handler(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send.mock.calls[0][0]).toMatchInlineSnapshot(`
        {
          "details": [JsonWebTokenError: invalid signature],
          "message": "Unauthorised",
        }
      `)
    })

    it("doesn't allow expired req token to access the next middleware", async () => {
      const token = jwt.sign({}, JWT_SECRET, { expiresIn: '1s' })
      req.headers = {
        authorization: `Bear ${token}`
      }

      jest.useFakeTimers()

      jest.advanceTimersByTime(1000)

      const handler = isAuthenticated()

      await handler(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send.mock.calls[0][0]).toMatchInlineSnapshot(`
        {
          "details": [TokenExpiredError: jwt expired],
          "message": "Unauthorised",
        }
      `)

      jest.useRealTimers()
    })
  })
})
