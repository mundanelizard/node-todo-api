import { PrismaClient } from '@prisma/client'
import { NODE_ENV } from './config'

const option: any = {}

if (NODE_ENV === 'test') {
  option.datasources = {
    db: {
      url: 'file:./test.db'
    }
  }
}

const prisma = new PrismaClient(option)

export default prisma
