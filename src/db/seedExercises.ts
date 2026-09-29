import pool from './connection.ts';

export const defaultExercises = [
    // Peito
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

    // Costas
    { name: 'Puxada Frontal com Pegada Pronada', target_muscle: 'Costas' },
    { name: 'Puxada Frontal com Pegada Neutra', target_muscle: 'Costas' },
    { name: 'Puxada Frontal com Triângulo', target_muscle: 'Costas' },
    { name: 'Remada Curvada com Barra', target_muscle: 'Costas' },
    { name: 'Remada Unilateral com Halteres', target_muscle: 'Costas' },
    { name: 'Puxada na Barra Fixa', target_muscle: 'Costas' },
    { name: 'Remada Baixa na Polia', target_muscle: 'Costas' },
    { name: 'Puxada na Polia Alta', target_muscle: 'Costas' },
    { name: 'Puxada na Polia com Triângulo', target_muscle: 'Costas' },

    // Ombro
    { name: 'Desenvolvimento com Halteres', target_muscle: 'Ombros' },
    { name: 'Elevação Lateral com Halteres', target_muscle: 'Ombros' },
    { name: 'Elevação Lateral na Máquina', target_muscle: 'Ombros' },
    { name: 'Elevação Frontal na Máquina', target_muscle: 'Ombros' },
    { name: 'Elevação Frontal na Polia', target_muscle: 'Ombros' },
    { name: 'Desenvolvimento Militar com Barra', target_muscle: 'Ombros' },
    { name: 'Elevação Frontal com Halteres', target_muscle: 'Ombros' },
    { name: 'Desenvolvimento Arnold', target_muscle: 'Ombros' },
    { name: 'Elevação Lateral na Polia', target_muscle: 'Ombros' },

    // Quadríceps
    { name: 'Leg Press Horizontal', target_muscle: 'Quadriceps' },
    { name: 'Cadeira Extensora', target_muscle: 'Quadriceps' },
    { name: 'Agachamento Livre', target_muscle: 'Quadriceps' },
    { name: 'Leg Press 45', target_muscle: 'Quadriceps' },
    { name: 'Agachamento Hack', target_muscle: 'Quadriceps' },
    { name: 'Afundo com Halteres', target_muscle: 'Quadriceps' },

    // Posterior de Coxa
    { name: 'Stiff com Halteres', target_muscle: 'Posterior de Coxa' },
    { name: 'Mesa Flexora', target_muscle: 'Posterior de Coxa' },
    { name: 'Stiff com Barra', target_muscle: 'Posterior de Coxa' },
    { name: 'Leg Curl na Máquina', target_muscle: 'Posterior de Coxa' },

    // Bíceps
    { name: 'Rosca Direta com Barra', target_muscle: 'Bíceps' },
    { name: 'Rosca Martelo com Halteres', target_muscle: 'Bíceps' },
    { name: 'Rosca Concentrada', target_muscle: 'Bíceps' },
    { name: 'Rosca Inversa com Barra', target_muscle: 'Bíceps' },
    { name: 'Rosca Scott com Barra', target_muscle: 'Bíceps' },
    { name: 'Rosca Alternada com Halteres', target_muscle: 'Bíceps' },
    { name: 'Rosca Scott na Máquina', target_muscle: 'Bíceps' },
    { name: 'Rosca Scott com Halteres', target_muscle: 'Bíceps' },
    { name: 'Rosca Inversa na Polia', target_muscle: 'Bíceps' },

    //Tríceps
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

    // Panturrilha
    { name: 'Panturrilha em Pé', target_muscle: 'Panturrilha' },
    { name: 'Panturrilha Sentado', target_muscle: 'Panturrilha' },
    { name: 'Panturrilha em Pé na Máquina', target_muscle: 'Panturrilha' },
    { name: 'Panturrilha Sentado na Máquina', target_muscle: 'Panturrilha' },
    { name: 'Panturrilha no Leg Press', target_muscle: 'Panturrilha' },

    // Abdômen
    { name: 'Abdominal Infra', target_muscle: 'Abdômen' },
    { name: 'Abdominal Supra', target_muscle: 'Abdômen' },
    { name: 'Prancha', target_muscle: 'Abdômen' },
    { name: 'Abdominal Oblíquo', target_muscle: 'Abdômen' },
    { name: 'Abdominal com Peso', target_muscle: 'Abdômen' },
];

export async function seedDefaultExercises() {
    const client = await pool.connect();

    try {
        const exerciseMap: Record<string, string> = {};

        for (const ex of defaultExercises) {
            const checkEx = await client.query(
                `SELECT id FROM exercises WHERE name = $1 AND user_id IS NULL LIMIT 1`,
                [ex.name]
            );

            if (checkEx.rows.length > 0) {
                exerciseMap[ex.name] = checkEx.rows[0].id;
            } else {
                const res = await client.query(
                    `INSERT INTO exercises (name, target_muscle, user_id)
           VALUES ($1, $2, NULL)
           RETURNING id`,
                    [ex.name, ex.target_muscle]
                );
                exerciseMap[ex.name] = res.rows[0].id;
            }
        }

        return exerciseMap;
    } finally {
        client.release();
    }
}