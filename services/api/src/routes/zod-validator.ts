import type {
  FastifySchemaCompiler,
  FastifySchemaValidationError,
} from 'fastify';
import type { ZodIssue, ZodTypeAny } from 'zod';

function isZodSchema(schema: unknown): schema is ZodTypeAny {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'safeParse' in schema &&
    typeof (schema as { safeParse?: unknown }).safeParse === 'function'
  );
}

function toFastifyValidationError(issue: ZodIssue): FastifySchemaValidationError {
  const path = issue.path.map(String).join('/');

  return {
    keyword: issue.code,
    instancePath: path ? `/${path}` : '',
    schemaPath: '',
    params: {
      code: issue.code,
      path: issue.path,
    },
    message: issue.message,
  };
}

/** Fastify schema compiler that delegates validation to Zod schemas. */
export const zodValidatorCompiler: FastifySchemaCompiler<unknown> = ({
  schema,
  method,
  url,
  httpPart,
}) => {
  if (!isZodSchema(schema)) {
    throw new Error(
      `Unsupported schema for ${method} ${url} (${httpPart ?? 'unknown'}). Use a Zod schema.`,
    );
  }

  return (data) => {
    const parsed = schema.safeParse(data);

    if (parsed.success) {
      return { value: parsed.data };
    }

    return {
      error: parsed.error.issues.map(toFastifyValidationError),
    };
  };
};
