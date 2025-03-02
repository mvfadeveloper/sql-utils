export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export interface InputData {
  [column: string]: string | string[] | number | boolean | null;
}
