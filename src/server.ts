import dotenv from 'dotenv';
dotenv.config();

import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import nodemailer from 'nodemailer';

const app = Fastify({ logger: true });

// Conexão com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configuração do Transporter do Nodemailer para envio de e-mails
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // true para porta 465, false para 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Declaração de tipos para o payload do JWT na Request
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      name: string;
      email: string;
    };
  }
}

// Exercícios Padrões Iniciais para Novos Usuários
const DEFAULT_EXERCISES = [
  { name: 'Supino Reto com Barra', target_muscle: 'Peito' },
  { name: 'Supino Inclinado com Halteres', target_muscle: 'Peito' },
  { name: 'Crucifixo com Halteres', target_muscle: 'Peito' },
  { name: 'Supino Declinado com Barra', target_muscle: 'Peito' },
  { name: 'Crossover Alto na Polia', target_muscle: 'Peito' },
  { name: 'Crossover Baixo na Polia', target_muscle: 'Peito' },
  { name: 'Crucifixo na Máquina', target_muscle: 'Peito' },
  { name: 'Flexão de Braço', target_muscle: 'Peito' },
  { name: 'Supino Inclinado com Barra', target_muscle: 'Peito' },
  { name: 'Supino Articulado Reto', target_muscle: 'Peito' },
  { name: 'Supino Articulado Inclinado', target_muscle: 'Peito' },

  { name: 'Puxada Frontal com Pegada Pronada', target_muscle: 'Costas' },
  { name: 'Puxada Frontal com Pegada Neutra', target_muscle: 'Costas' },
  { name: 'Puxada Frontal com Triângulo', target_muscle: 'Costas' },
  { name: 'Remada Curvada com Barra', target_muscle: 'Costas' },
  { name: 'Remada Unilateral com Halteres', target_muscle: 'Costas' },
  { name: 'Puxada na Barra Fixa', target_muscle: 'Costas' },
  { name: 'Remada Baixa na Polia', target_muscle: 'Costas' },
  { name: 'Puxada na Polia Alta', target_muscle: 'Costas' },
  { name: 'Puxada na Polia com Triângulo', target_muscle: 'Costas' },

  { name: 'Desenvolvimento com Halteres', target_muscle: 'Ombros' },
  { name: 'Elevação Lateral com Halteres', target_muscle: 'Ombros' },
  { name: 'Elevação Lateral na Máquina', target_muscle: 'Ombros' },
  { name: 'Elevação Frontal na Máquina', target_muscle: 'Ombros' },
  { name: 'Elevação Frontal na Polia', target_muscle: 'Ombros' },
  { name: 'Desenvolvimento Militar com Barra', target_muscle: 'Ombros' },
  { name: 'Elevação Frontal com Halteres', target_muscle: 'Ombros' },
  { name: 'Desenvolvimento Arnold', target_muscle: 'Ombros' },
  { name: 'Elevação Lateral na Polia', target_muscle: 'Ombros' },

  { name: 'Leg Press Horizontal', target_muscle: 'Quadriceps' },
  { name: 'Cadeira Extensora', target_muscle: 'Quadriceps' },
  { name: 'Agachamento Livre', target_muscle: 'Quadriceps' },
  { name: 'Leg Press 45', target_muscle: 'Quadriceps' },
  { name: 'Agachamento Hack', target_muscle: 'Quadriceps' },
  { name: 'Afundo com Halteres', target_muscle: 'Quadriceps' },

  { name: 'Rosca Direta com Barra', target_muscle: 'Bíceps' },
  { name: 'Rosca Martelo com Halteres', target_muscle: 'Bíceps' },
  { name: 'Rosca Concentrada', target_muscle: 'Bíceps' },
  { name: 'Rosca Inversa com Barra', target_muscle: 'Bíceps' },
  { name: 'Rosca Scott com Barra', target_muscle: 'Bíceps' },
  { name: 'Rosca Alternada com Halteres', target_muscle: 'Bíceps' },
  { name: 'Rosca Scott na Máquina', target_muscle: 'Bíceps' },
  { name: 'Rosca Scott com Halteres', target_muscle: 'Bíceps' },
  { name: 'Rosca Inversa na Polia', target_muscle: 'Bíceps' },

  { name: 'Tríceps Testa com Halteres', target_muscle: 'Tríceps' },
  { name: 'Tríceps Testa com Barra', target_muscle: 'Tríceps' },
  { name: 'Tríceps Coice com Halteres', target_muscle: 'Tríceps' },
  { name: 'Tríceps Pulley', target_muscle: 'Tríceps' },
  { name: 'Tríceps Francês com Halteres', target_muscle: 'Tríceps' },
  { name: 'Tríceps Francês com Barra', target_muscle: 'Tríceps' },
  { name: 'Tríceps Mergulho na Paralela', target_muscle: 'Tríceps' },
  { name: 'Tríceps Mergulho no Banco', target_muscle: 'Tríceps' },
  { name: 'Tríceps Pulley com Corda', target_muscle: 'Tríceps' },
  { name: 'Tríceps Pulley com Barra Reta', target_muscle: 'Tríceps' },

  { name: 'Stiff com Halteres', target_muscle: 'Posterior de Coxa' },
  { name: 'Mesa Flexora', target_muscle: 'Posterior de Coxa' },
  { name: 'Stiff com Barra', target_muscle: 'Posterior de Coxa' },
  { name: 'Leg Curl na Máquina', target_muscle: 'Posterior de Coxa' },

  { name: 'Abdominal Infra', target_muscle: 'Abdômen' },
  { name: 'Abdominal Supra', target_muscle: 'Abdômen' },
  { name: 'Prancha', target_muscle: 'Abdômen' },
  { name: 'Abdominal Oblíquo', target_muscle: 'Abdômen' },
  { name: 'Abdominal com Peso', target_muscle: 'Abdômen' },

  { name: 'Panturrilha em Pé', target_muscle: 'Panturrilha' },
  { name: 'Panturrilha Sentado', target_muscle: 'Panturrilha' },
  { name: 'Panturrilha em Pé na Máquina', target_muscle: 'Panturrilha' },
  { name: 'Panturrilha Sentado na Máquina', target_muscle: 'Panturrilha' },
  { name: 'Panturrilha no Leg Press', target_muscle: 'Panturrilha' },
];

