import prisma from '../../database'
import app from '../../'
import request from 'supertest'
import { createUser, loginUser } from '../../controllers'

describe('/users', () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('POST /users/', () => {
    let body: any

    beforeEach(() => {
      body = {
        email: 'user@example.com',
        password: 'SuperPassword'
      }
    })

    it('creates a new user when body is valid', async () => {
      const res = await request(app).post('/users')
        .set('Content-Type', 'application/json')
        .send(body)

      expect(res.statusCode).toBe(201)
      expect(res.body.email).toBe(body.email)
      expect(res.body.id).toBeDefined()
      expect(res.body.hash).not.toBeDefined()

      const user = await prisma.user.findFirst({ where: { id: res.body.id } })

      expect(user).not.toBeNull()
      expect(user?.email).toBe(res.body.email)
      expect(user?.hash).not.toBe(false)
    })

    it("doesn't create a new user when user exists with email", async () => {
      await createUser(body)
      const res = await request(app).post('/users')
        .set('Content-Type', 'application/json')
        .send(body)

      expect(res.status).toBe(400)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": {},
          "message": "A user exists with this email.",
        }
      `)
    })

    it("doesn't create a new user when body is invalid", async () => {
      body.email = 'NOT AN EMAIL'

      let res = await request(app).post('/users')
        .set('Content-Type', 'application/json')
        .send(body)

      expect(res.statusCode).toBe(400)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": ""email" must be a valid email",
          "message": "Bad Request",
        }
      `)

      body.email = 'user@example.com'
      body.password = 'invalid'

      res = await request(app).post('/users')
        .set('Content-Type', 'application/json')
        .send(body)

      expect(res.statusCode).toBe(400)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": ""password" length must be at least 8 characters long",
          "message": "Bad Request",
        }
      `)
    })
  })

  describe('POST /users/login', () => {
    const details = {
      email: 'user@example.com',
      password: 'SuperPassword'
    }

    beforeEach(async () => {
      await createUser(details)
    })

    it('authenticates user with valid credentials', async () => {
      const res = await request(app).post('/users/login')
        .set('Content-Type', 'application/json')
        .send(details)

      expect(res.body.accessToken).not.toBeFalsy()
      expect(res.statusCode).toBe(200)
      expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=\S+/)
    })

    it("doesn't authenticate user with bad request body", async () => {
      details.email = 'WRONG EMAIL'

      let res = await request(app).post('/users/login')
        .set('Content-Type', 'application/json')
        .send(details)
      expect(res.statusCode).toBe(400)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": ""email" must be a valid email",
          "message": "Bad Request",
        }
      `)

      details.email = 'user@example.com'
      details.password = 'SHORT'
      res = await request(app).post('/users/login')
        .set('Content-Type', 'application/json')
        .send(details)

      expect(res.statusCode).toBe(400)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": ""password" length must be at least 8 characters long",
          "message": "Bad Request",
        }
      `)
    })

    it("doesn't authenticate user with wrong password", async () => {
      details.password = 'WRONG_PASSWORD'
      const res = await request(app).post('/users/login')
        .set('Content-Type', 'application/json')
        .send(details)

      expect(res.statusCode).toBe(401)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": {},
          "message": "Invalid email or password",
        }
      `)
    })
  })

  describe('POST /users/tokens/refresh', () => {
    const details = {
      email: 'user@example.com',
      password: 'SuperPassword'
    }
    let token: string

    beforeEach(async () => {
      await createUser(details)
      token = (await loginUser(details)).cookie.value
    })

    it('generates a new set of tokens for valid refresh token', async () => {
      const res = await request(app)
        .post('/users/tokens/refresh')
        .set('Cookie', `refreshToken=${token}`)
        .send()
      expect(res.body.accessToken).not.toBeFalsy()
      expect(res.statusCode).toBe(200)
      expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=\S+/)
    })

    it("doesn't generates a new set of tokens for expired refresh token", async () => {
      const date = new Date()
      date.setDate(date.getDate() + 1)

      jest.useFakeTimers().setSystemTime(date)

      const res = await request(app)
        .post('/users/tokens/refresh')
        .set('Cookie', `refreshToken=${token}`)
        .send()

      expect(res.statusCode).toBe(401)

      jest.useRealTimers()
    })

    it("doesn't generates a new set of tokens when token isn't provided", async () => {
      const date = new Date()
      date.setDate(date.getDate() + 1)

      jest.useFakeTimers().setSystemTime(date)

      const res = await request(app).post('/users/tokens/refresh')
        .send()

      expect(res.statusCode).toBe(401)

      jest.useRealTimers()
    })
  })

  describe('GET /users/me', () => {
    const details = {
      email: 'user@example.com',
      password: 'SuperPassword'
    }
    let token: string

    beforeEach(async () => {
      await createUser(details)
      token = (await loginUser(details)).data.accessToken
    })

    it('retrieves the details of current user', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('Authorization', `Bear ${token}`)
        .send()

      expect(res.statusCode).toBe(200)
      expect(res.body.email).toBe(details.email)
      expect(res.body.id).not.toBeUndefined()
    })
  })
})
