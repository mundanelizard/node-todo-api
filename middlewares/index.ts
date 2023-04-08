import jwt from 'jsonwebtoken'
import { type NextFunction, type Request, type Response } from 'express'
import { type ValidationError } from 'joi'
import { JWT_SECRET } from '../config'

export function validateBodyAgainstSchema (schema: any) {
  if (schema && !schema?.validateAsync) {
    throw new TypeError('Invalid schema type ' + schema)
  }

  return function (req: Request, res: Response, next: NextFunction) {
    return schema
      .validateAsync(req.body, { abortEarly: true })
      .then(() => { next() })
      .catch(function (error: ValidationError) {
        res.status(400).send({
          message: 'Bad Request',
          details: error.details[0].message
        })
      })
  }
}

export function isAuthenticated () {
  return async function (req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      res.status(401).send({ message: 'Unauthorised', details: {} })
      return
    }

    try {
      (req as any).user = jwt.verify(token, JWT_SECRET)
    } catch (error: any) {
      res.status(401).send({ message: 'Unauthorised', details: error })
      return
    }

    next()
  }
}
