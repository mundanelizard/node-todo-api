import joi from 'joi'

export interface CreateUser {
  email: string
  password: string
}

export const createUserSchema = joi.object({
  email: joi.string().email()
    .required(),
  password: joi.string().min(8)
    .required()
})

export interface LoginUser extends CreateUser {}

export const loginSchema = joi.object({
  email: joi.string().email()
    .required(),
  password: joi.string().min(8)
    .required()
})

export interface CreateTodo {
  content: string
}

export const createTodoSchema = joi.object({
  content: joi.string().min(1)
    .required()
})

export interface UpdateTodo {
  id: string
  content?: string
  completed?: boolean
}

export const updateTodoSchema = joi
  .object({
    content: joi.string(),
    completed: joi.bool()
  })
  .or('content', 'completed')
