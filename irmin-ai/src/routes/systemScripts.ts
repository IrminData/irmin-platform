import { vectorizeDocsScript } from '@/scripts';
import { FastifyInstance } from 'fastify';

import { swaggerSchemas } from '@/config/swagger';

import { sendInternalServerError } from '@/utils/errors';

export async function systemScriptRoutes(fastify: FastifyInstance) {
  // POST /api/system/scripts/vectorize-docs - Execute vectorize docs script
  fastify.post(
    '/system/scripts/vectorize-docs',
    {
      schema: swaggerSchemas.systemVectorizeDocsScript,
    },
    async (_, reply) => {
      try {
        // Execute the vectorize docs script with default configuration
        const result = await vectorizeDocsScript();

        if (result.success) {
          reply.send(result);
        } else {
          reply.status(500).send(result);
        }

        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to execute vectorize docs script';
        fastify.log.error(
          'System vectorize docs script error: %s',
          errorMessage
        );
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );
}
