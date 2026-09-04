import { pool } from './connection.js';

async function seed() {
  console.log('🌱 Inserindo dados de teste no banco...');

  try {
    // 1. Usuário
    const userRes = await pool.query(`
      INSERT INTO users (name, email, password_hash)
      VALUES ('Atleta Teste', 'atleta@test.com', 'hash123')
      RETURNING id;
    `);
    const userId = userRes.rows[0].id;

    // 2. Exercício
    const exRes = await pool.query(`
      INSERT INTO exercises (name, target_muscle)
      VALUES ('Supino Reto com Barra', 'Peitoral')
      RETURNING id;
    `);
    const exerciseId = exRes.rows[0].id;

    // 3. Ficha de Treino
    const workoutRes = await pool.query(
      `
      INSERT INTO workouts (user_id, name, description)
      VALUES ($1, 'Treino A - Peitoral e Tríceps', 'Treino focado em força')
      RETURNING id;
      `,
      [userId]
    );
    const workoutId = workoutRes.rows[0].id;

    // 4. Vincular Exercício à Ficha
    await pool.query(
      `
      INSERT INTO workout_exercises (workout_id, exercise_id, order_index, target_sets, target_reps)
      VALUES ($1, $2, 1, 3, 10);
      `,
      [workoutId, exerciseId]
    );

    console.log('✅ Dados inseridos!');
    console.log(`📌 Guarde este ID de Treino para testar: ${workoutId}`);
  } catch (err) {
    console.error('Erro no seed:', err);
  } finally {
    await pool.end();
  }
}

seed();