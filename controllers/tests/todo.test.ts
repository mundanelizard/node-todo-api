import { prismaMock } from './singleton'
import { addTodo, allTodos, deleteTodo, getTodo, updateTodo } from '../todo'

describe('Todos', () => {
  const user = {
    id: 'RANDOM_UUID',
    email: 'user@example.com',
    hash: 'HASH'
  }

  describe('addTodo', () => {
    it('creates a new todo', async () => {
      const content = 'HELLO_WORLD'
      const todo = {
        id: 'RANDOM_UUID',
        ownerId: user.id,
        content,
        completed: false,
        deleted: false
      }

      prismaMock.todo.create.mockResolvedValueOnce(todo)
      const res = await addTodo(user, { content })

      expect(res.status).toBe(201)
      expect(res.data).toBe(todo)
      expect(prismaMock.todo.create.mock.calls[0][0].data.content).toBe(
        content
      )
      expect(prismaMock.todo.create.mock.calls[0][0].data.ownerId).toBe(
        user.id
      )
    })
  })

  describe('updateTodo', () => {
    it("updates todo when 'content' is provided", async () => {
      const content = 'UPDATED_CONTENT'
      const todo = {
        id: 'RANDOM_UUID',
        ownerId: user.id,
        content,
        completed: false,
        deleted: false
      }

      prismaMock.todo.updateMany.mockResolvedValueOnce({ count: 1 })
      prismaMock.todo.findFirst.mockResolvedValueOnce(todo)
      const res = await updateTodo(user, { id: todo.id }, { content } as any)

      expect(res.status).toBe(200)
      expect(res.data).toBe(todo)
      expect(prismaMock.todo.updateMany.mock.calls[0][0]?.where?.id).toBe(
        todo.id
      )
      expect(prismaMock.todo.updateMany.mock.calls[0][0].data.content).toBe(
        content
      )
    })

    it("updates todo when 'completed' is provided", async () => {
      const completed = true
      const todo = {
        id: 'RANDOM_UUID',
        ownerId: user.id,
        content: '',
        completed,
        deleted: false
      }

      prismaMock.todo.updateMany.mockResolvedValueOnce({ count: 1 })
      prismaMock.todo.findFirst.mockResolvedValueOnce(todo)
      const res = await updateTodo(user, { id: todo.id }, { completed } as any)

      expect(res.status).toBe(200)
      expect(res.data).toBe(todo)
      expect(prismaMock.todo.updateMany.mock.calls[0][0]?.where?.id).toBe(
        todo.id
      )
      expect(prismaMock.todo.updateMany.mock.calls[0][0].data.completed).toBe(
        completed
      )
    })

    it("updates todo when 'completed' and 'content' are provided", async () => {
      const completed = true
      const content = 'CONTENT'
      const todo = {
        id: 'RANDOM_UUID',
        ownerId: user.id,
        content,
        completed,
        deleted: false
      }

      prismaMock.todo.updateMany.mockResolvedValueOnce({ count: 1 })
      prismaMock.todo.findFirst.mockResolvedValueOnce(todo)
      const res = await updateTodo(user, { id: todo.id }, {
        completed,
        content
      } as any)

      expect(res.status).toBe(200)
      expect(res.data).toBe(todo)
      expect(prismaMock.todo.updateMany.mock.calls[0][0]?.where?.id).toBe(
        todo.id
      )
      expect(prismaMock.todo.updateMany.mock.calls[0][0]?.data.completed).toBe(
        completed
      )
      expect(prismaMock.todo.updateMany.mock.calls[0][0]?.data.content).toBe(
        content
      )
    })
  })

  describe('allTodos', () => {
    const todo = {
      id: 'RANDOM_UUID',
      ownerId: user.id,
      content: 'CONTENT',
      completed: true,
      deleted: false
    }

    it('retrieves all todos associated with a user', async () => {
      const todos = [todo]
      prismaMock.todo.findMany.mockResolvedValueOnce(todos)
      const res = await allTodos(user)

      expect(res.status).toBe(200)
      expect(res.data).toBe(todos)
      expect(prismaMock.todo.findMany.mock.calls[0][0]?.where?.ownerId).toBe(
        user.id
      )
    })
  })

  describe('getTodo', () => {
    const todo = {
      id: 'RANDOM_UUID',
      ownerId: user.id,
      content: 'CONTENT',
      completed: true,
      deleted: false
    }

    it('retrieves todo that matches id', async () => {
      prismaMock.todo.findFirst.mockResolvedValue(todo)
      const res = await getTodo(user, { id: todo.id })

      expect(res.status).toBe(200)
      expect(res.data).toBe(todo)
      expect(prismaMock.todo.findFirst.mock.calls[0][0]?.where?.id).toBe(
        todo.id
      )
    })

    it("throws an error when the todo owner doesn't match", () => {
      prismaMock.todo.findFirst.mockResolvedValue(todo)
      const promise = getTodo({ ...user, id: 'WRONG_ID' }, { id: todo.id })
      expect(promise).rejects.toMatchInlineSnapshot('[Error: Unauthorised]')
      expect(prismaMock.todo.findFirst.mock.calls[0][0]?.where?.id).toBe(
        todo.id
      )
    })

    it("throws an error when the todo doesn't exists", () => {
      prismaMock.todo.findFirst.mockResolvedValue(null)
      const promise = getTodo(user, { id: todo.id })
      expect(promise).rejects.toMatchInlineSnapshot(
        '[Error: Todo RANDOM_UUID not found]'
      )
      expect(prismaMock.todo.findFirst.mock.calls[0][0]?.where?.id).toBe(
        todo.id
      )
    })
  })

  describe('deleteTodo', () => {
    it('soft deletes a todo item', async () => {
      prismaMock.todo.updateMany.mockResolvedValue({ count: 1 })
      const res = await deleteTodo(user, { id: 'RANDOM_UUID' })

      expect(res.status).toBe(204)
    })
  })
})