// Injeta os exercícios padrão no cadastro do usuário
async function populateDefaultExercisesForUser(client: PoolClient, userId: string) {
  for (const ex of DEFAULT_EXERCISES) {
    await client.query(
      'INSERT INTO exercises (name, target_muscle, user_id) VALUES ($1, $2, $3)',
      [ex.name, ex.target_muscle, userId]
    );
  }
}

// Função de Migrações Automáticas
async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        verification_code VARCHAR(6),
        code_expires_at TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP;

      CREATE UNIQUE INDEX IF NOT EXISTS unique_verified_email 
      ON users (email) 
      WHERE is_verified = TRUE;

      -- Adiciona user_id na tabela exercises para isolamento por usuário
      ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

      -- Adiciona is_template na tabela workouts caso não exista
      ALTER TABLE workouts
      ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Migrações executadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao executar migrações:', err);
  }
}

async function main() {
  if (!process.env.JWT_SECRET) {
    throw new Error("❌ ERRO: A variável JWT_SECRET não foi configurada no arquivo .env!");
  }

  // 1. Configuração do CORS
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 2. Registro do Plugin JWT
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
  });

  // 3. Execução das migrações do banco
  await runMigrations();

  // 4. Middleware de Autenticação JWT
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: 'Token inválido ou ausente.' });
    }
  });

  // ==========================================
  // ROTAS DE AUTENTICAÇÃO E CADASTRO
  // ==========================================

  // 1. Solicitar cadastro (gera e envia o código por e-mail)
  app.post('/auth/register-request', async (request, reply) => {
    const registerSchema = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
    });

    try {
      const { name, email, password } = registerSchema.parse(request.body);

      const verifiedUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND is_verified = true',
        [email]
      );

      if (verifiedUser.rows.length > 0) {
        return reply.status(400).send({ message: 'Este e-mail já está em uso por uma conta verificada.' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
      const code_expires_at = new Date(Date.now() + 15 * 60 * 1000);

      await pool.query(
        `
        INSERT INTO users (name, email, password_hash, verification_code, code_expires_at, is_verified)
        VALUES ($1, $2, $3, $4, $5, false)
        `,
        [name, email, password_hash, verification_code, code_expires_at]
      );

      // Envio do e-mail ao requisitante
      await transporter.sendMail({
        from: `"RNGymHub" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Seu Código de Verificação - RNGymHub',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #121212; color: #ffffff; border-radius: 8px;">
            <h2 style="color: #007bff;">Bem-vindo ao RNGymHub, ${name}!</h2>
            <p>Para concluir a verificação da sua conta, utilize o código de verificação abaixo:</p>
            <div style="background: #1e1e1e; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #007bff; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
              ${verification_code}
            </div>
            <p style="color: #aaaaaa; font-size: 13px;">Este código expira em 15 minutos.</p>
          </div>
        `,
      });

      return reply.status(200).send({
        message: 'Código de verificação enviado para o seu e-mail!',
        email,
      });
    } catch (err) {
      console.error('Erro ao processar cadastro/envio de e-mail:', err);
      return reply.status(400).send({ message: 'Erro ao solicitar cadastro. Verifique os dados fornecidos.' });
    }
  });

  // 2. Confirmar o código de verificação e popular exercícios padrão
  app.post('/auth/verify-code', async (request, reply) => {
    const verifySchema = z.object({
      email: z.string().email(),
      code: z.string().length(6),
    });

    const client = await pool.connect();

    try {
      const { email, code } = verifySchema.parse(request.body);

      const userRes = await client.query(
        `
        SELECT * FROM users 
        WHERE email = $1 
          AND verification_code = $2 
          AND is_verified = false 
          AND code_expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [email, code]
      );

      if (userRes.rows.length === 0) {
        return reply.status(400).send({ message: 'Código incorreto, expirado ou e-mail inválido.' });
      }

      const unverifiedUser = userRes.rows[0];

      await client.query('BEGIN');

      const updatedUserRes = await client.query(
        `
        UPDATE users 
        SET is_verified = true, verification_code = NULL, code_expires_at = NULL
        WHERE id = $1
        RETURNING id, name, email
        `,
        [unverifiedUser.id]
      );

      const activeUser = updatedUserRes.rows[0];

      // Popula a lista padrão de exercícios para a nova conta
      await populateDefaultExercisesForUser(client, activeUser.id);

      // Remove tentativas antigas não verificadas do mesmo e-mail
      await client.query(
        'DELETE FROM users WHERE email = $1 AND is_verified = false AND id != $2',
        [email, activeUser.id]
      );

      await client.query('COMMIT');

      const token = app.jwt.sign(
        { id: activeUser.id, name: activeUser.name, email: activeUser.email },
        { expiresIn: '7d' }
      );

      return reply.status(200).send({
        user: activeUser,
        token,
        message: 'E-mail verificado com sucesso!',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao verificar o código.' });
    } finally {
      client.release();
    }
  });

  // 3. Login
  app.post('/auth/login', async (request, reply) => {
    const loginSchema = z.object({
      login: z.string().min(1),
      password: z.string().min(1),
    });

    try {
      const { login, password } = loginSchema.parse(request.body);

      const result = await pool.query(
        'SELECT * FROM users WHERE (email = $1 OR name = $1) AND is_verified = true',
        [login]
      );

      if (result.rows.length === 0) {
        return reply.status(401).send({ message: 'Credenciais inválidas ou e-mail não verificado.' });
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const token = app.jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        { expiresIn: '7d' }
      );

      return reply.status(200).send({
        token,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      console.error(err);
      return reply.status(400).send({ message: 'Erro ao realizar login.' });
    }
  });

  // ==========================================
  // ROTAS DE EXERCÍCIOS (ISOLADOS POR USUÁRIO)
  // ==========================================

  // Listar Exercícios do Usuário Autenticado
  app.get('/exercises', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    try {
      const user_id = request.user?.id;

      if (!user_id) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      const result = await pool.query(
        'SELECT * FROM exercises WHERE user_id = $1 ORDER BY name ASC',
        [user_id]
      );

      return reply.status(200).send(result.rows);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao buscar exercícios.' });
    }
  });

  // Criar Exercício Privado para o Usuário
  app.post('/exercises', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const exerciseSchema = z.object({
      name: z.string().min(1),
      target_muscle: z.string().min(1),
    });

    try {
      const user_id = request.user?.id;

      if (!user_id) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      const { name, target_muscle } = exerciseSchema.parse(request.body);

      const result = await pool.query(
        'INSERT INTO exercises (name, target_muscle, user_id) VALUES ($1, $2, $3) RETURNING *',
        [name, target_muscle, user_id]
      );
      return reply.status(201).send(result.rows[0]);
    } catch (err) {
      console.error(err);
      return reply.status(400).send({ message: 'Dados inválidos para cadastro de exercício.' });
    }
  });

  // Deletar Exercício do Próprio Usuário
  app.delete('/exercises/:id', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user_id = request.user?.id;

    if (!user_id) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de exercício inválido.' });
    }

    const client = await pool.connect();

    try {
      const exerciseCheck = await client.query(
        'SELECT id, user_id FROM exercises WHERE id = $1',
        [id]
      );

      if (exerciseCheck.rows.length === 0) {
        return reply.status(404).send({ message: 'Exercício não encontrado.' });
      }

      if (exerciseCheck.rows[0].user_id !== user_id) {
        return reply.status(403).send({ message: 'Você não tem permissão para remover este exercício.' });
      }

      await client.query('BEGIN');
      await client.query('DELETE FROM workout_exercises WHERE exercise_id = $1', [id]);
      await client.query('DELETE FROM exercises WHERE id = $1 AND user_id = $2', [id, user_id]);
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

  app.post('/workouts', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const workoutSchema = z.object({
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
      const user_id = request.user?.id;

      if (!user_id) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      const { name, description, exercises } = workoutSchema.parse(request.body);

      await client.query('BEGIN');

      const workoutRes = await client.query(
        'INSERT INTO workouts (user_id, name, description, is_template) VALUES ($1, $2, $3, false) RETURNING id',
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

  app.get('/workouts', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    try {
      const user_id = request.user?.id;

      if (!user_id) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      const result = await pool.query(
        `
        SELECT 
          id, 
          name, 
          COALESCE(description, '') AS description, 
          COALESCE(is_template, false) AS is_template,
          user_id
        FROM workouts 
        WHERE is_template = true OR user_id = $1
        ORDER BY name ASC
        `,
        [user_id]
      );

      return reply.status(200).send(result.rows);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao buscar fichas de treino.' });
    }
  });

  app.delete('/workouts/:id', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user_id = request.user?.id;

    if (!user_id) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de treino inválido.' });
    }

    const client = await pool.connect();

    try {
      const workoutCheck = await client.query(
        'SELECT is_template, user_id FROM workouts WHERE id = $1',
        [id]
      );

      if (workoutCheck.rows.length === 0) {
        return reply.status(404).send({ message: 'Ficha de treino não encontrada.' });
      }

      const workout = workoutCheck.rows[0];

      if (workout.is_template) {
        return reply.status(403).send({ message: 'Não é permitido deletar fichas modelos.' });
      }

      if (workout.user_id !== user_id) {
        return reply.status(403).send({ message: 'Você não tem permissão para deletar esta ficha.' });
      }

      await client.query('BEGIN');

      await client.query(
        `DELETE FROM set_logs 
         WHERE workout_log_id IN (SELECT id FROM workout_logs WHERE workout_id = $1)`,
        [id]
      );

      await client.query('DELETE FROM workout_logs WHERE workout_id = $1', [id]);
      await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);

      await client.query('DELETE FROM workouts WHERE id = $1', [id]);

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

  app.post('/workouts/log', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { workout_id, start_time, end_time, started_at, ended_at, completed_at, logs } = request.body as any;
    const user_id = request.user?.id;

    if (!user_id) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const startTimeVal = started_at || start_time || new Date().toISOString();
      const endTimeVal = ended_at || completed_at || end_time || new Date().toISOString();

      const logRes = await client.query(
        `
        INSERT INTO workout_logs (workout_id, user_id, started_at, ended_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [workout_id, user_id, startTimeVal, endTimeVal]
      );

      const workoutLogId = logRes.rows[0].id;

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

  app.get('/history', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    try {
      const user_id = request.user?.id;

      if (!user_id) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      const result = await pool.query(
        `
        SELECT 
          wl.id AS session_id,
          w.name AS workout_name,
          COALESCE(wl.started_at, wl.created_at, CURRENT_TIMESTAMP) AS start_time,
          COUNT(sl.id) AS total_sets,
          COALESCE(SUM(CASE WHEN sl.is_pr_weight OR sl.is_pr_volume THEN 1 ELSE 0 END), 0) AS pr_count
        FROM workout_logs wl
        JOIN workouts w ON w.id = wl.workout_id
        LEFT JOIN set_logs sl ON sl.workout_log_id = wl.id
        WHERE wl.user_id = $1
        GROUP BY wl.id, w.name, wl.started_at, wl.created_at
        ORDER BY wl.started_at DESC
        `,
        [user_id]
      );

      return reply.status(200).send(result.rows);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao buscar histórico.' });
    }
  });

  app.get('/analytics/exercise/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de exercício inválido.' });
    }

    try {
      const result = await pool.query(
        `
        SELECT 
          TO_CHAR(wl.started_at, 'DD/MM') AS date,
          MAX(sl.weight) AS max_weight
        FROM set_logs sl
        JOIN workout_logs wl ON wl.id = sl.workout_log_id
        WHERE sl.exercise_id = $1
        GROUP BY wl.started_at
        ORDER BY wl.started_at ASC
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

// Executa a aplicação
main();