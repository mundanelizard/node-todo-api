import { prismaMock } from './singleton'
import {
  createUser,
  getUser,
  hashPassword,
  loginUser,
  refreshToken
} from '../auth'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../../config'

describe('Authentication', () => {
  const details = {
    email: 'user@example.com',
    password: 'Alphabetical'
  }

  describe('createUser', () => {
    beforeEach(() => {
      prismaMock.user.create.mockClear()
    })

    it('creates a new user with the params are valid', async () => {
      const user = {
        email: 'user@example.com',
        id: 'RANDOM_UUID'
      }

      prismaMock.user.create.mockResolvedValueOnce(user as any)

      const res = await createUser(details)
      const query = prismaMock.user.create.mock.calls[0][0].data

      expect(res.status).toBe(201)
      expect(res.data).toBe(user)
      expect(query.email).toBe(details.email)
      expect(query.hash).not.toBeFalsy()
    })

    it("doesn't create user when unique email constraint fails", async () => {
      const error = new PrismaClientKnownRequestError('ERROR_MESSAGE', {
        code: 'P2002',
        clientVersion: '4'
      })

      prismaMock.user.create.mockRejectedValue(error)

      await createUser(details).catch((error) => {
        expect(error).toMatchInlineSnapshot(
          '[Error: A user exists with this email.]'
        )
      })
    })

    it("doesn't create user when there is an unhandled prisma error", async () => {
      const error = new PrismaClientKnownRequestError('ERROR_MESSAGE', {
        code: 'P1001',
        clientVersion: '4'
      })

      prismaMock.user.create.mockRejectedValue(error)

      await createUser(details).catch((error) => {
        expect(error).toMatchInlineSnapshot('[Error: Internal Service Error]')
      })
    })

    it("doesn't create user when an unexpected error occurs", async () => {
      const error = new Error('ERROR_MESSAGE')

      prismaMock.user.create.mockRejectedValue(error)

      await createUser(details).catch((e) => {
        expect(e.message).toBe(error.message)
      })
    })
  })

  describe('loginUser', () => {
    const user = {
      id: 'RANDOM_UUID',
      email: details.email,
      hash: ''
    }

    beforeEach(async () => {
      user.hash = await hashPassword(details.password)
    })

    it('successfully logs in user and create an access token', async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(user)
      const data = await loginUser(details)

      let decodedToken: any = jwt.verify(data.data.accessToken, JWT_SECRET)

      expect(data.status).toBe(200)
      expect(decodedToken.exp).toBeGreaterThan(Date.now() / 1000)
      expect(decodedToken.email).toBe(details.email)
      expect(decodedToken.id).toBe(user.id)

      decodedToken = jwt.verify(data.cookie.value, JWT_SECRET)

      expect(data.cookie.name).toBe('refreshToken')
      expect(decodedToken.exp).toBeGreaterThan(Date.now() / 1000)
      expect(decodedToken.email).toBe(details.email)
      expect(decodedToken.id).toBe(user.id)

      expect(prismaMock.user.findFirst.mock.calls[0][0]?.where?.email).toBe(
        details.email
      )
    })

    it("doesen't create access token when email isn't associated with a user.", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(null)
      await loginUser(details).catch((error) => {
        expect(error).toMatchInlineSnapshot(
          '[Error: Invalid email or password]'
        )

        expect(prismaMock.user.findFirst.mock.calls[0][0]?.where?.email).toBe(
          details.email
        )
      })
    })

    it("doesen't create access token when email isn't associated with a user.", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(user)

      await loginUser({ ...details, password: 'wrong-password' }).catch(
        (error) => {
          expect(error).toMatchInlineSnapshot(
            '[Error: Invalid email or password]'
          )

          expect(prismaMock.user.findFirst.mock.calls[0][0]?.where?.email).toBe(
            details.email
          )
        }
      )
    })
  })

  describe('refreshToken', () => {
    let token: string
    const user = {
      email: 'user@example.com',
      id: 'RANDOM_UUID',
      hash: 'HASH'
    }

    beforeEach(async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(user)
      user.hash = await hashPassword(details.password)
      token = (await loginUser(details)).cookie.value
      prismaMock.user.findFirst.mockClear()
    })

    it('generates a new set of token for an authenticated user', async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(user)
      const data = await refreshToken({ refreshToken: token })

      let decodedToken: any = jwt.verify(data.data.accessToken, JWT_SECRET)

      expect(data.status).toBe(200)
      expect(decodedToken.exp).toBeGreaterThan(Date.now() / 1000)
      expect(decodedToken.email).toBe(details.email)
      expect(decodedToken.id).toBe(user.id)

      decodedToken = jwt.verify(data.cookie.value, JWT_SECRET)

      expect(data.cookie.name).toBe('refreshToken')
      expect(decodedToken.exp).toBeGreaterThan(Date.now() / 1000)
      expect(decodedToken.email).toBe(details.email)
      expect(decodedToken.id).toBe(user.id)

      expect(prismaMock.user.findFirst.mock.calls[0][0]?.where?.email).toBe(
        details.email
      )
    })

    it("doesn't generate new token set for expired token", async () => {
      const date = new Date()
      date.setDate(date.getDate() + 1)

      jest.useFakeTimers().setSystemTime(date)

      await refreshToken({ refreshToken: token }).catch((error) => {
        expect(error).toMatchInlineSnapshot('[Error: Unauthorised]')
        expect(prismaMock.user.findFirst).not.toHaveBeenCalled()
      })

      jest.useRealTimers()
    })

    it("doesn't generate new token set for non existent user", async () => {
      await refreshToken({ refreshToken: token }).catch((error) => {
        prismaMock.user.findFirst.mockResolvedValueOnce(null)
        expect(error).toMatchInlineSnapshot('[Error: Unauthorised]')
        expect(prismaMock.user.findFirst).toHaveBeenCalled()
      })
    })
  })

  describe('getUser', () => {
    const user = {
      email: 'user@example.com',
      id: 'RANDOM_UUID',
      hash: 'HASH'
    }

    it('retrieves the user from the database', async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(user)
      const data = await getUser(user)

      expect(data.status).toBe(200)
      expect(data.data).toBe(user)
    })

    it('retrieves the user from the database', () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(null)
      expect(getUser(user)).rejects.toMatchInlineSnapshot(
        '[Error: Unauthourised]'
      )
    })
  })
})
