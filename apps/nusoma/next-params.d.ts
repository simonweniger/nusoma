export {}

declare global {
  export type NextParams = Record<string, string | string[] | undefined>
  export type NextSearchParams = {
    [key: string]: string | string[] | undefined
  }
}
