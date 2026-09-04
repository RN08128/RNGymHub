import { z } from 'zod';

// Schema do PR de cada exercício
export const personalRecordSchema = z.object({
  max_weight: z.number().default(0),
  max_volume_set: z.number().default(0),
});

// Schema da resposta do treino pré-carregado
export const getActiveWorkoutResponseSchema = z.object({
  workout_id: z.string(),
  workout_name: z.string(),
  exercises: z.array(
    z.object({
      exercise_id: z.string(),
      name: z.string(),
      target_muscle: z.string(),
      image_url: z.string().nullable(),
      personal_record: personalRecordSchema,
      sets: z.array(
        z.object({
          set_number: z.number(),
          target_reps: z.number().optional(),
        })
      ),
    })
  ),
});

// Schema do payload enviado ao finalizar o treino
export const saveWorkoutLogSchema = z.object({
  workout_id: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  logs: z.array(
    z.object({
      exercise_id: z.string(),
      set_number: z.number(),
      weight: z.number().min(0),
      reps: z.number().min(1),
      is_pr_weight: z.boolean(),
      is_pr_volume: z.boolean(),
    })
  ),
});

export type ActiveWorkoutResponse = z.infer<typeof getActiveWorkoutResponseSchema>;
export type SaveWorkoutLogInput = z.infer<typeof saveWorkoutLogSchema>;

// Schema para criar um novo exercício
export const createExerciseSchema = z.object({
  name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
  target_muscle: z.string().min(2, "Informe o grupo muscular"),
  image_url: z.string().url().nullable().optional(),
});

// Schema para criar uma nova ficha de treino
export const createWorkoutSchema = z.object({
  user_id: z.string().uuid("ID de usuário inválido"),
  name: z.string().min(2, "O nome do treino é obrigatório"),
  description: z.string().optional(),
  exercises: z.array(
    z.object({
      exercise_id: z.string().uuid(),
      target_sets: z.number().min(1).default(3),
      target_reps: z.number().min(1).default(10),
    })
  ).min(1, "Adicione pelo menos um exercício à ficha"),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;