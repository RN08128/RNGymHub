import pool from './connection.ts';
import { seedDefaultExercises } from './seedExercises.ts';

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando o povoamento do banco de dados (Seed)...');
    await client.query('BEGIN');

    // 1. Mapeia e insere os exercícios ajustados
    const exerciseMap = await seedDefaultExercises();
    console.log('✅ Exercícios modelos criados/mapeados.');

    // -------------------------------------------------------------------------
    // 2. FUNÇÃO AUXILIAR PARA VINCULAR EXERCÍCIOS AO TREINO TEMPLATE
    // -------------------------------------------------------------------------
    const linkWorkoutExercise = async (
      workoutId: string, 
      exerciseName: string, 
      sets: number = 4, 
      reps: number = 10, 
      weight: number = 0
    ) => {
      const exerciseId = exerciseMap[exerciseName];
      if (!exerciseId) {
        console.warn(`⚠️ Exercício não encontrado para vínculo: "${exerciseName}"`);
        return;
      }

      const check = await client.query(
        `SELECT 1 FROM workout_exercises 
         WHERE workout_id = $1 AND exercise_id = $2 LIMIT 1`,
        [workoutId, exerciseId]
      );

      if (check.rows.length === 0) {
        await client.query(
          `INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight)
           VALUES ($1, $2, $3, $4, $5)`,
          [workoutId, exerciseId, sets, reps, weight]
        );
      }
    };

    // -------------------------------------------------------------------------
    // 3. CRIAR AS DIVISÕES / ROTINAS MODELOS (routine_templates)
    // -------------------------------------------------------------------------
    const routinesData = [
      {
        name: 'PPL (Push / Pull / Legs)',
        category: 'PPL',
        description: 'Divisão clássica de 3 a 6 dias focada em padrões de movimento (Empurrar, Puxar e Pernas).'
      },
      {
        name: 'Upper / Lower (Superior / Inferior)',
        category: 'Upper / Lower',
        description: 'Divisão de 4 dias alternando membros superiores e inferiores. Ótimo equilíbrio e frequência.'
      },
      {
        name: 'Full Body (Corpo Todo)',
        category: 'Full Body',
        description: 'Treino de corpo inteiro 3 vezes por semana. Ideal para iniciantes ou rotinas corridas.'
      },
      {
        name: 'Arnold Split',
        category: 'A-Split',
        description: 'Divisão popularizada por Arnold Schwarzenegger (Peito/Costas, Ombros/Braços e Pernas).'
      },
      {
        name: 'PPL + Upper / Lower (5 Dias)',
        category: 'PPL + Upper/Lower',
        description: 'Combinação de 5 dias unindo o estímulo focado de PPL com a distribuição equilibrada de Upper/Lower.'
      },
      {
        name: 'Anterior / Posterior',
        category: 'Anterior / Posterior',
        description: 'Foco na cadeia anterior alternado com a cadeia posterior.'
      }
    ];

    const routineMap: Record<string, string> = {};

    for (const r of routinesData) {
      const checkRoutine = await client.query(
        `SELECT id FROM routine_templates WHERE name = $1 LIMIT 1`,
        [r.name]
      );

      if (checkRoutine.rows.length > 0) {
        routineMap[r.name] = checkRoutine.rows[0].id;
      } else {
        const res = await client.query(
          `INSERT INTO routine_templates (name, category, description)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [r.name, r.category, r.description]
        );
        routineMap[r.name] = res.rows[0].id;
      }
    }

    console.log('✅ Divisões modelos verificadas/criadas.');

    // -------------------------------------------------------------------------
    // 4. FUNÇÕES AUXILIARES DE TREINOS E VÍNCULOS DE ROTINA
    // -------------------------------------------------------------------------
    const createWorkoutTemplate = async (name: string, description: string) => {
      const checkRes = await client.query(
        `SELECT id FROM workouts WHERE name = $1 AND is_template = true LIMIT 1`,
        [name]
      );

      if (checkRes.rows.length > 0) {
        return checkRes.rows[0].id;
      }

      const insertRes = await client.query(
        `INSERT INTO workouts (user_id, name, description, is_template)
         VALUES (NULL, $1, $2, true)
         RETURNING id`,
        [name, description]
      );
      return insertRes.rows[0].id;
    };

    const linkRoutineWorkout = async (routineId: string, workoutId: string, dayOrder: number) => {
      const checkLink = await client.query(
        `SELECT 1 FROM routine_template_workouts 
         WHERE routine_template_id = $1 AND workout_id = $2 LIMIT 1`,
        [routineId, workoutId]
      );

      if (checkLink.rows.length === 0) {
        await client.query(
          `INSERT INTO routine_template_workouts (routine_template_id, workout_id, day_order)
           VALUES ($1, $2, $3)`,
          [routineId, workoutId, dayOrder]
        );
      }
    };

    // -------------------------------------------------------------------------
    // 5. POPULAR TREINOS E EXERCÍCIOS
    // -------------------------------------------------------------------------

    // A. Upper / Lower
    const ulId = routineMap['Upper / Lower (Superior / Inferior)'];
    if (ulId) {
      // Upper A
      const wUpperA = await createWorkoutTemplate('Upper A (Foco Força)', 'Superiores com ênfase em compostos pesados.');
      await linkWorkoutExercise(wUpperA, 'Supino Reto com Barra', 4, 8);
      await linkWorkoutExercise(wUpperA, 'Remada Curvada com Barra', 4, 8);
      await linkWorkoutExercise(wUpperA, 'Desenvolvimento com Halteres', 4, 8);
      await linkWorkoutExercise(wUpperA, 'Puxada Frontal com Pegada Pronada', 4, 10);
      await linkWorkoutExercise(wUpperA, 'Tríceps Pulley com Corda', 2, 12);
      await linkWorkoutExercise(wUpperA, 'Rosca Martelo com Halteres', 2, 12);

      // Lower A
      const wLowerA = await createWorkoutTemplate('Lower A (Foco Quadríceps)', 'Inferiores com ênfase em Agachamento.');
      await linkWorkoutExercise(wLowerA, 'Agachamento Livre', 4, 8);
      await linkWorkoutExercise(wLowerA, 'Leg Press 45', 4, 10);
      await linkWorkoutExercise(wLowerA, 'Stiff com Halteres', 4, 10);
      await linkWorkoutExercise(wLowerA, 'Mesa Flexora', 4, 12);
      await linkWorkoutExercise(wLowerA, 'Panturrilha em Pé', 4, 15);

      // Upper B
      const wUpperB = await createWorkoutTemplate('Upper B (Foco Hipertrofia)', 'Superiores com maior volume de braços/deltoides.');
      await linkWorkoutExercise(wUpperB, 'Supino Inclinado com Halteres', 4, 10);
      await linkWorkoutExercise(wUpperB, 'Puxada Frontal com Pegada Neutra', 4, 10);
      await linkWorkoutExercise(wUpperB, 'Elevação Lateral com Halteres', 4, 12);
      await linkWorkoutExercise(wUpperB, 'Crucifixo na Máquina', 4, 12);
      await linkWorkoutExercise(wUpperB, 'Rosca Direta com Barra', 3, 12);
      await linkWorkoutExercise(wUpperB, 'Tríceps Testa com Barra', 3, 12);

      // Lower B
      const wLowerB = await createWorkoutTemplate('Lower B (Foco Posterior)', 'Inferiores com ênfase em Posterior e Stiff.');
      await linkWorkoutExercise(wLowerB, 'Stiff com Barra', 4, 8);
      await linkWorkoutExercise(wLowerB, 'Leg Press Horizontal', 4, 10);
      await linkWorkoutExercise(wLowerB, 'Cadeira Extensora', 4, 12);
      await linkWorkoutExercise(wLowerB, 'Mesa Flexora', 4, 12);
      await linkWorkoutExercise(wLowerB, 'Panturrilha Sentado', 4, 15);

      await linkRoutineWorkout(ulId, wUpperA, 1);
      await linkRoutineWorkout(ulId, wLowerA, 2);
      await linkRoutineWorkout(ulId, wUpperB, 3);
      await linkRoutineWorkout(ulId, wLowerB, 4);
    }

    // B. PPL & PPL + Upper / Lower
    const wPush = await createWorkoutTemplate('Push (Peito/Ombro/Tríceps)', 'Dia 1: Empurrar foco força.');
    await linkWorkoutExercise(wPush, 'Supino Reto com Barra', 4, 8);
    await linkWorkoutExercise(wPush, 'Supino Inclinado com Halteres', 4, 10);
    await linkWorkoutExercise(wPush, 'Desenvolvimento com Halteres', 3, 10);
    await linkWorkoutExercise(wPush, 'Elevação Lateral com Halteres', 4, 12);
    await linkWorkoutExercise(wPush, 'Tríceps Pulley com Corda', 4, 12);

    const wPull = await createWorkoutTemplate('Pull (Costas/Bíceps)', 'Dia 2: Puxar foco força.');
    await linkWorkoutExercise(wPull, 'Puxada Frontal com Pegada Pronada', 4, 10);
    await linkWorkoutExercise(wPull, 'Remada Curvada com Barra', 4, 8);
    await linkWorkoutExercise(wPull, 'Remada Unilateral com Halteres', 3, 12);
    await linkWorkoutExercise(wPull, 'Rosca Direta com Barra', 4, 10);
    await linkWorkoutExercise(wPull, 'Rosca Martelo com Halteres', 3, 12);

    const wLegs = await createWorkoutTemplate('Legs (Pernas Completo)', 'Dia 3: Membros inferiores completo.');
    await linkWorkoutExercise(wLegs, 'Agachamento Livre', 4, 8);
    await linkWorkoutExercise(wLegs, 'Leg Press 45', 4, 10);
    await linkWorkoutExercise(wLegs, 'Stiff com Halteres', 4, 10);
    await linkWorkoutExercise(wLegs, 'Mesa Flexora', 3, 12);
    await linkWorkoutExercise(wLegs, 'Panturrilha em Pé', 4, 15);

    const pplId = routineMap['PPL (Push / Pull / Legs)'];
    if (pplId) {
      await linkRoutineWorkout(pplId, wPush, 1);
      await linkRoutineWorkout(pplId, wPull, 2);
      await linkRoutineWorkout(pplId, wLegs, 3);
    }

    const pplUlId = routineMap['PPL + Upper / Lower (5 Dias)'];
    if (pplUlId) {
      const checkUpperA = await client.query(`SELECT id FROM workouts WHERE name = 'Upper A (Foco Força)' AND is_template = true LIMIT 1`);
      const checkLowerA = await client.query(`SELECT id FROM workouts WHERE name = 'Lower A (Foco Quadríceps)' AND is_template = true LIMIT 1`);

      await linkRoutineWorkout(pplUlId, wPush, 1);
      await linkRoutineWorkout(pplUlId, wPull, 2);
      await linkRoutineWorkout(pplUlId, wLegs, 3);
      if (checkUpperA.rows.length > 0) await linkRoutineWorkout(pplUlId, checkUpperA.rows[0].id, 4);
      if (checkLowerA.rows.length > 0) await linkRoutineWorkout(pplUlId, checkLowerA.rows[0].id, 5);
    }

    // C. Full Body
    const fbId = routineMap['Full Body (Corpo Todo)'];
    if (fbId) {
      const wFbA = await createWorkoutTemplate('Full Body A', 'Estímulo global A.');
      await linkWorkoutExercise(wFbA, 'Agachamento Livre', 3, 8);
      await linkWorkoutExercise(wFbA, 'Supino Reto com Barra', 3, 8);
      await linkWorkoutExercise(wFbA, 'Remada Curvada com Barra', 3, 8);
      await linkWorkoutExercise(wFbA, 'Elevação Lateral com Halteres', 3, 12);

      const wFbB = await createWorkoutTemplate('Full Body B', 'Estímulo global B.');
      await linkWorkoutExercise(wFbB, 'Stiff com Barra', 3, 8);
      await linkWorkoutExercise(wFbB, 'Desenvolvimento com Halteres', 3, 8);
      await linkWorkoutExercise(wFbB, 'Puxada Frontal com Pegada Pronada', 3, 10);
      await linkWorkoutExercise(wFbB, 'Leg Press 45', 3, 10);

      const wFbC = await createWorkoutTemplate('Full Body C', 'Estímulo global C.');
      await linkWorkoutExercise(wFbC, 'Supino Inclinado com Halteres', 3, 10);
      await linkWorkoutExercise(wFbC, 'Stiff com Halteres', 3, 10);
      await linkWorkoutExercise(wFbC, 'Remada Unilateral com Halteres', 3, 10);
      await linkWorkoutExercise(wFbC, 'Cadeira Extensora', 3, 10);

      await linkRoutineWorkout(fbId, wFbA, 1);
      await linkRoutineWorkout(fbId, wFbB, 2);
      await linkRoutineWorkout(fbId, wFbC, 3);
    }

    await client.query('COMMIT');
    console.log('🎉 Seed executado com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar o Seed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

seed();