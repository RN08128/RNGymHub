import { z } from 'zod';

// Schema do PR de cada exercício
export const personalRecordSchema = z.object({
  max_weight: z.number().default(0),
  max_volume_set: z.number().default(0),
});

// Schema da resposta do treino pré-carregado (Opção B)
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