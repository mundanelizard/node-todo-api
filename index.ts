import express from 'express'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { authRoutes, todoRoutes } from './routes'
import { logger } from './utils'
import { NODE_ENV, PORT } from './config'
import helmet from 'helmet'

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))
app.use(helmet())

app.use('/users', authRoutes)
app.use('/todos', todoRoutes)

if (NODE_ENV !== 'test') {
  app.listen(PORT, () => logger.info(`Listening on port ${PORT}`))
}

export default app
