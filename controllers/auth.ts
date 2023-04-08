import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { type User } from '@prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import prisma from '../database'
import { type CreateUser, type LoginUser } from '../middlewares/schemas'
import { ServiceError } from '../utils'
import { JWT_SECRET } from '../config'

const ONE_DAY_IN_MILI = 24 * 60 * 60 * 1000

/**
 * Creates a new user
 * @param details the details of the new user
 * @returns the newly created user and status code
 */
export async function createUser (details: CreateUser) {
  const { email, password } = details
  let user

  try {
    const hash = await hashPassword(password)
    user = await prisma.user.create({
      data: { email, hash },
      select: { email: true, id: true }
    })
  } catch (err: any) {
    const isPrismaError = err instanceof PrismaClientKnownRequestError

    if (!isPrismaError) {
      throw new Error(err.message)
    }

    if (err.code !== 'P2002') {
      throw new ServiceError('Internal Service Error')
    }

    throw new ServiceError('A user exists with this email.', 400)
  }

  return {
    status: 201,
    data: user
  }
}

/**
 * Authenticated user and return access token
 * @param details the details of the user
 * @returns the access token and status code
 */
export async function loginUser (details: LoginUser) {
  const { email, password } = details
  const user = await prisma.user.findFirst({ where: { email } })

  if (user == null) {
    throw new ServiceError('Invalid email or password', 401)
  }

  const isValidPassword = await bcrypt.compare(password, user.hash)

  if (!isValidPassword) {
    throw new ServiceError('Invalid email or password', 401)
  }

  const { refreshToken, accessToken } = await generateToken(user)

  return {
    status: 200,
    data: { accessToken },
    cookie: {
      name: 'refreshToken',
      value: refreshToken,
      options: { httpOnly: true, expiresIn: ONE_DAY_IN_MILI }
    }
  }
}

/**
 * Refreshes user access token
 * @param cookies the request cookies
 * @returns a new access token and updates cookies
 */
export async function refreshToken (cookies: Record<string, any>) {
  let tokenUser: any

  try {
    tokenUser = jwt.verify(cookies.refreshToken, JWT_SECRET)
  } catch (error: any) {
    throw new ServiceError('Unauthorised', 401, error)
  }

  const user = await prisma.user.findFirst({
    where: { email: tokenUser.email },
    select: { id: true, email: true }
  })

  if (user == null) {
    throw new ServiceError('Unauthorised', 401)
  }

  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '20m' })
  const newRefreshToken = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' })

  // Adding a date to the expiration date.
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + 1)

  return {
    status: 200,
    data: { accessToken },
    cookie: {
      name: 'refreshToken',
      value: newRefreshToken,
      options: { httpOnly: true, maxAge: ONE_DAY_IN_MILI }
    }
  }
}

/**
 * Gets the user details
 * @param tokenUser the tokenised user
 * @returns returns the user and status code
 */
export async function getUser (tokenUser: User) {
  const { email } = tokenUser

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true }
  })

  if (user == null) {
    throw new ServiceError('Unauthourised', 401)
  }

  return {
    status: 200,
    data: user
  }
}

/**
 * Hashes string (idealy user password).
 * @param password a string to hash
 * @returns the has of the the string
 */
export async function hashPassword (password: string) {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

/**
 * Generates an new access and refresh token containing the details
 * @param user the user content to embed
 * @returns the access and refresh token
 */
async function generateToken (user: User) {
  const trimmedUser = { ...user, hash: undefined }

  const accessToken = jwt.sign(trimmedUser, JWT_SECRET, { expiresIn: '20m' })
  const refreshToken = jwt.sign(trimmedUser, JWT_SECRET, { expiresIn: '1d' })

  return {
    accessToken,
    refreshToken
  }
}
