import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { Pool } from 'pg';

const app = Fastify({ logger: true });

// Conexão com o PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gym_logbook', // Altere para o nome do seu banco de dados
  password: '08082008', // Altere para a sua senha
  port: 5432,
});

// Adicione dentro da função main() no server.ts, antes de app.listen()
  async function runMigrations() {
    try {
      await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP;

      CREATE UNIQUE INDEX IF NOT EXISTS unique_verified_email 
      ON users (email) 
      WHERE is_verified = TRUE;
    `);
      console.log('✅ Migrações da tabela users executadas com sucesso!');
    } catch (err) {
      console.error('❌ Erro ao executar migrações:', err);
    }
  }

async function main() {
  // Configuração do CORS permitindo todos os métodos
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Chame a função dentro da main()
  await runMigrations();

  // ==========================================
  // ROTAS DE EXERCÍCIOS
  // ==========================================

  // Listar todos os exercícios
  app.get('/exercises', async (request, reply) => {
    try {
      const result = await pool.query('SELECT * FROM exercises ORDER BY name ASC');
      return reply.status(200).send(result.rows);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao buscar exercícios.' });
    }
  });

  // Cadastrar novo exercício
  app.post('/exercises', async (request, reply) => {
    const exerciseSchema = z.object({
      name: z.string().min(1),
      target_muscle: z.string().min(1),
    });

    try {
      const { name, target_muscle } = exerciseSchema.parse(request.body);
      const result = await pool.query(
        'INSERT INTO exercises (name, target_muscle) VALUES ($1, $2) RETURNING *',
        [name, target_muscle]
      );
      return reply.status(201).send(result.rows[0]);
    } catch (err) {
      console.error(err);
      return reply.status(400).send({ message: 'Dados inválidos para cadastro de exercício.' });
    }
  });

  // Deletar exercício
  app.delete('/exercises/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de exercício inválido.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM workout_exercises WHERE exercise_id = $1', [id]);

      const result = await client.query('DELETE FROM exercises WHERE id = $1 RETURNING id', [id]);

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ message: 'Exercício não encontrado.' });
      }

      await client.query('COMMIT');
      return reply.status(200).send({ message: 'Exercício deletado com sucesso!' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      return reply.status(500).send({
        message: 'Não foi possível deletar. O exercício pode estar vinculado a treinos salvos.',
      });
    } finally {
      client.release();
    }
  });

  // ==========================================
  // ROTAS DE FICHAS DE TREINO (WORKOUTS)
  // ==========================================

  // Cadastrar nova ficha de treino
  app.post('/workouts', async (request, reply) => {
    const workoutSchema = z.object({
      user_id: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
      exercises: z.array(
        z.object({
          exercise_id: z.string().uuid(),
          target_sets: z.number().int().positive(),
          target_reps: z.number().int().positive(),
        })
      ),
    });

    const client = await pool.connect();

    try {
      const { user_id, name, description, exercises } = workoutSchema.parse(request.body);

      await client.query('BEGIN');

      const workoutRes = await client.query(
        'INSERT INTO workouts (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
        [user_id, name, description || '']
      );

      const workoutId = workoutRes.rows[0].id;

      for (const ex of exercises) {
        await client.query(
          'INSERT INTO workout_exercises (workout_id, exercise_id, target_sets, target_reps) VALUES ($1, $2, $3, $4)',
          [workoutId, ex.exercise_id, ex.target_sets, ex.target_reps]
        );
      }

      await client.query('COMMIT');
      return reply.status(201).send({ workout_id: workoutId, message: 'Ficha criada com sucesso!' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      return reply.status(400).send({ message: 'Erro ao criar ficha de treino.' });
    } finally {
      client.release();
    }
  });

  // Obter treino ativo
  app.get('/workouts/:id/active', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de treino inválido.' });
    }

    try {
      const workoutRes = await pool.query('SELECT * FROM workouts WHERE id = $1', [id]);
      if (workoutRes.rows.length === 0) {
        return reply.status(404).send({ message: 'Treino não encontrado.' });
      }

      const workout = workoutRes.rows[0];

      const exercisesRes = await pool.query(
        `
        SELECT 
          e.id AS exercise_id,
          e.name,
          we.target_sets,
          we.target_reps,
          COALESCE(MAX(sl.weight), 0) AS max_weight,
          COALESCE(MAX(sl.weight * sl.reps), 0) AS max_volume_set
        FROM workout_exercises we
        JOIN exercises e ON e.id = we.exercise_id
        LEFT JOIN set_logs sl ON sl.exercise_id = e.id
        WHERE we.workout_id = $1
        GROUP BY e.id, e.name, we.target_sets, we.target_reps
        `,
        [id]
      );

      const formattedExercises = exercisesRes.rows.map((ex) => ({
        exercise_id: ex.exercise_id,
        name: ex.name,
        personal_record: {
          max_weight: parseFloat(ex.max_weight),
          max_volume_set: parseFloat(ex.max_volume_set),
        },
        sets: Array.from({ length: ex.target_sets }, (_, i) => ({
          set_number: i + 1,
          target_reps: ex.target_reps,
          weight: null,
          reps: null,
          completed: false,
        })),
      }));

      return reply.status(200).send({
        workout_id: workout.id,
        workout_name: workout.name,
        description: workout.description,
        exercises: formattedExercises,
      });
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao carregar treino ativo.' });
    }
  });

  // Buscar todas as fichas de treino
  app.get('/workouts', async (request, reply) => {
    try {
      // COALESCE garante retorno mesmo se 'is_template' ou 'description' forem nulos
      const result = await pool.query(`
        SELECT 
          id, 
          name, 
          COALESCE(description, '') AS description, 
          COALESCE(is_template, false) AS is_template 
        FROM workouts 
        ORDER BY name ASC
      `);

      return reply.status(200).send(result.rows);
    } catch (err: any) {
      // Fallback: se a coluna 'is_template' não existir no banco, faz a busca simples sem quebrar
      if (err.code === '42703') {
        try {
          const fallbackResult = await pool.query(`
            SELECT id, name, COALESCE(description, '') AS description, false AS is_template 
            FROM workouts 
            ORDER BY name ASC
          `);
          return reply.status(200).send(fallbackResult.rows);
        } catch (fallbackErr) {
          console.error(fallbackErr);
        }
      }

      console.error(err);
      return reply.status(500).send({ message: 'Erro ao buscar fichas de treino.' });
    }
  });

  // Deletar ficha de treino
  app.delete('/workouts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Validar se o ID enviado é um UUID válido
    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de treino inválido.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Apaga os relacionamentos das séries (set_logs) ligadas aos logs desse treino
      await client.query(
        `DELETE FROM set_logs 
         WHERE workout_log_id IN (SELECT id FROM workout_logs WHERE workout_id = $1)`,
        [id]
      );

      // 2. Apaga o histórico de execuções do treino (workout_logs)
      await client.query('DELETE FROM workout_logs WHERE workout_id = $1', [id]);

      // 3. Apaga os exercícios vinculados à ficha (workout_exercises)
      await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);

      // 4. Apaga a ficha principal (workouts)
      const result = await client.query('DELETE FROM workouts WHERE id = $1 RETURNING id', [id]);

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ message: 'Ficha de treino não encontrada.' });
      }

      await client.query('COMMIT');
      return reply.status(200).send({ message: 'Ficha de treino deletada com sucesso!' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao deletar ficha de treino.' });
    } finally {
      client.release();
    }
  });

  // ==========================================
  // ROTAS DE EXECUÇÃO E HISTÓRICO DE TREINOS
  // ==========================================

  // Salvar treino concluído e registrar logs das séries
  app.post('/workouts/log', async (request, reply) => {
    const { workout_id, start_time, end_time, started_at, ended_at, completed_at, logs, user_id } = request.body as any;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Garante um user_id válido
      let userIdToInsert = user_id;
      if (!userIdToInsert) {
        const workoutOwnerRes = await client.query(
          'SELECT user_id FROM workouts WHERE id = $1',
          [workout_id]
        );
        userIdToInsert = workoutOwnerRes.rows[0]?.user_id || '00000000-0000-0000-0000-000000000000';
      }

      // 2. Define os timestamps
      const startTimeVal = started_at || start_time || new Date().toISOString();
      const endTimeVal = ended_at || completed_at || end_time || new Date().toISOString();

      // 3. Insere em workout_logs usando started_at e ended_at
      const logRes = await client.query(
        `
        INSERT INTO workout_logs (workout_id, user_id, started_at, ended_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [workout_id, userIdToInsert, startTimeVal, endTimeVal]
      );

      const workoutLogId = logRes.rows[0].id;

      // 4. Grava cada série em set_logs
      for (const log of logs) {
        await client.query(
          `
          INSERT INTO set_logs (workout_log_id, exercise_id, set_number, weight, reps, is_pr_weight, is_pr_volume)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [workoutLogId, log.exercise_id, log.set_number, log.weight, log.reps, log.is_pr_weight, log.is_pr_volume]
        );
      }

      await client.query('COMMIT');
      return reply.status(201).send({ message: 'Treino e logs salvos com sucesso!' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao salvar logs do treino.' });
    } finally {
      client.release();
    }
  });
  // Buscar histórico de sessões de treinos concluídos
  app.get('/history', async (request, reply) => {
    try {
      const result = await pool.query(`
        SELECT 
          wl.id AS session_id,
          w.name AS workout_name,
          COALESCE(wl.created_at, CURRENT_TIMESTAMP) AS start_time,
          COUNT(sl.id) AS total_sets,
          COALESCE(SUM(CASE WHEN sl.is_pr_weight OR sl.is_pr_volume THEN 1 ELSE 0 END), 0) AS pr_count
        FROM workout_logs wl
        JOIN workouts w ON w.id = wl.workout_id
        LEFT JOIN set_logs sl ON sl.workout_log_id = wl.id
        GROUP BY wl.id, w.name, wl.created_at
        ORDER BY wl.created_at DESC
      `);

      return reply.status(200).send(result.rows);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao buscar histórico.' });
    }
  });

  // Dados analíticos de evolução de carga por exercício
  app.get('/analytics/exercise/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de exercício inválido.' });
    }

    try {
      const result = await pool.query(
        `
        SELECT 
          TO_CHAR(wl.start_time, 'DD/MM') AS date,
          MAX(sl.weight) AS max_weight
        FROM set_logs sl
        JOIN workout_logs wl ON wl.id = sl.workout_log_id
        WHERE sl.exercise_id = $1
        GROUP BY wl.start_time
        ORDER BY wl.start_time ASC
        `,
        [id]
      );

      return reply.status(200).send(result.rows);
    } catch (err) {
      console.error(err);
      return reply.status(500).send([]);
    }
  });

  // Inicialização do Servidor
  app.listen({ port: 3333, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`🚀 Servidor rodando em ${address}`);
  });
}

main();