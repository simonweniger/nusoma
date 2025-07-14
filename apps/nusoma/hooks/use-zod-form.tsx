import { zodResolver } from '@hookform/resolvers/zod'
import { type UseFormProps, type UseFormReturn, useForm } from 'react-hook-form'
import type { z } from 'zod'

export function useZodForm<TSchema extends z.ZodType>(
  props: Omit<UseFormProps<TSchema['_input']>, 'resolver'> & {
    schema: TSchema
  }
): UseFormReturn<TSchema['_input'], unknown, TSchema['_input']> {
  return useForm<TSchema['_input']>({
    ...props,
    resolver: zodResolver(props.schema as any),
  })
}
