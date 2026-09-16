import { pool } from './connection.ts';

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando o povoamento do banco de dados (Seed)...');
    await client.query('BEGIN');

    // -------------------------------------------------------------------------
    // 1. CRIAR AS DIVISÕES / ROTINAS MODELOS (routine_templates)
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
        description: 'Treino de corpo inteiro 3 vezes por semana. Ideal para iniciantes ou rotinas corridas, maximizando a síntese proteica semanal. '
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
        description: 'Foco na cadeia anterior (Peito, Quadríceps, Abdômen, Ombro Frontal) alternado com a cadeia posterior (Costas, Isquiotibiais, Glúteos, Panturrilha). '
      }
    ];

    const routineMap: Record<string, string> = {};

    for (const r of routinesData) {
      // Busca se a rotina já existe no banco
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
    // 2. FUNÇÕES AUXILIARES SEM DEPENDÊNCIA DE 'ON CONFLICT'
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
    // 3. POPULAR TREINOS E VÍNCULOS
    // -------------------------------------------------------------------------

    // A. PPL
    

    // B. Upper / Lower
    const ulId = routineMap['Upper / Lower (Superior / Inferior)'];
    if (ulId) {
      const wUpperA = await createWorkoutTemplate('Upper A (Foco Força)', 'Superiores com ênfase em compostos pesados.');
      const wLowerA = await createWorkoutTemplate('Lower A (Foco Quadríceps)', 'Inferiores com ênfase em Agachamento.');
      const wUpperB = await createWorkoutTemplate('Upper B (Foco Hipertrofia)', 'Superiores com maior volume de braços/deltoides.');
      const wLowerB = await createWorkoutTemplate('Lower B (Foco Posterior)', 'Inferiores com ênfase em Levantamento Terra e Stiff.');

      await linkRoutineWorkout(ulId, wUpperA, 1);
      await linkRoutineWorkout(ulId, wLowerA, 2);
      await linkRoutineWorkout(ulId, wUpperB, 3);
      await linkRoutineWorkout(ulId, wLowerB, 4);
    }

    // C. Full Body
    const fbId = routineMap['Full Body (Corpo Todo)'];
    if (fbId) {
      const wFbA = await createWorkoutTemplate('Full Body A', 'Estimulo global A.');
      const wFbB = await createWorkoutTemplate('Full Body B', 'Estimulo global B.');
      const wFbC = await createWorkoutTemplate('Full Body C', 'Estimulo global C.');

      await linkRoutineWorkout(fbId, wFbA, 1);
      await linkRoutineWorkout(fbId, wFbB, 2);
      await linkRoutineWorkout(fbId, wFbC, 3);
    }

    // D. Arnold Split
    const arnoldId = routineMap['Arnold Split'];
    if (arnoldId) {
      const wChestBack = await createWorkoutTemplate('Peito & Costas', 'Super-sets de antagonistas estilo Arnold.');
      const wArmsShoulders = await createWorkoutTemplate('Ombros & Braços', 'Foco isolado em deltoides, bíceps e tríceps.');
      const wLegsAbs = await createWorkoutTemplate('Pernas & Abdômen', 'Treino de membros inferiores e core.');

      await linkRoutineWorkout(arnoldId, wChestBack, 1);
      await linkRoutineWorkout(arnoldId, wArmsShoulders, 2);
      await linkRoutineWorkout(arnoldId, wLegsAbs, 3);
    }

    // E. PPL + Upper / Lower (5 Dias)
    const pplUlId = routineMap['PPL + Upper / Lower (5 Dias)'];
    if (pplUlId) {
      const wPush = await createWorkoutTemplate('Push (Peito/Ombro/Tríceps)', 'Dia 1: Empurrar foco força.');
      const wPull = await createWorkoutTemplate('Pull (Costas/Bíceps)', 'Dia 2: Puxar foco força.');
      const wLegs = await createWorkoutTemplate('Legs (Pernas Completo)', 'Dia 3: Membros inferiores completo.');
      const wUpper5 = await createWorkoutTemplate('Upper General', 'Dia 4: Membros superiores volume/hipertrofia.');
      const wLower5 = await createWorkoutTemplate('Lower General', 'Dia 5: Membros inferiores volume/hipertrofia.');

      await linkRoutineWorkout(pplUlId, wPush, 1);
      await linkRoutineWorkout(pplUlId, wPull, 2);
      await linkRoutineWorkout(pplUlId, wLegs, 3);
      await linkRoutineWorkout(pplUlId, wUpper5, 4);
      await linkRoutineWorkout(pplUlId, wLower5, 5);

      const pplId = routineMap['PPL (Push / Pull / Legs)'];
    if (pplId) {
      await linkRoutineWorkout(pplId, wPush, 1);
      await linkRoutineWorkout(pplId, wPull, 2);
      await linkRoutineWorkout(pplId, wLegs, 3);
    }
    }

    // F. Anterior / Posterior
    const antPostId = routineMap['Anterior / Posterior'];
    if (antPostId) {
      const wAntA = await createWorkoutTemplate('Anterior A (Peito/Quadríceps/Ombro Frontal)', 'Foco na cadeia frontal principal.');
      const wPostA = await createWorkoutTemplate('Posterior A (Costas/Isquiotibiais/Glúteos/Panturrilha)', 'Foco na cadeia posterior principal.');
      const wAntB = await createWorkoutTemplate('Anterior B (Peito/Quadríceps/Tríceps/Abdômen)', 'Segundo estímulo da cadeia frontal.');
      const wPostB = await createWorkoutTemplate('Posterior B (Costas/Isquiotibiais/Bíceps/Ombro Posterior)', 'Segundo estímulo da cadeia posterior.');

      await linkRoutineWorkout(antPostId, wAntA, 1);
      await linkRoutineWorkout(antPostId, wPostA, 2);
      await linkRoutineWorkout(antPostId, wAntB, 3);
      await linkRoutineWorkout(antPostId, wPostB, 4);
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