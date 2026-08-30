export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  error?: boolean;
  data?: T;
}

