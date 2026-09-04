import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const { Pool } = pg;

// Altere os dados de conexão conforme sua senha local do Postgres
export const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '08082008',
  database: 'gym_logbook',
});

export const db = drizzle(pool);