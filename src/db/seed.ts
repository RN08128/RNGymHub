import { pool } from './connection.ts';

async function seed() {
  console.log('🌱 Populando banco de dados com dados iniciais...');

  try {
    // 1. Inserir usuário de teste
    const userRes = await pool.query(`
      INSERT INTO users (name, email, password_hash)
      VALUES ('Treinador', 'teste@logbook.com', 'hash_senha_123')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const userId = userRes.rows[0].id;

    // 2. Inserir exercícios padrão
    const exercisesRes = await pool.query(`
      INSERT INTO exercises (name, target_muscle)
      VALUES 
        ('Supino Reto com Barra', 'Peitoral'),
        ('Agachamento Livre', 'Quadríceps'),
        ('Puxada Alta', 'Dorsal')
      RETURNING id, name;
    `);

    const supinoId = exercisesRes.rows[0].id;

    // 3. Inserir uma ficha de treino de teste
    const workoutRes = await pool.query(`
      INSERT INTO workouts (user_id, name, description)
      VALUES ('${userId}', 'Treino A - Peitoral e Tríceps', 'Ficha focada em hipertrofia')
      RETURNING id;
    `);
    const workoutId = workoutRes.rows[0].id;

    // 4. Vincular o Supino na Ficha
    await pool.query(`
      INSERT INTO workout_exercises (workout_id, exercise_id, order_index, target_sets, target_reps)
      VALUES ('${workoutId}', '${supinoId}', 1, 3, 10);
    `);

    console.log('✅ Banco populado com sucesso!');
    console.log(`📌 ID do Usuário: ${userId}`);
    console.log(`📌 ID da Ficha: ${workoutId}`);
  } catch (error) {
    console.error('❌ Erro ao popular banco:', error);
  } finally {
    await pool.end();
  }
}

seed();