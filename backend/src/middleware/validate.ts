import { Request, Response, NextFunction } from 'express'
import { Schema } from 'joi'
import xss from 'xss'

export const validate = (schema: Schema) => (req: Request, res: Response, next: NextFunction): void => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
  if (error) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(d => d.message),
    })
    return
  }
  const sanitize = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  sanitize(req.body);
  next()
}
