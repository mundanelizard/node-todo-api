import 'dotenv/config'

export const PORT = process.env.PORT ?? 5000
export const NODE_ENV = process.env.NODE_ENV
export const JWT_SECRET = process.env.JWT_SECRET ?? 'secret'
