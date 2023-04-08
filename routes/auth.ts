import { Router } from 'express'
import {
  createUser,
  getUser,
  loginUser,
  refreshToken
} from '../controllers'
import { requestHandlerForward } from '../utils'
import { isAuthenticated, validateBodyAgainstSchema } from '../middlewares'
import { loginSchema, createUserSchema } from '../middlewares/schemas'

const router = Router()

/**
 * Gets a user
 */
router.get('/me',
  isAuthenticated(),
  requestHandlerForward(getUser, 'user')
)

/**
 * Creates a user
 */
router.post(
  '/',
  validateBodyAgainstSchema(createUserSchema),
  requestHandlerForward(createUser, 'body')
)

/**
 * Authenticates user and generate access token
 */
router.post(
  '/login',
  validateBodyAgainstSchema(loginSchema),
  requestHandlerForward(loginUser, 'body')
)

/**
 * Refreshes expired access token.
 */
router.post(
  '/tokens/refresh',
  requestHandlerForward(refreshToken, 'cookies')
)

export default router
