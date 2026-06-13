export class ApiRouteError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
