import winston from 'winston'

const { combine, errors, json, simple } = winston.format
const { Console } = winston.transports

// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
const logger = winston.createLogger({
  level: 'info',
  format: combine(errors({ stack: true }), json()),
  transports: [
    new Console({
      format: simple()
    })
  ]
})

export default logger
