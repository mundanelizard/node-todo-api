import request from 'supertest'
import app from '../..'
import { addTodo, createUser, loginUser } from '../../controllers'
import prisma from '../../database'

describe('/todos', () => {
  let token: string
  let user: any

  beforeEach(async () => {
    const details = {
      email: 'user@example.com',
      password: 'SuperPassword'
    }
    await prisma.todo.deleteMany()
    await prisma.user.deleteMany()
    user = (await createUser(details)).data
    token = (await loginUser(details)).data.accessToken
  })

  describe('POST /todos/', () => {
    it('creates a new todo for a user', async () => {
      const content = 'CONTENT'
      const res = await request(app)
        .post('/todos/')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send({ content })

      expect(res.statusCode).toBe(201)
      expect(res.body.content).toBe(content)
      expect(res.body.id).not.toBeFalsy()
      expect(res.body.completed).toBeFalsy()
      expect(res.body.content).toMatch(content)

      const todo = await prisma.todo.findFirst({ where: { id: res.body.id } })

      expect(res.body).toEqual(todo)
    })

    it("doesn't create todo when given bad request body", async () => {
      const res = await request(app)
        .post('/todos/')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send({})

      expect(res.statusCode).toBe(400)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": ""content" is required",
          "message": "Bad Request",
        }
      `)
    })

    it("doesn't create todo for unauthorised body", async () => {
      const res = await request(app)
        .post('/todos/')
        .set('Authorization', 'Bearer BAD_TOKEN')
        .set('Content-Type', 'application/json')
        .send({ content: 'CONTENT' })

      expect(res.statusCode).toBe(401)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": {
            "message": "jwt malformed",
            "name": "JsonWebTokenError",
          },
          "message": "Unauthorised",
        }
      `)
    })
  })

  describe('GET /todos/', () => {
    const todos: any[] = []

    beforeEach(async () => {
      todos.push((await addTodo(user, { content: 'CONTENT' })).data)
      todos.push((await addTodo(user, { content: 'CONTENT' })).data)
      const tempUser: any = (
        await createUser({ email: 'test@email.com', password: 'password' })
      ).data
      todos.push((await addTodo(tempUser, { content: 'CONTENT' })).data)
    })

    it('retrieves all todos associated to the user', async () => {
      const res = await request(app)
        .get('/todos')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send()

      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual(todos.slice(0, 2))
    })

    it("doesn't retrieves all todos for unauthorised user", async () => {
      const res = await request(app)
        .get('/todos')
        .set('Authorization', 'Bearer BAD_TOKEN')
        .set('Content-Type', 'application/json')
        .send()

      expect(res.statusCode).toBe(401)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": {
            "message": "jwt malformed",
            "name": "JsonWebTokenError",
          },
          "message": "Unauthorised",
        }
      `)
    })
  })

  describe('GET /todos/:id', () => {
    const todos: any[] = []

    beforeEach(async () => {
      todos.push((await addTodo(user, { content: 'CONTENT' })).data)
      todos.push((await addTodo(user, { content: 'CONTENT' })).data)
      const tempUser: any = (
        await createUser({ email: 'test@email.com', password: 'password' })
      ).data
      todos.push((await addTodo(tempUser, { content: 'CONTENT' })).data)
    })

    it('retrieves all todos associated to the user', async () => {
      const todo = todos[0]
      const todoId = todo.id
      const res = await request(app)
        .get('/todos/' + todoId)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send()

      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual(todo)
    })

    it("doesn't retrieves all todos for unauthorised user", async () => {
      const todo = todos[0]
      const todoId = todo.id
      const res = await request(app)
        .get('/todos/' + todoId)
        .set('Authorization', 'Bearer BAD_TOKEN')
        .set('Content-Type', 'application/json')
        .send()

      expect(res.statusCode).toBe(401)
      expect(res.body).toMatchInlineSnapshot(`
        {
          "details": {
            "message": "jwt malformed",
            "name": "JsonWebTokenError",
          },
          "message": "Unauthorised",
        }
      `)
    })

    it("doesn't allow user to retrieve another user's todo", async () => {
      const todo = todos[2]
      const todoId = todo.id
      const res = await request(app)
        .get('/todos/' + todoId)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send()

      expect(res.statusCode).toBe(404)
    })
  })

  describe('PUT /todos/:id', () => {
    const todos: any[] = []

    beforeEach(async () => {
      todos.push((await addTodo(user, { content: 'CONTENT' })).data)
      todos.push((await addTodo(user, { content: 'CONTENT' })).data)
      const tempUser: any = (
        await createUser({ email: 'test@email.com', password: 'password' })
      ).data
      todos.push((await addTodo(tempUser, { content: 'CONTENT' })).data)
    })

    it('updates todo to match according to user request body', async () => {
      const todo = todos[0]
      const todoId = todo.id
      const body = { content: 'NEW_CONTENT', completed: true }

      let res = await request(app)
        .put('/todos/' + todoId)
        .set('Authorization', `Bearer ${token}`)
        .send(body)

      expect(res.statusCode).toBe(200)
      expect(res.body.id).toEqual(todoId)
      expect(res.body.content).toEqual(body.content)
      expect(res.body.completed).toEqual(body.completed)

      const content = 'NEWER_CONTENT'

      res = await request(app)
        .put('/todos/' + todoId)
        .set('Authorization', `Bearer ${token}`)
        .send({ content })

      expect(res.statusCode).toBe(200)
      expect(res.body.id).toEqual(todoId)
      expect(res.body.content).toEqual(content)
      expect(res.body.completed).toEqual(body.completed)

      const completed = false

      res = await request(app)
        .put('/todos/' + todoId)
        .set('Authorization', `Bearer ${token}`)
        .send({ completed })

      expect(res.statusCode).toBe(200)
      expect(res.body.id).toEqual(todoId)
      expect(res.body.content).toEqual(content)
      expect(res.body.completed).toEqual(completed)
    })

    it("doesn't update non existent todo or a todo that belongs to another user", async () => {
      let res = await request(app)
        .put('/todos/' + 'BAD_TODO_ID')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'NEW_CONTENT' })

      expect(res.statusCode).toBe(404)
      expect(res.body.id).toBeUndefined()

      const todo = todos[2]
      const todoId = todo.id

      res = await request(app)
        .put('/todos/' + todoId)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'NEW_CONTENT' })

      expect(res.statusCode).toBe(404)
      expect(res.body.id).toBeUndefined()
    })
  })

  describe('DELETE /todos/:id', () => {
    const todos: any[] = []

    beforeEach(async () => {
      todos.push((await addTodo(user, { content: 'CONTENT' })).data)
      todos.push((await addTodo(user, { content: 'CONTENT' })).data)
      const tempUser: any = (
        await createUser({ email: 'test@email.com', password: 'password' })
      ).data
      todos.push((await addTodo(tempUser, { content: 'CONTENT' })).data)
    })

    it('deletes todo to match according to user request body', async () => {
      const todo = todos[0]
      const todoId = todo.id

      const res = await request(app)
        .delete('/todos/' + todoId)
        .set('Authorization', `Bearer ${token}`)
        .send()

      expect(res.statusCode).toBe(204)
    })

    it("doesn't delete non existent todo or a todo that belongs to another user", async () => {
      let res = await request(app)
        .delete('/todos/' + 'BAD_TODO_ID')
        .set('Authorization', `Bearer ${token}`)
        .send()

      expect(res.statusCode).toBe(404)
      expect(res.body.id).toBeUndefined()

      const todo = todos[2]
      const todoId = todo.id

      res = await request(app)
        .delete('/todos/' + todoId)
        .set('Authorization', `Bearer ${token}`)
        .send()

      expect(res.statusCode).toBe(404)
      expect(res.body.id).toBeUndefined()
    })
  })
})
