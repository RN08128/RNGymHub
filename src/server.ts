import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getActiveWorkoutResponseSchema, saveWorkoutLogSchema } from './schemas/workoutSchema.ts';

const app = Fastify().withTypeProvider<ZodTypeProvider>();

// Compiladores do Zod no Fastify
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(cors, { origin: '*' });

// ROTA 1: Carregar treino ativo com PRs pré-carregados (Opção B)
app.get(
  '/workouts/:id/active',
  {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: getActiveWorkoutResponseSchema,
      },
    },
  },
  async (request, reply) => {
    const { id } = request.params;

    // Exemplo de retorno simulado (substituir pela consulta no BD futuramente)
    return reply.status(200).send({
      workout_id: id,
      workout_name: 'Treino A - Peito e Tríceps',
      exercises: [
        {
          exercise_id: 'ex-supino-01',
          name: 'Supino Reto com Barra',
          target_muscle: 'Peitoral',
          image_url: null,
          personal_record: {
            max_weight: 100.0,
            max_volume_set: 1000.0, // ex: 100kg x 10 reps
          },
          sets: [
            { set_number: 1, target_reps: 10 },
            { set_number: 2, target_reps: 10 },
            { set_number: 3, target_reps: 8 },
          ],
        },
      ],
    });
  }
);

// ROTA 2: Salvar o log final do treino
app.post(
  '/workouts/log',
  {
    schema: {
      body: saveWorkoutLogSchema,
    },
  },
  async (request, reply) => {
    const logData = request.body;

    // Lógica para salvar os registros e atualizar os PRs no banco
    console.log('Saving workout log:', logData);

    return reply.status(201).send({ message: 'Workout logged successfully!' });
  }
);

app.listen({ port: 3333 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});