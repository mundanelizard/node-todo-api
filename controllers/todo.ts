import { type User } from '@prisma/client'
import prisma from '../database'
import { ServiceError } from '../utils'
import { type CreateTodo, type UpdateTodo } from '../middlewares/schemas'

/**
 * Adds a todo to a user list of todos
 * @param user user details
 * @param details the details of the todo
 * @returns the todo and the status code
 */
export async function addTodo (user: User, details: CreateTodo) {
  const { content } = details

  const todo = await prisma.todo.create({
    data: { content, ownerId: user.id }
  })

  return {
    status: 201,
    data: todo
  }
}

/**
 * Updates the user's todo
 * @param user user details containing user 'id'
 * @param params the request params containing todo 'id'
 * @param details details to update in the todo
 * @returns the updated post and the status code
 */
export async function updateTodo (
  user: User,
  params: Record<string, string>,
  details: UpdateTodo
) {
  const { id: ownerId } = user
  const { id } = params
  const { content, completed } = details

  const { count } = await prisma.todo.updateMany({
    where: { id, ownerId },
    data: { content, completed }
  })

  return {
    status: count === 1 ? 200 : 404,
    data: await prisma.todo.findFirst({ where: { id, ownerId } })
  }
}

/**
 * Retrieves all the todo associated with a user.
 * @param param the user details
 * @returns a list of todos and status code
 */
export async function allTodos ({ id: ownerId }: User) {
  return {
    status: 200,
    data: await prisma.todo.findMany({ where: { ownerId } })
  }
}

/**
 * Retrives a single todo associated with a user
 * @param user the user token details.
 * @param params the params of the request
 * @returns the status code and the todo.
 */
export async function getTodo (user: User, params: Record<string, string>) {
  const { id: ownerId } = user
  const { id: todoId } = params
  const todo = await prisma.todo.findFirst({ where: { id: todoId } })

  if (todo == null) {
    throw new ServiceError(`Todo ${todoId} not found`, 404)
  } else if (todo.ownerId !== ownerId) {
    throw new ServiceError('Unauthorised', 401)
  }

  return {
    status: 200,
    data: todo
  }
}

/**
 * Deletes a todo associated with the user.
 * @param user the user token details.
 * @param params the params containing the 'id' of the post to delete
 * @returns the status code.
 */
export async function deleteTodo (user: User, params: Record<string, string>) {
  const { id: ownerId } = user
  const { id } = params

  const { count } = await prisma.todo.updateMany({
    where: { id, ownerId, deleted: false },
    data: { deleted: true }
  })

  return {
    status: count === 1 ? 204 : 404
  }
}
