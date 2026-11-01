import { HttpError } from '../utils/helpers.js';

// validate(schema) valida e substitui req.body; validate(schema, 'query') valida req.query.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new HttpError(400, details[0]?.message || 'Dados inválidos.', details);
  }
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  next();
};
