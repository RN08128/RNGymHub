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
import { Resend } from 'resend';

const app = Fastify({ logger: true });

// Conexão com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY);

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

async function populateDefaultExercisesForUser(client: PoolClient, userId: string) {
  for (const ex of DEFAULT_EXERCISES) {
    await client.query(
      'INSERT INTO exercises (name, target_muscle, user_id) VALUES ($1, $2, $3)',
      [ex.name, ex.target_muscle, userId]
    );
  }
}

// Migrações do Banco de Dados
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

      ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

      ALTER TABLE workouts
      ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

      -- Tabelas para Divisões de Treinos Prontas (Routine Templates)
      CREATE TABLE IF NOT EXISTS routine_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS routine_template_workouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        routine_template_id UUID REFERENCES routine_templates(id) ON DELETE CASCADE,
        workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
        day_order INT NOT NULL
      );
    `);

    // Inserir Divisões Prontas Padrões se a tabela estiver vazia
    const routinesCount = await pool.query('SELECT COUNT(*) FROM routine_templates');
    if (parseInt(routinesCount.rows[0].count, 10) === 0) {
      await seedDefaultRoutineTemplates();
    }

    console.log('✅ Migrações executadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao executar migrações:', err);
  }
}

// Injeta Divisões Padrão no Sistema
async function seedDefaultRoutineTemplates() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const routines = [
      {
        name: 'PPL (Push / Pull / Legs)',
        description: 'Divisão clássica focada em Empurrar, Puxar e Pernas. Alta frequência e excelente recuperação muscular.',
        category: 'PPL',
      },
      {
        name: 'Upper / Lower (Superior / Inferior)',
        description: 'Divisão de 4 dias dividindo o corpo entre membros superiores e inferiores. Ótimo equilíbrio de volume e intensidade.',
        category: 'Upper Lower',
      },
      {
        name: 'PPL + Upper / Lower (5 Dias)',
        description: 'Combinação hipertrófica de 5 dias semanais unindo a estrutura PPL com dois dias de estímulo geral de Superior e Inferior.',
        category: 'PPL + Upper Lower',
      },
      {
        name: 'Full Body (Corpo Todo - 3x)',
        description: 'Treino de corpo inteiro 3 vezes por semana. Ideal para iniciantes ou rotinas corridas, maximizando a síntese proteica semanal.',
        category: 'Full Body',
      },
      {
        name: 'Anterior / Posterior',
        description: 'Foco na cadeia anterior (Peito, Quadríceps, Abdômen, Ombro Frontal) alternado com a cadeia posterior (Costas, Isquiotibiais, Glúteos, Panturrilha).',
        category: 'Anterior Posterior',
      },
    ];

    for (const r of routines) {
      await client.query(
        'INSERT INTO routine_templates (name, description, category) VALUES ($1, $2, $3)',
        [r.name, r.description, r.category]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Divisões de treinos prontas criadas com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao povoar divisões prontas:', err);
  } finally {
    client.release();
  }
}

async function main() {
  if (!process.env.JWT_SECRET) {
    throw new Error("❌ ERRO: A variável JWT_SECRET não foi configurada no arquivo .env!");
  }

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    strictPreflight: false,
    optionsSuccessStatus: 204,
  });

  app.setNotFoundHandler((request, reply) => {
    reply
      .header('Access-Control-Allow-Origin', '*')
      .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .status(404)
      .send({ message: 'Rota não encontrada.' });
  });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
  });

  app.get('/', async (request, reply) => {
    return { status: 'ok', message: 'RNGymHub API running!' };
  });

  try {
    await runMigrations();
  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error);
    process.exit(1);
  }

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

  app.post('/auth/register-request', async (request, reply) => {
    const registerSchema = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
    });

    try {
      const { name, email, password } = registerSchema.parse(request.body);

      // 1. Verifica se já existe um utilizador verificado com este e-mail
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

      // 2. Procura se já existe um registo pendente (não verificado)
      const pendingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND is_verified = false',
        [email]
      );

      if (pendingUser.rows.length > 0) {
        // Atualiza os dados, a palavra-passe e o código da conta pendente existente
        await pool.query(
          `
        UPDATE users 
        SET name = $1, password_hash = $2, verification_code = $3, code_expires_at = $4, created_at = NOW()
        WHERE id = $5
        `,
          [name, password_hash, verification_code, code_expires_at, pendingUser.rows[0].id]
        );
      } else {
        // Cria um novo registo se não existir nenhuma conta com este e-mail
        await pool.query(
          `
        INSERT INTO users (name, email, password_hash, verification_code, code_expires_at, is_verified)
        VALUES ($1, $2, $3, $4, $5, false)
        `,
          [name, email, password_hash, verification_code, code_expires_at]
        );
      }

      // 3. Exibe o código no log do servidor para testes
      console.log(`[AUTH LOG] Código gerado para ${email}: ${verification_code}`);

      // 4. Envia o código de verificação por e-mail usando Resend
      try {
        const { data, error } = await resend.emails.send({
          from: 'RNGymHub <noreply@rngymhub.com>',
          to: [email],
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

        if (error) {
          console.error('AVISO: Falha no disparo do Resend (E-mail não enviado):', error);
        } else {
          console.log(`✅ E-mail de verificação enviado para ${email} com sucesso!`);
        }
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error('AVISO: Falha na requisição de e-mail (E-mail não enviado):', errorMessage);
      }

      // 5. Retorno imediato
      return reply.status(200).send({
        message: 'Código de verificação gerado com sucesso!',
        email,
      });
    } catch (err) {
      console.error('Erro ao processar cadastro:', err);
      return reply.status(400).send({ message: 'Erro ao solicitar cadastro. Verifique os dados fornecidos.' });
    }
  });
  app.post('/auth/verify-code', async (request, reply) => {
    const verifySchema = z.object({
      email: z.string().email(),
      code: z.string().length(6),
    });

    const client = await pool.connect();

    try {
      const { email, code } = verifySchema.parse(request.body);

      // 1. Busca o registro do usuário pendente com o código válido
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
        return reply.status(400).send({
          message: 'Código incorreto, expirado ou e-mail inválido.'
        });
      }

      const unverifiedUser = userRes.rows[0];

      // 2. Início da transação de ativação
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

      // 3. Tenta popular exercícios padrão sem derrubar a ativação em caso de erro
      try {
        if (typeof populateDefaultExercisesForUser === 'function') {
          await populateDefaultExercisesForUser(client, activeUser.id);
        }
      } catch (exerciseErr) {
        console.error('AVISO: Falha ao popular exercícios padrão para o usuário:', exerciseErr);
      }

      // 4. Limpa quaisquer contas não verificadas duplicadas com o mesmo e-mail
      await client.query(
        'DELETE FROM users WHERE email = $1 AND is_verified = false AND id != $2',
        [email, activeUser.id]
      );

      await client.query('COMMIT');

      // 5. Gera o JWT Token (Compatível com @fastify/jwt)
      const payload = { id: activeUser.id, name: activeUser.name, email: activeUser.email };
      const token = typeof reply.jwtSign === 'function'
        ? await reply.jwtSign(payload, { expiresIn: '7d' })
        : app.jwt.sign(payload, { expiresIn: '7d' });

      return reply.status(200).send({
        user: activeUser,
        token,
        message: 'E-mail verificado com sucesso!',
      });

    } catch (err) {
      // Executa ROLLBACK apenas se a transação do banco ainda estiver aberta
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Ignora erro de rollback se a conexão já tiver sido encerrada
      }

      console.error('Erro ao verificar código:', err);
      return reply.status(500).send({ message: 'Erro interno ao verificar o código.' });
    } finally {
      client.release();
    }
  });

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
      console.error('Erro ao realizar login:', err);
      return reply.status(400).send({ message: 'Erro ao realizar login.' });
    }
  });

  // ==========================================
  // NOVAS ROTAS: TREINOS PRONTOS E DIVISÕES
  // ==========================================

  // 1. Listar Treinos Prontos (Aba "Treinos Prontos")
  app.get('/workouts/templates', async (request, reply) => {
    try {
      const result = await pool.query(
        `SELECT id, name, description, is_template FROM workouts WHERE is_template = true ORDER BY created_at ASC`
      );
      return reply.status(200).send(result.rows);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ message: 'Erro ao buscar treinos prontos.' });
    }
  });

  // 2. Copiar um Treino Pronto para as fichas do Usuário (Editável)
  app.post('/workouts/templates/:id/copy', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user_id = request.user?.id;

    if (!user_id) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de treino inválido.' });
    }

    const client = await pool.connect();
    let inTransaction = false;

    try {
      // 1. Busca o modelo ANTES de iniciar a transação no banco
      const templateRes = await client.query(
        'SELECT name, description FROM workouts WHERE id = $1 AND is_template = true',
        [id]
      );

      if (templateRes.rows.length === 0) {
        return reply.status(404).send({ message: 'Treino pronto não encontrado.' });
      }

      const template = templateRes.rows[0];

      // 2. Inicia a transação
      await client.query('BEGIN');
      inTransaction = true;

      // 3. Cria a cópia do treino para o usuário
      const newWorkoutRes = await client.query(
        'INSERT INTO workouts (user_id, name, description, is_template) VALUES ($1, $2, $3, false) RETURNING id',
        [user_id, template.name, template.description]
      );

      const newWorkoutId = newWorkoutRes.rows[0].id;

      // 4. Copia os exercícios associados usando as colunas corretas (sets e reps)
      const exercisesRes = await client.query(
        'SELECT exercise_id, sets, reps, weight FROM workout_exercises WHERE workout_id = $1',
        [id]
      );

      for (const ex of exercisesRes.rows) {
        await client.query(
          'INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight) VALUES ($1, $2, $3, $4, $5)',
          [newWorkoutId, ex.exercise_id, ex.sets, ex.reps, ex.weight || 0]
        );
      }

      await client.query('COMMIT');
      inTransaction = false;

      return reply.status(201).send({
        workout_id: newWorkoutId,
        message: 'Treino copiado com sucesso para suas fichas!'
      });

    } catch (err) {
      if (inTransaction) {
        await client.query('ROLLBACK').catch(() => { });
      }
      console.error('Erro ao copiar treino pronto:', err);
      return reply.status(500).send({
        message: 'Erro ao copiar treino pronto.',
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      client.release();
    }
  });

  // 3. Listar Divisões Prontas (Aba "Divisões Prontas")
  app.get('/routines/templates', async (request, reply) => {
    try {
      const result = await pool.query(
        `
      SELECT 
        rt.id, 
        rt.name, 
        rt.description, 
        rt.category,
        COUNT(rtw.workout_id)::int AS workouts_count
      FROM routine_templates rt
      LEFT JOIN routine_template_workouts rtw ON rtw.routine_template_id = rt.id
      GROUP BY rt.id
      ORDER BY rt.name ASC
      `
      );

      return reply.status(200).send(result.rows);
    } catch (err) {
      console.error('Erro ao buscar divisões de treino:', err);
      return reply.status(500).send({
        message: 'Erro ao buscar divisões de treino.',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // 4. Copiar uma Divisão Pronta Completa para o Usuário
  app.post('/routines/templates/:id/copy', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user_id = request.user?.id || (request.user as any)?.sub;

    if (!user_id) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    // Validação do formato do UUID
    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de divisão inválido.' });
    }

    const client = await pool.connect();
    let inTransaction = false;

    try {
      // 1. Verifica se a rotina/divisão existe antes de abrir transação
      const routineRes = await client.query('SELECT name FROM routine_templates WHERE id = $1', [id]);
      if (routineRes.rows.length === 0) {
        return reply.status(404).send({ message: 'Divisão não encontrada.' });
      }

      console.log(`[COPY ROUTINE] Copiando rotina ID: ${id} para usuário ID: ${user_id}`);

      // 2. Busca os treinos da rotina
      const workoutsRes = await client.query(
        `
      SELECT 
        rtw.day_order, 
        w.id AS workout_id, 
        w.name, 
        w.description
      FROM routine_template_workouts rtw
      JOIN workouts w ON w.id = rtw.workout_id
      WHERE rtw.routine_template_id = $1
      ORDER BY rtw.day_order ASC
      `,
        [id]
      );

      console.log(`[COPY ROUTINE] Treinos encontrados: ${workoutsRes.rows.length}`);

      if (workoutsRes.rows.length === 0) {
        return reply.status(404).send({
          message: 'Nenhum treino encontrado vinculado a esta divisão no banco de dados.'
        });
      }

      // 3. Inicia transação no banco
      await client.query('BEGIN');
      inTransaction = true;

      const createdWorkouts = [];

      for (const row of workoutsRes.rows) {
        const workoutName = `Dia ${row.day_order}: ${row.name}`;

        const newWorkoutRes = await client.query(
          `INSERT INTO workouts (user_id, name, description, is_template) 
         VALUES ($1, $2, $3, false) 
         RETURNING id`,
          [user_id, workoutName, row.description || '']
        );

        const newWorkoutId = newWorkoutRes.rows[0].id;
        createdWorkouts.push(newWorkoutId);

        // 4. Copia os exercícios ajustado para as colunas reais (sets, reps, weight)
        const exercisesRes = await client.query(
          'SELECT exercise_id, sets, reps, weight FROM workout_exercises WHERE workout_id = $1',
          [row.workout_id]
        );

        for (const ex of exercisesRes.rows) {
          await client.query(
            `INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight) 
           VALUES ($1, $2, $3, $4, $5)`,
            [newWorkoutId, ex.exercise_id, ex.sets, ex.reps, ex.weight || 0]
          );
        }
      }

      await client.query('COMMIT');
      inTransaction = false;

      return reply.status(201).send({
        message: 'Divisão de treino adicionada à sua conta com sucesso!',
        workouts_created: createdWorkouts.length,
      });

    } catch (err) {
      if (inTransaction) {
        await client.query('ROLLBACK').catch(() => { });
      }
      console.error('[COPY ROUTINE ERROR]:', err);
      return reply.status(500).send({
        message: 'Erro ao copiar divisão de treinos.',
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      client.release();
    }
  });
  // ==========================================
  // ROTAS DE EXERCÍCIOS (ISOLADOS POR USUÁRIO)
  // ==========================================

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
    // Schema flexível e compatível com o schema da tabela workout_exercises
    const workoutSchema = z.object({
      name: z.string().min(1, { message: 'O nome do treino é obrigatório.' }),
      description: z.string().optional().nullable(),
      exercises: z.array(
        z.object({
          exercise_id: z.string().uuid({ message: 'ID de exercício inválido.' }),
          sets: z.number().int().positive().optional().default(3),
          reps: z.number().int().positive().optional().default(10),
          weight: z.number().nonnegative().optional().default(0),
        })
      ).optional().default([]),
    });

    const client = await pool.connect();

    try {
      const user_id = request.user?.id;

      if (!user_id) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      const { name, description, exercises } = workoutSchema.parse(request.body);

      await client.query('BEGIN');

      // 1. Cria a ficha de treino na tabela `workouts`
      const workoutRes = await client.query(
        `
      INSERT INTO workouts (user_id, name, description, is_template) 
      VALUES ($1, $2, $3, false) 
      RETURNING id, name, description, created_at
      `,
        [user_id, name, description || null]
      );

      const workout = workoutRes.rows[0];

      // 2. Insere os exercícios vinculados na tabela `workout_exercises`
      if (exercises && exercises.length > 0) {
        for (const ex of exercises) {
          await client.query(
            `
          INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight) 
          VALUES ($1, $2, $3, $4, $5)
          `,
            [workout.id, ex.exercise_id, ex.sets, ex.reps, ex.weight]
          );
        }
      }

      await client.query('COMMIT');

      return reply.status(201).send({
        workout_id: workout.id,
        workout,
        message: 'Ficha de treino criada com sucesso!'
      });

    } catch (err) {
      await client.query('ROLLBACK');

      // Se o erro for de validação de dados (Zod)
      if (err instanceof z.ZodError) {
        console.error('Erro de validação do Zod ao criar treino:', err.issues);
        return reply.status(400).send({
          message: 'Dados do treino inválidos.',
          details: err.issues
        });
      }

      console.error('Erro ao criar ficha de treino:', err);
      return reply.status(500).send({ message: 'Erro interno ao criar ficha de treino.' });
    } finally {
      client.release();
    }
  });

  // Atualizar Ficha Existente (Editar treino)
  app.put('/workouts/:id', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user_id = request.user?.id || (request.user as any)?.sub;
    const { name, description, exercises } = request.body as {
      name: string;
      description?: string;
      exercises: Array<{ exercise_id: string; target_sets: number; target_reps: number }>;
    };

    if (!user_id) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Atualiza nome e descrição da ficha
      const updateWorkout = await client.query(
        'UPDATE workouts SET name = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING id',
        [name, description || '', id, user_id]
      );

      if (updateWorkout.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ message: 'Treino não encontrado para atualização.' });
      }

      // Remove os exercícios antigos e insere a nova lista
      await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);

      if (exercises && exercises.length > 0) {
        for (const ex of exercises) {
          await client.query(
            'INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps) VALUES ($1, $2, $3, $4)',
            [id, ex.exercise_id, ex.target_sets, ex.target_reps]
          );
        }
      }

      await client.query('COMMIT');
      return reply.status(200).send({ message: 'Treino atualizado com sucesso!' });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar treino:', err);
      return reply.status(500).send({ message: 'Erro ao atualizar ficha de treino.' });
    } finally {
      client.release();
    }
  });

  app.get('/workouts/:id', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user_id = request.user?.id || (request.user as any)?.sub;

    if (!user_id) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    // Valida o formato do UUID antes da query
    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ message: 'ID de treino inválido.' });
    }

    try {
      // 1. Busca os dados da ficha de treino
      const workoutRes = await pool.query(
        'SELECT id, name, description FROM workouts WHERE id = $1 AND user_id = $2',
        [id, user_id]
      );

      if (workoutRes.rows.length === 0) {
        return reply.status(404).send({ message: 'Treino não encontrado.' });
      }

      const workout = workoutRes.rows[0];

      // 2. Busca os exercícios vinculados a essa ficha
      const exercisesRes = await pool.query(
        `
      SELECT 
        we.exercise_id,
        e.name,
        we.sets AS target_sets,
        we.reps AS target_reps
      FROM workout_exercises we
      JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = $1
      `,
        [id]
      );

      return reply.status(200).send({
        id: workout.id,
        name: workout.name,
        description: workout.description,
        exercises: exercisesRes.rows
      });

    } catch (err) {
      console.error('Erro ao buscar detalhes do treino:', err);
      return reply.status(500).send({
        message: 'Erro interno ao buscar treino.',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Retorna os treinos do próprio usuário na tela principal
  app.get('/workouts', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    try {
      const user_id = request.user?.id;

      if (!user_id) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      const result = await pool.query(
        `
        SELECT 
          *
        FROM workouts 
        WHERE user_id = $1 AND (is_template = false OR is_template IS NULL)
        ORDER BY created_at DESC
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
    let inTransaction = false;

    try {
      // 1. Verifica existência e permissão
      const workoutCheck = await client.query(
        'SELECT user_id FROM workouts WHERE id = $1',
        [id]
      );

      if (workoutCheck.rows.length === 0) {
        return reply.status(404).send({ message: 'Ficha de treino não encontrada.' });
      }

      if (workoutCheck.rows[0].user_id !== user_id) {
        return reply.status(403).send({ message: 'Você não tem permissão para deletar esta ficha.' });
      }

      // 2. Inicia a transação
      await client.query('BEGIN');
      inTransaction = true;

      // 3. Deleta os registros dependentes nas tabelas existentes
      await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);
      await client.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, user_id]);

      await client.query('COMMIT');
      inTransaction = false;

      return reply.status(200).send({ message: 'Ficha de treino deletada com sucesso!' });

    } catch (err) {
      if (inTransaction) {
        await client.query('ROLLBACK').catch(() => { });
      }
      console.error('Erro ao deletar treino:', err);
      return reply.status(500).send({
        message: 'Erro ao deletar ficha de treino.',
        error: err instanceof Error ? err.message : String(err)
      });
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
  const PORT = Number(process.env.PORT) || 3333;

  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`🚀 Servidor rodando em ${address}`);
  });
}
// Executa a aplicação
main();