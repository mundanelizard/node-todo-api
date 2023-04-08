import { Router } from 'express'
import { requestHandlerForward } from '../utils'
import { addTodo, allTodos, deleteTodo, getTodo, updateTodo } from '../controllers'
import { isAuthenticated, validateBodyAgainstSchema } from '../middlewares'
import { createTodoSchema, updateTodoSchema } from '../middlewares/schemas'

const router = Router()

/**
 * Retrieves all todo created by a user
 */
router.get(
  '/',
  isAuthenticated(),
  requestHandlerForward(allTodos, 'user')
)

/**
 * Retrieves a todo created by a user
 */
router.get(
  '/:id',
  isAuthenticated(),
  requestHandlerForward(getTodo, 'user', 'params')
)

/**
 * Adds a todo to a user's list of todos
 */
router.post('/',
  isAuthenticated(),
  validateBodyAgainstSchema(createTodoSchema),
  requestHandlerForward(addTodo, 'user', 'body')
)

/**
 * Updates a todo created by a user
 */
router.put(
  '/:id',
  isAuthenticated(),
  validateBodyAgainstSchema(updateTodoSchema),
  requestHandlerForward(updateTodo, 'user', 'params', 'body')
)

/**
 * Soft deletes a user todo.
 */
router.delete(
  '/:id',
  isAuthenticated(),
  requestHandlerForward(deleteTodo, 'user', 'params')
)

export default router
